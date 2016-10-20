function voxRenderer(options){
  this.domElement = undefined;
  this.material = undefined;
  this.jobs = [];
  this.colors = {
    l: new THREE.Color(0x6aa2bf),
    m: new THREE.Color(0x4581a0),
    d: new THREE.Color(0x2d5368)
  }

  for (var prop in options){
    if (this.hasOwnProperty(prop))
      this[prop] = options[prop];
  }

  this.scene = undefined;
  this.camera = undefined;
  this.controls = undefined;
  this.renderer = undefined;
  this.clock = undefined;
  this.voxModel = undefined;
  this.light = undefined;
}

voxRenderer.prototype = {
  __getFov: function(height){
    return Math.atan(height / (2 * 482.84)) * 360 / Math.PI;
  },
  init: function(){
    var self = this;
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this.voxModel = new THREE.Object3D();

    this.scene.add(this.voxModel);

    if (this.material === undefined){
      this.material = new THREE.MeshLambertMaterial({
        vertexColors: THREE.VertexColors
      });
    }

    var fov, width, height, aspect, near, far;
    width = window.innerWidth;
    height = window.innerHeight;
    fov = this.__getFov();
    aspect = width / height;
    near = 0.1;
    far = 10000;

    // Camera
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.camera.position.set(0, 10, 10);
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));

    // Controls
    this.controls = new THREE.OrbitControls(
      this.camera,
      this.domElement
    );
    this.controls.addEventListener('change', function(){
      self.render();
    });
    this.controls.target.set(0, 0, 0);

    // lights
    var l1 = new THREE.DirectionalLight(0xffffff, 0.7);
    var l2 = new THREE.AmbientLight(0xa0a0a0);

    l1.position.set(3, 4, 5);

    this.scene.add(l1);
    this.scene.add(l2);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.domElement,
      alpha: true
    });
    this.renderer.setSize(width, height);

    window.addEventListener('resize', function(e){
      var h = window.innerHeight;
      var w = window.innerWidth;

      var fov = self.__getFov(h);
      self.camera.aspect = w / h;
      self.camera.fov = fov;
      self.camera.updateProjectionMatrix();

      self.renderer.setSize(w, h);

      self.render();
    });
  },
  update: function(){
    var t = 0;
    this.clock.getDelta();
    while(this.jobs.length > 0 && (t += this.clock.getDelta()) < 0.016){
      var job = this.jobs.shift();

      var geo = new THREE.Geometry();
      var vBuffer = new Float32Array(job.vertices);
      var fBuffer = new Int32Array(job.faces);
      var cBuffer = new Uint8Array(job.colors);

      for (var i = 0; i < vBuffer.length; i += 3){
        geo.vertices.push(
          new THREE.Vector3(
            vBuffer[i],
            vBuffer[i + 1],
            vBuffer[i + 2]
          )
        );
      }

      for (var i = 0; i < fBuffer.length; i += 3){
        geo.faces.push(
          new THREE.Face3(
            fBuffer[i],
            fBuffer[i + 1],
            fBuffer[i + 2]
          )
        );

        var index = geo.faces.length - 1;
        var cval = cBuffer[i];
        var color = cval == 0 ? this.colors.l : (cval == 1 ? this.colors.m : this.colors.d);
        geo.faces[index].vertexColors[0] = color;//new THREE.Color(color);

        cval = cBuffer[i + 1];
        color = cval == 0 ? this.colors.l : (cval == 1 ? this.colors.m : this.colors.d);
        geo.faces[index].vertexColors[1] = color;//new THREE.Color(color);

        cval = cBuffer[i + 2];
        color = cval == 0 ? this.colors.l : (cval == 1 ? this.colors.m : this.colors.d);
        geo.faces[index].vertexColors[2] = color;//new THREE.Color(color);
      }

      geo.computeFaceNormals();
      geo.computeBoundingBox();
      geo.computeBoundingSphere();

      var mesh = new THREE.Mesh(geo, this.material);

      this.voxModel.add(mesh);
      this.render();
    }

    this.controls.update();
    requestAnimationFrame(this.update.bind(this));
  },
  render: function(){
    this.renderer.render(this.scene, this.camera);
  },
  clearModel: function(){
    if (this.voxModel === undefined)
      return;

    while (this.voxModel.children.length > 0){
      this.voxModel.remove(
        this.voxModel.children[this.voxModel.children.length - 1]
      );
    }
  },
  setCamera: function (w, h, d){
    this.camera.position.set(w * 0.5, h * 1.5, d * 2);
    this.controls.target.set(w * 0.5, h * 0.5, d * 0.5);
  }
};
