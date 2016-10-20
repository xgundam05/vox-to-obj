// Geometry Generator
// - Runs in WebWorker context

// data.mdl = {
//   id: int,
//   width: int,
//   height: int,
//   depth: int,
//   buffer: ArrayBuffer
// }

// Actual Jobby thingy
var jobs = [];
var isRunning = false;
var startedOn = undefined;

self.addEventListener('message', receiveMessage);

function receiveMessage(e){
  var data = e.data;
  if (!data.hasOwnProperty('cmd'))
    return;

  switch(data.cmd){
    case 'create':
      wakeUp();
      var mdl = data.mdl;
      mdl.data = new Uint8Array(data.buffer);

      var xDiv = Math.ceil(mdl.width / 16);
      var yDiv = Math.ceil(mdl.height / 16);
      var zDiv = Math.ceil(mdl.depth / 16);

      for (var z = 0; z < zDiv; z++){
        for (var y = 0; y < yDiv; y++){
          for (var x = 0; x < xDiv; x++){
            var item = {
              x: x * 16,
              y: y * 16,
              z: z * 16,
              model: mdl
            };
            jobs.push(item);
          }
        }
      }
      break;
    case 'update':
      // Handle basic modifications to the model
      break;
    case 'status':
      self.postMessage({
        cmd: 'status',
        lastId: models.length,
        running: isRunning,
        jobs: jobs.length
      });
    default:
      break;
  }
}

function wakeUp(){
  if (!isRunning){
    startedOn = Date.now();
    isRunning = true;
    monitorJobs();
  }
}

function monitorJobs(){
  if (jobs.length > 0){
    var job = jobs.shift();
    createGeometry(job);
    // TODO: provide progress information to the main thread
  }
  else{
    if (Date.now() - startedOn > (1000 * 60)){
      isRunning = false;
      return;
    }
  }

  if (isRunning)
    setTimeout(monitorJobs, 1);
}

// Create the Geometry and such
function createGeometry(job){
  var model = job.model;

  var geometry = new Geometry();
  for (var z = job.z; z < job.z + 16 && z < model.depth; z++){
    for (var y = job.y; y < job.y + 16 && y < model.height; y++){
      for (var x = job.x; x < job.x + 16 && x < model.width; x++){
        if (model.data[x + (y * model.width) + (z * model.width * model.height)] != 0x00){
          var block = getSurroundingBlock(x, y, z, model);

          // BACK faces
          if (z == 0 ||
              model.data[x + (y * model.width) + ((z - 1) * model.width * model.height)] == 0x00){
            var ao = getAO(x, y, z, 'BACK', block);

            var index = geometry.vertices.length - 1;
            geometry.vertices.push(new Vector3(x, y+1, z));
            geometry.vertices.push(new Vector3(x+1, y+1, z));
            geometry.vertices.push(new Vector3(x+1, y, z));
            geometry.vertices.push(new Vector3(x, y, z));

            if (flipQuads(ao)){
              geometry.faces.push(new Face3(index + 4, index + 1, index + 2));
              geometry.faces.push(new Face3(index + 2, index + 3, index + 4));
              geometry.colors.push(ao[3]); geometry.colors.push(ao[1]); geometry.colors.push(ao[0]);
              geometry.colors.push(ao[0]); geometry.colors.push(ao[2]); geometry.colors.push(ao[3]);
            }
            else {
              geometry.faces.push(new Face3(index + 1, index + 2, index + 3));
              geometry.faces.push(new Face3(index + 3, index + 4, index + 1));
              geometry.colors.push(ao[1]); geometry.colors.push(ao[0]); geometry.colors.push(ao[2]);
              geometry.colors.push(ao[2]); geometry.colors.push(ao[3]); geometry.colors.push(ao[1]);
            }
          }

          // FRONT faces
          if (z == model.depth - 1 ||
              model.data[x + (y * model.width) + ((z + 1) * model.width * model.height)] == 0x00){
            var ao = getAO(x, y, z, 'FRONT', block);

            var index = geometry.vertices.length - 1;
            geometry.vertices.push(new Vector3(x+1, y+1, z+1));
            geometry.vertices.push(new Vector3(x, y+1, z+1));
            geometry.vertices.push(new Vector3(x, y, z+1));
            geometry.vertices.push(new Vector3(x+1, y, z+1));

            if (flipQuads(ao)){
              geometry.faces.push(new Face3(index + 4, index + 1, index + 2));
              geometry.faces.push(new Face3(index + 2, index + 3, index + 4));
              geometry.colors.push(ao[3]); geometry.colors.push(ao[1]); geometry.colors.push(ao[0]);
              geometry.colors.push(ao[0]); geometry.colors.push(ao[2]); geometry.colors.push(ao[3]);
            }
            else {
              geometry.faces.push(new Face3(index + 1, index + 2, index + 3));
              geometry.faces.push(new Face3(index + 3, index + 4, index + 1));
              geometry.colors.push(ao[1]); geometry.colors.push(ao[0]); geometry.colors.push(ao[2]);
              geometry.colors.push(ao[2]); geometry.colors.push(ao[3]); geometry.colors.push(ao[1]);
            }
          }

          // BOTTOM faces
          if (y == 0 ||
              model.data[x + ((y - 1) * model.width) + (z * model.width * model.height)] == 0x00){
            var ao = getAO(x, y, z, 'BOTTOM', block);

            var index = geometry.vertices.length - 1;
            geometry.vertices.push(new Vector3(x+1, y, z+1));
            geometry.vertices.push(new Vector3(x, y, z+1));
            geometry.vertices.push(new Vector3(x, y, z));
            geometry.vertices.push(new Vector3(x+1, y, z));

            if (flipQuads(ao)){
              geometry.faces.push(new Face3(index + 4, index + 1, index + 2));
              geometry.faces.push(new Face3(index + 2, index + 3, index + 4));
              geometry.colors.push(ao[3]); geometry.colors.push(ao[1]); geometry.colors.push(ao[0]);
              geometry.colors.push(ao[0]); geometry.colors.push(ao[2]); geometry.colors.push(ao[3]);
            }
            else {
              geometry.faces.push(new Face3(index + 1, index + 2, index + 3));
              geometry.faces.push(new Face3(index + 3, index + 4, index + 1));
              geometry.colors.push(ao[1]); geometry.colors.push(ao[0]); geometry.colors.push(ao[2]);
              geometry.colors.push(ao[2]); geometry.colors.push(ao[3]); geometry.colors.push(ao[1]);
            }
          }

          // TOP faces
          if (y == model.height - 1 ||
              model.data[x + ((y + 1) * model.width) + (z * model.width * model.height)] == 0x00){
            var ao = getAO(x, y, z, 'TOP', block);

            var index = geometry.vertices.length - 1;
            geometry.vertices.push(new Vector3(x+1, y+1, z));
            geometry.vertices.push(new Vector3(x, y+1, z))
            geometry.vertices.push(new Vector3(x, y+1, z+1));
            geometry.vertices.push(new Vector3(x+1, y+1, z+1));

            if (flipQuads(ao)){
              geometry.faces.push(new Face3(index + 4, index + 1, index + 2));
              geometry.faces.push(new Face3(index + 2, index + 3, index + 4));
              geometry.colors.push(ao[3]); geometry.colors.push(ao[1]); geometry.colors.push(ao[0]);
              geometry.colors.push(ao[0]); geometry.colors.push(ao[2]); geometry.colors.push(ao[3]);
            }
            else {
              geometry.faces.push(new Face3(index + 1, index + 2, index + 3));
              geometry.faces.push(new Face3(index + 3, index + 4, index + 1));
              geometry.colors.push(ao[1]); geometry.colors.push(ao[0]); geometry.colors.push(ao[2]);
              geometry.colors.push(ao[2]); geometry.colors.push(ao[3]); geometry.colors.push(ao[1]);
            }
          }

          // LEFT faces
          if (x == 0 ||
              model.data[(x - 1) + (y * model.width) + (z * model.width * model.height)] == 0x00){
            var ao = getAO(x, y, z, 'LEFT', block);

            var index = geometry.vertices.length - 1;
            geometry.vertices.push(new Vector3(x, y+1, z+1));
            geometry.vertices.push(new Vector3(x, y+1, z));
            geometry.vertices.push(new Vector3(x, y, z));
            geometry.vertices.push(new Vector3(x, y, z+1));

            if (flipQuads(ao)){
              geometry.faces.push(new Face3(index + 4, index + 1, index + 2));
              geometry.faces.push(new Face3(index + 2, index + 3, index + 4));
              geometry.colors.push(ao[3]); geometry.colors.push(ao[1]); geometry.colors.push(ao[0]);
              geometry.colors.push(ao[0]); geometry.colors.push(ao[2]); geometry.colors.push(ao[3]);
            }
            else {
              geometry.faces.push(new Face3(index + 1, index + 2, index + 3));
              geometry.faces.push(new Face3(index + 3, index + 4, index + 1));
              geometry.colors.push(ao[1]); geometry.colors.push(ao[0]); geometry.colors.push(ao[2]);
              geometry.colors.push(ao[2]); geometry.colors.push(ao[3]); geometry.colors.push(ao[1]);
            }
          }

          // RIGHT faces
          if (x == model.width - 1 ||
              model.data[(x + 1) + (y * model.width) + (z * model.width * model.height)] == 0x00){
            var ao = getAO(x, y, z, 'RIGHT', block);

            var index = geometry.vertices.length - 1;
            geometry.vertices.push(new Vector3(x+1, y+1, z));
            geometry.vertices.push(new Vector3(x+1, y+1, z+1));
            geometry.vertices.push(new Vector3(x+1, y, z+1));
            geometry.vertices.push(new Vector3(x+1, y, z));

            if (flipQuads(ao)){
              geometry.faces.push(new Face3(index + 4, index + 1, index + 2));
              geometry.faces.push(new Face3(index + 2, index + 3, index + 4));
              geometry.colors.push(ao[3]); geometry.colors.push(ao[1]); geometry.colors.push(ao[0]);
              geometry.colors.push(ao[0]); geometry.colors.push(ao[2]); geometry.colors.push(ao[3]);
            }
            else {
              geometry.faces.push(new Face3(index + 1, index + 2, index + 3));
              geometry.faces.push(new Face3(index + 3, index + 4, index + 1));
              geometry.colors.push(ao[1]); geometry.colors.push(ao[0]); geometry.colors.push(ao[2]);
              geometry.colors.push(ao[2]); geometry.colors.push(ao[3]); geometry.colors.push(ao[1]);
            }
          }
        }
      }
    }
  }

  // Send the Geometry to the main thread
  if (geometry.vertices.length > 0){
    var vBuffer = geometry.getVertexBuffer();
    var fBuffer = geometry.getFaceBuffer();
    var cBuffer = geometry.getColorBuffer();

    self.postMessage({
      cmd: 'geo',
      vertices: vBuffer,
      faces: fBuffer,
      colors: cBuffer
    }, [vBuffer, fBuffer, cBuffer]);
  }
}

function getSurroundingBlock(_x, _y, _z, mdl){
  var block = [];

  for (var y = _y - 1; y <= _y + 1; y++){
    for (var z = _z - 1; z <= _z + 1; z++){
      for (var x = _x - 1; x <= _x + 1; x++){
        if ((x < 0 || x >= mdl.width) ||
            (y < 0 || y >= mdl.height) ||
            (z < 0 || z >= mdl.depth)){
          block.push(0);
        }
        else if (mdl.data[x + (y * mdl.width) + (z * mdl.width * mdl.height)] > 0){
          block.push(1);
        }
        else{
          block.push(0);
        }
      }
    }
  }

  return block;
}

function flipQuads(ao){
  if (ao[1] + ao[2] == 3 && ao[3] + ao[0] == 4)
    return true;
  else if (ao[1] + ao[2] == 4 && ao[3] + ao[0] == 3)
    return false;

  if (ao[1] + ao[2] > ao[0] + ao[3])
    return true;
  else if (ao[1] + ao[2] == ao[0] + ao[3]){
    var val = ao[1] + ao[2] + ao[3];
    if (val % 3 != 0)
      return true;
  }

  return false;
}

function getAO(x, y, z, dir, block){
  var ao = new Int8Array(4);

  switch(dir){
    case 'TOP':
      ao[0] = (vertAO(block[21], block[19], block[18]));
      ao[1] = (vertAO(block[19], block[23], block[20]));
      ao[2] = (vertAO(block[21], block[25], block[24]));
      ao[3] = (vertAO(block[23], block[25], block[26]));
      break;
    case 'BOTTOM':
      ao[0] = (vertAO(block[3], block[7], block[6]));
      ao[1] = (vertAO(block[5], block[7], block[8]));
      ao[2] = (vertAO(block[1], block[3], block[0]));
      ao[3] = (vertAO(block[1], block[5], block[2]));
      break;
    case 'FRONT':
      ao[0] = (vertAO(block[15], block[25], block[24]));
      ao[1] = (vertAO(block[17], block[25], block[26]));
      ao[2] = (vertAO(block[7], block[15], block[6]));
      ao[3] = (vertAO(block[7], block[17], block[8]));
      break;
    case 'BACK':
      ao[0] = (vertAO(block[11], block[19], block[20]));
      ao[1] = (vertAO(block[9], block[19], block[18]));
      ao[2] = (vertAO(block[1], block[11], block[2]));
      ao[3] = (vertAO(block[1], block[9], block[0]));
      break;
    case 'LEFT':
      ao[0] = (vertAO(block[9], block[21], block[18]));
      ao[1] = (vertAO(block[15], block[21], block[24]));
      ao[2] = (vertAO(block[3], block[9], block[0]));
      ao[3] = (vertAO(block[3], block[15], block[6]));
      break;
    case 'RIGHT':
      ao[0] = (vertAO(block[17], block[23], block[26]));
      ao[1] = (vertAO(block[11], block[23], block[20]));
      ao[2] = (vertAO(block[5], block[17], block[8]));
      ao[3] = (vertAO(block[5], block[11], block[2]));
      break;
    default:
      break;
  }

  return ao;
}

function vertAO(side1, side2, corner){
  if (side1 && side2)
    return 3;
  else
    return side1 + side2 + corner;
}

// Classes
// =========================
function RefValue(value){
    this.val = value;
}

function Vector3(x,y,z){
    this.x = x;
    this.y = y;
    this.z = z;
}

function Face3(a,b,c){
    this.a = a;
    this.b = b;
    this.c = c;
}

function Geometry(){
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.vertices = [];
    this.faces = [];
    this.colors = [];
}

Geometry.prototype = {
  getVertexBuffer: function(){
    var buffer = new ArrayBuffer(this.vertices.length * 3 * 4);
    var view = new Float32Array(buffer);

    for (var i = 0; i < this.vertices.length; i++){
      view[(i * 3) + 0] = this.vertices[i].x;
      view[(i * 3) + 1] = this.vertices[i].y;
      view[(i * 3) + 2] = this.vertices[i].z;
    }

    return buffer;
  },
  getFaceBuffer: function(){
    var buffer = new ArrayBuffer(this.faces.length * 3 * 4);
    var view = new Int32Array(buffer);

    for (var i = 0; i < this.faces.length; i++){
      view[(i * 3) + 0] = this.faces[i].a;
      view[(i * 3) + 1] = this.faces[i].b;
      view[(i * 3) + 2] = this.faces[i].c;
    }

    return buffer;
  },
  getColorBuffer: function(){
    var buffer = new ArrayBuffer(this.colors.length);
    var view = new Uint8Array(buffer);

    for (var i = 0; i < this.colors.length; i++){
      view[i] = this.colors[i];
    }

    return buffer;
  }
};
