// App Stuff
var gui = require('nw.gui');
var fs = require('fs');
var magicaVoxel = require('./scripts/voxel/magicaVoxel.js');
var converter = require('./scripts/voxel/objConverter.js');
var stl = require('./scripts/stl.js');
var win = gui.Window.get();

// Page Stuffs
// ================================
var isDOMLoaded = false;
var renderer = undefined;
var scene = undefined;
var camera = undefined;
var controls = undefined;
var worker = undefined;
var voxelModel = undefined;
var objModel = undefined;
var voxelMesh = undefined;

// Other things in my actual coding style
var depthMaterial, effectComposer, depthRenderTarget;
var backPlane;
var ssaoPass, msaaRenderPass, copyPass;
var depthScale = 1.0;
var postprocessing = { enabled: true, renderMode: 0 };

window.onload = function()
{
  isDOMLoaded = true;
  Initialize();
};

function Initialize()
{
  document.getElementById('voxFile').addEventListener('change', handleFileOpen, false);
  document.getElementById('stlFile').addEventListener('change', handleFileSave, false);

  document.getElementById('generate').addEventListener('click', convertToObj);
  document.getElementById('export').addEventListener('click', function(e)
  {
    document.getElementById('stlFile').click();
  });

  document.getElementById('palFile').addEventListener('change', loadPalette, false);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera( 75, (window.innerWidth + 308) / window.innerHeight, 0.1, 512 );
  camera.position.set(16, 32, 64);
  camera.lookAt(new THREE.Vector3(0,0,0));

  renderer = new THREE.WebGLRenderer();
  renderer.setClearColor(0x393939);
  renderer.setPixelRatio( window.devicePixelRatio )
  renderer.setSize( window.innerWidth + 308, window.innerHeight );
  document.getElementById('container').appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableZoom = true;
  controls.maxDistance = 300;
  controls.addEventListener('change', render);

  createPalette(document.getElementById('palette1'));

  initPostProcessing();

  var backGeo = new THREE.PlaneGeometry(10000, 10000);
  var backMat = new THREE.MeshBasicMaterial({color:0x393939, side: THREE.DoubleSide});
  backPlane = new THREE.Mesh(backGeo, backMat);

  scene.add(backPlane);

  render();

  window.addEventListener('resize', windowResize, false);
}

function loadPalette(e)
{
  var gen = document.getElementById('generate');
  var exp = document.getElementById('export');

  var gen_enabled = !gen.disabled;
  var exp_enabled = !exp.disabled;

  gen.disabled = true;
  exp.disabled = true;

  var reader = new FileReader();
  reader.onload = function(e)
  {
    var url = e.target.result;

    var new_pal = new Image();
    new_pal.onload = function()
    {
      createPalette(this);
      gen.disabled = !gen_enabled;
      exp.disabled = !exp_enabled;
    };
    new_pal.src = url;
  };

  reader.readAsDataURL(this.files[0]);
}

function createPalette(img)
{
  var canvas = document.getElementById('palette');
  var ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  for (var y = 0; y < 16; y++)
  {
    for (var x = 0; x < 16; x++)
    {
      var id = x + (y * 16);
      ctx.drawImage(img, id, 0, 1, 1, x*4, y*4, 4, 4);
    }
  }
}

function initPostProcessing()
{
  var renderPass = new THREE.RenderPass(scene, camera);

  depthMaterial = new THREE.MeshDepthMaterial();
  depthMaterial.depthPacking = THREE.RGBADepthPacking;
  depthMaterial.blending = THREE.NoBlending;

  var pars = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
  depthRenderTarget = new THREE.WebGLRenderTarget(window.innerWidth + 308, window.innerHeight, pars);

  ssaoPass = new THREE.ShaderPass(THREE.SSAOShader);
  ssaoPass.renderToScreen = true;
  ssaoPass.uniforms['tDepth'].value = depthRenderTarget.texture;
  ssaoPass.uniforms['size'].value.set(window.innerWidth + 308, window.innerHeight);
  ssaoPass.uniforms['cameraNear'].value = camera.near;
  ssaoPass.uniforms['cameraFar'].value = camera.far;
  ssaoPass.uniforms['onlyAO'].value = (postprocessing.renderMode == 1);
  ssaoPass.uniforms['aoClamp'].value = 0.9;
  ssaoPass.uniforms['lumInfluence'].value = 1;

  msaaRenderPass = new THREE.ManualMSAARenderPass(scene, camera);
  msaaRenderPass.unbiased = false;

  copyPass = new THREE.ShaderPass(THREE.CopyShader);
  copyPass.renderToScreen = true;

  effectComposer = new THREE.EffectComposer(renderer);
  effectComposer.addPass(renderPass);
  effectComposer.addPass(msaaRenderPass);
  effectComposer.addPass(ssaoPass);
}

function windowResize()
{
  var w = window.innerWidth + 308;
  var h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);

  ssaoPass.uniforms['size'].value.set(w, h);

  var pixelRatio = renderer.getPixelRatio();
  var nw = Math.floor(w / pixelRatio) || 1;
  var nh = Math.floor(h / pixelRatio) || 1;

  depthRenderTarget.setSize(w, h);
  effectComposer.setSize(w, h);

  render();
}

var planePosition = undefined;

function render()
{
  if (planePosition == undefined) planePosition = new THREE.Vector3(0,0,0);
  camera.getWorldDirection(planePosition);
  planePosition.multiplyScalar(510);
  planePosition.add(camera.position);

  backPlane.position.set(planePosition.x, planePosition.y, planePosition.z);
  backPlane.lookAt(camera.position);

  scene.overrideMaterial = depthMaterial;
  renderer.render(scene, camera, depthRenderTarget, true);

  scene.overrideMaterial = null;
  msaaRenderPass.sampleLevel = 2;
  effectComposer.render();
}

function handleFileOpen(e)
{
  document.getElementById('generate').disabled = true;
  var filePath = this.value;
  var mdl = magicaVoxel.load(filePath);
  voxelModel = mdl;
  document.getElementById('generate').disabled = false;
  document.getElementById('export').disabled = true;

  if (voxelMesh != undefined)
  {
    scene.remove(voxelMesh);
    voxelMesh = undefined;
  }
}

function convertToObj(e)
{
  var _texelSize = document.getElementById('texelSize').value;
  var _padding = document.getElementById('padding').value;
  var _center = document.getElementById('center').checked;

  var _export = document.getElementById('export');

  objModel = new converter.optimizedModel(
    {
      texelSize: _texelSize * 1,
      padding: _padding * 1
    }
  );
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  var img = document.getElementById('palette');
  objModel.convertVoxels(voxelModel, canvas, ctx, img, _center, function()
  {
    _export.disabled = false;
    createGeometry(objModel);
    if (_center)
    {
      camera.position.set(voxelModel.width, voxelModel.height, voxelModel.depth);
      camera.lookAt(new THREE.Vector3(0, voxelModel.height / 2, 0));
      controls.target = new THREE.Vector3(0, voxelModel.height / 2, 0);
    }
    else
    {
      camera.position.set(voxelModel.width * 2, voxelModel.height, voxelModel.depth * 2);
      camera.lookAt(new THREE.Vector3(voxelModel.width / 2, voxelModel.height / 2, voxelModel.depth / 2));
      controls.target = new THREE.Vector3(voxelModel.width / 2, voxelModel.height / 2, voxelModel.depth / 2);
    }
    render();
  });
}

function createGeometry(_model)
{
  var geo = new THREE.Geometry();
  var texture = new THREE.Texture(_model.texture);
  texture.repeat.set(1, 1);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  window._tex = texture;

  for (var i = 0; i < _model.faces.length; i++)
  {
    var quad = _model.faces[i];
    geo.vertices.push(new THREE.Vector3(quad.v1.x, quad.v1.y, quad.v1.z));
    geo.vertices.push(new THREE.Vector3(quad.v2.x, quad.v2.y, quad.v2.z));
    geo.vertices.push(new THREE.Vector3(quad.v3.x, quad.v3.y, quad.v3.z));
    geo.vertices.push(new THREE.Vector3(quad.v4.x, quad.v4.y, quad.v4.z));

    var index = geo.vertices.length - 4;

    if (quad.normalIndex == converter.NORMAL_INDEX.XPos ||
        quad.normalIndex == converter.NORMAL_INDEX.YPos ||
        quad.normalIndex == converter.NORMAL_INDEX.ZPos)
    {
      geo.faces.push(new THREE.Face3(index + 2, index + 1, index));
      geo.faces.push(new THREE.Face3(index + 3, index + 2, index));

      var uv1 = [
        new THREE.Vector2(quad.v3.uv.x, quad.v3.uv.y),
        new THREE.Vector2(quad.v2.uv.x, quad.v2.uv.y),
        new THREE.Vector2(quad.v1.uv.x, quad.v1.uv.y)
      ];

      var uv2 = [
        new THREE.Vector2(quad.v4.uv.x, quad.v4.uv.y),
        new THREE.Vector2(quad.v3.uv.x, quad.v3.uv.y),
        new THREE.Vector2(quad.v1.uv.x, quad.v1.uv.y)
      ];

      geo.faceVertexUvs[0].push(uv1);
      geo.faceVertexUvs[0].push(uv2);
      uv1 = undefined;
      uv2 = undefined;
    }
    else
    {
      geo.faces.push(new THREE.Face3(index, index + 1, index + 2));
      geo.faces.push(new THREE.Face3(index, index + 2, index + 3));

      geo.faceVertexUvs[0].push([
        new THREE.Vector2(quad.v1.uv.x, quad.v1.uv.y),
        new THREE.Vector2(quad.v2.uv.x, quad.v2.uv.y),
        new THREE.Vector2(quad.v3.uv.x, quad.v3.uv.y)
      ]);
      geo.faceVertexUvs[0].push([
        new THREE.Vector2(quad.v1.uv.x, quad.v1.uv.y),
        new THREE.Vector2(quad.v3.uv.x, quad.v3.uv.y),
        new THREE.Vector2(quad.v4.uv.x, quad.v4.uv.y)
      ]);
    }
  }
  geo.verticesNeedUpdate = true;
  geo.uvsNeedUpdate = true;
  geo.computeBoundingBox();

  var material = new THREE.MeshBasicMaterial({map: texture});
  window._mat = material;
  var mesh = new THREE.Mesh(geo, material);
  voxelMesh = mesh;
  scene.add(mesh);
}

function handleFileSave(e)
{
  var filePath = this.value;
  var texPath = filePath.replace('.obj', '.OBJ').replace('.OBJ', '.png');

  var canvas = objModel.texture;

  objModel.saveOBJ(filePath);
  canvas.toBlob(function(blob)
  {
    var arrBuffer;
    var fileReader = new FileReader();
    fileReader.onload = function()
    {
      arrBuffer = this.result;
      var nwBuffer = Buffer.from(arrBuffer);
      fs.writeFile(texPath, nwBuffer, function(err)
      {
        if (err) throw err;
      });
    }
    fileReader.readAsArrayBuffer(blob);
  });
}

// Create the Window Menu
// =============================================
var winMenu = new gui.Menu({type: 'menubar'});
