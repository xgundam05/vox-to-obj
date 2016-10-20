// MagicaVoxel File Loader Module
// ===============================

var fs = require('fs');
var voxmodel = require('./voxModel.js');

// Helper Objects
function MVoxChunk(i, s, cs, c, ch){
  this.id = i;
  this.size = s;
  this.childrenSize = cs;
  this.contents = c;
  this.children = ch;
}

// Load from a file
function load(fname){
  var file = fs.openSync(fname, 'r');

  var buffer = new Buffer(4);

    // Read the Magic Number
  fs.readSync(file, buffer, 0, 4);
  if (buffer.toString('ascii') != 'VOX ')
    return undefined;

  // Read Version number, discard
  fs.readSync(file, buffer, 0, 4);

  // Read MAIN chunk
  main = readChunk(file);

  // Close it up
  fs.closeSync(file);

  return loadFromMain(main);
}

// Load the data from the MAIN chunk
function loadFromMain(chunk){
  var size = undefined;
  var voxels = undefined;
  var palette = undefined;
  var model = undefined;

  // Load the Chunks
  for (var i = 0; i < chunk.children.length; i++){
    if (chunk.children[i].id == 'SIZE')
      size = chunk.children[i];
    else if (chunk.children[i].id == 'XYZI')
      voxels = chunk.children[i];
    else if (chunk.children[i].id == 'RGBI')
      palette = chunk.children[i];
  }

  // MagicaVoxel uses Z for height...we use it for depth
  if (size !== undefined && voxels !== undefined){
    var w = size.contents.readUIntLE(0, 4);
    var h = size.contents.readUIntLE(4, 4);
    var d = size.contents.readUIntLE(8, 4);

    if (w > 0 && h > 0 && d > 0){
      model = voxmodel({width: w, height: d, depth: h, zUp: false});
      var numVoxels = voxels.contents.readUIntLE(0, 4);

      for (var j = 0; j < numVoxels; j++){
        var x = voxels.contents[(j * 4) + 4];
        var y = voxels.contents[(j * 4) + 5];
        var z = voxels.contents[(j * 4) + 6];
        var i = voxels.contents[(j * 4) + 7];

        var index = x + (z * model.width) + ((model.depth - 1 - y) * model.width * model.height);
        if (index < w * h * d){
          model.data[index] = i;
        }
      }
    }
  }

  if (palette !== undefined){
    model.palette[0] = {r: 0, g: 0, b: 0, a: 0};
    for (var i = 0; i < palette.size; i += 4){
      var red = palette.contents[i + 0];
      var green = palette.contents[i + 1];
      var blue = palette.contents[i + 2];
      var alpha = palette.contents[i + 3];

      model.palette.push({
        r: red,
        g: green,
        b: blue,
        a: alpha
      });
    }
  }
  else {
    // Load a default palette of some sort
    model.palette[0] = {r: 0, g: 0, b: 0, a: 0};
    for (var i = 0; i < 255; i++){
      model.palette.push({
        r: i,
        g: i,
        b: i,
        a: 1
      });
    }
  }

  return model;
}

// Read a MagicaVoxel chunk from a file
function readChunk(file){
  var chunk = new MVoxChunk('', 0, 0, undefined, []);

  var buffer = new Buffer(4);

  // Read ID
  if (fs.readSync(file, buffer, 0, 4) > 0)
    chunk.id = buffer.toString('ascii');

  // Read Size
  if (fs.readSync(file, buffer, 0, 4) > 0)
    chunk.size = buffer.readUIntLE(0, 4);

  // Read Size of Children
  if (fs.readSync(file, buffer, 0, 4) > 0)
    chunk.childrenSize = buffer.readUIntLE(0, 4);

  // Read Data
  if (chunk.size > 0){
    chunk.contents = new Buffer(chunk.size);
    fs.readSync(file, chunk.contents, 0, chunk.size);
  }

  // Read Children Data
  var currentSize = 0;
  if (chunk.childrenSize > 0){
    while (currentSize < chunk.childrenSize){
      var childChunk = readChunk(file);
      chunk.children.push(childChunk);
      currentSize += 12 + childChunk.size + childChunk.childrenSize;
    }
  }

  return chunk;
}

// Exported Functions
exports.load = load;
