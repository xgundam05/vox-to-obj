// STL Module
// ===========
var fs = require('fs');

var voxNormals = [
  [ 1,  0,  0],
  [-1,  0,  0],
  [ 0,  1,  0],
  [ 0, -1,  0],
  [ 0,  0,  1],
  [ 0,  0, -1]
];

function stl(options){
  this.facets = [];
  this.header = 'Created with vox-converter. J: The sun rises in the west on the luminous scale';
  this.numFacets = 0;

  for (var prop in options){
    if (this.hasOwnProperty(prop))
      this[prop] = options[prop];
  }
}

stl.prototype = {
  scale: function(s){
    for (var i = 0; i < this.facets.length; i++){
      for (var j = 0; j < 3; j++){
        this.facets[i].v1[j] *= s;
        this.facets[i].v2[j] *= s;
        this.facets[i].v3[j] *= s;
      }
    }
  }
};

function createFromVox(model, scale){
  if (model === undefined)
    return new stl();

  if (scale === undefined)
    scale = 1;

  var mdl = new stl();

  for (var z = 0; z < model.depth; z++){
    for (var y = 0; y < model.height; y++){
      for (var x = 0; x < model.width; x++){
        var index = x + (y * model.width) + (z * model.width * model.height);

        if (model.data[index] !== 0x00){
          // Handle the X axis faces
          // - Left -
          if (x === 0 ||
              model.data[(x - 1) + (y * model.width) + (z * model.width * model.height)] === 0x00){
            mdl.facets.push({
              normal: voxNormals[1],
              v1: [x * scale, y * scale, z * scale],
              v2: [x * scale, y * scale, (z + 1) * scale],
              v3: [x * scale, (y + 1) * scale, (z + 1) * scale]
            });
            mdl.facets.push({
              normal: voxNormals[1],
              v1: [x * scale, y * scale, z * scale],
              v2: [x * scale, (y + 1) * scale, (z + 1) * scale],
              v3: [x * scale, (y + 1) * scale, z * scale]
            })

            mdl.numFacets += 2;
          }

          // - Right -
          if (x === model.width - 1 ||
              model.data[(x + 1) + (y * model.width) + (z * model.width * model.height)] === 0x00){
            mdl.facets.push({
              normal: voxNormals[0],
              v1: [(x + 1) * scale, (y + 1) * scale, z * scale],
              v2: [(x + 1) * scale, (y + 1) * scale, (z + 1) * scale],
              v3: [(x + 1) * scale, y * scale, (z + 1) * scale]
            });
            mdl.facets.push({
              normal: voxNormals[0],
              v1: [(x + 1) * scale, (y + 1) * scale, z * scale],
              v2: [(x + 1) * scale, y * scale, (z + 1) * scale],
              v3: [(x + 1) * scale, y * scale, z * scale]
            })

            mdl.numFacets += 2;
          }

          // Handle the Y Axis faces
          // - Front -
          if (y === 0 ||
              model.data[x + ((y - 1) * model.width) + (z * model.width * model.height)] === 0x00){
            mdl.facets.push({
              normal: voxNormals[3],
              v1: [(x + 1) * scale, y * scale, z * scale],
              v2: [(x + 1) * scale, y * scale, (z + 1) * scale],
              v3: [x * scale, y * scale, (z + 1) * scale]
            });
            mdl.facets.push({
              normal: voxNormals[3],
              v1: [(x + 1) * scale, y * scale, z * scale],
              v2: [x * scale, y * scale, (z + 1) * scale],
              v3: [x * scale, y * scale, z * scale]
            });

            mdl.numFacets += 2;
          }

          // - Back -
          if (y === model.height - 1 ||
              model.data[x + ((y + 1) * model.width) + (z * model.width * model.height)] === 0x00){
            mdl.facets.push({
              normal: voxNormals[2],
              v1: [x * scale, (y + 1) * scale, z * scale],
              v2: [x * scale, (y + 1) * scale, (z + 1) * scale],
              v3: [(x + 1) * scale, (y + 1) * scale, (z + 1) * scale]
            });
            mdl.facets.push({
              normal: voxNormals[2],
              v1: [x * scale, (y + 1) * scale, z * scale],
              v2: [(x + 1) * scale, (y + 1) * scale, (z + 1) * scale],
              v3: [(x + 1) * scale, (y + 1) * scale, z * scale]
            });

            mdl.numFacets += 2;
          }

          // Handle Z axis faces
          // - Bottom -
          if (z === 0 ||
              model.data[x + (y * model.width) + ((z - 1) * model.width * model.height)] === 0x00){
            mdl.facets.push({
              normal: voxNormals[5],
              v1: [(x + 1) * scale, (y + 1) * scale, z * scale],
              v2: [(x + 1) * scale, y * scale, z * scale],
              v3: [x * scale, y * scale, z * scale]
            });
            mdl.facets.push({
              normal: voxNormals[5],
              v1: [(x + 1) * scale, (y + 1) * scale, z * scale],
              v2: [x * scale, y * scale, z * scale],
              v3: [x * scale, (y + 1) * scale, z * scale]
            });

            mdl.numFacets += 2;
          }

          // - Top -
          if (z === model.depth - 1 ||
              model.data[x + (y * model.width) + ((z + 1) * model.width * model.height)] === 0x00){
            mdl.facets.push({
              normal: voxNormals[4],
              v1: [(x + 1) * scale, y * scale, (z + 1) * scale],
              v2: [(x + 1) * scale, (y + 1) * scale, (z + 1) * scale],
              v3: [x * scale, (y + 1) * scale, (z + 1) * scale]
            });
            mdl.facets.push({
              normal: voxNormals[4],
              v1: [(x + 1) * scale, y * scale, (z + 1) * scale],
              v2: [x * scale, (y + 1) * scale, (z + 1) * scale],
              v3: [x * scale, y * scale, (z + 1) * scale]
            });

            mdl.numFacets += 2;
          }
        }
      }
    }
  }

  return mdl;
}

function writeToFile(mdl, fname){
  var file = fs.openSync(fname, 'w');

  // Write the Header
  var header = mdl.header;
  if (header.length < 80){
    for (var i = header.length; i < 80; i++){
      header += ' ';
    }
  }
  else if (header.length > 80)
    header = header.substring(0, 80);

  fs.writeSync(file, header, 0, 'ascii');

  // Write the number of facets
  mdl.numFacets = mdl.facets.length;
  var nFacets = new Buffer(4);
  nFacets.writeUInt32LE(mdl.facets.length, 0);

  fs.writeSync(file, nFacets, 0, 4);

  // Write the facets
  var facetBuffer = new Buffer(50);
  for (var i = 0; i < mdl.facets.length; i++){
    facetBuffer.fill(0x00);

    var facet = mdl.facets[i];
    // Normal
    facetBuffer.writeFloatLE(facet.normal[0], 0);
    facetBuffer.writeFloatLE(facet.normal[1], 4);
    facetBuffer.writeFloatLE(facet.normal[2], 8);

    // Vertices
    facetBuffer.writeFloatLE(facet.v1[0], 12);
    facetBuffer.writeFloatLE(facet.v1[1], 16);
    facetBuffer.writeFloatLE(facet.v1[2], 20);

    facetBuffer.writeFloatLE(facet.v2[0], 24);
    facetBuffer.writeFloatLE(facet.v2[1], 28);
    facetBuffer.writeFloatLE(facet.v2[2], 32);

    facetBuffer.writeFloatLE(facet.v3[0], 36);
    facetBuffer.writeFloatLE(facet.v3[1], 40);
    facetBuffer.writeFloatLE(facet.v3[2], 44);

    // Attribute Count
    facetBuffer.writeUInt16LE(0x0000, 48);

    fs.writeSync(file, facetBuffer, 0, 50);
  }

  fs.closeSync(file);
}

function writeASCII(mdl, fname){
  file = fs.openSync(fname, 'w');
  fs.writeSync(file, 'solid voxel\n', 'nope', 'ascii');

  for (var i = 0; i < mdl.facets.length; i++){
    var facet = mdl.facets[i];

    fs.writeSync(file, 'facet normal ', 'n', 'ascii');
    writeVertexAscii(file, facet.normal);

    fs.writeSync(file, 'outer loop\n', 'n', 'ascii');
    fs.writeSync(file, 'vertex ', 'n', 'ascii');
    writeVertexAscii(file, facet.v1);
    fs.writeSync(file, 'vertex ', 'n', 'ascii');
    writeVertexAscii(file, facet.v2);
    fs.writeSync(file, 'vertex ', 'n', 'ascii');
    writeVertexAscii(file, facet.v3);
    fs.writeSync(file, 'endloop\n', 'n', 'ascii');

    fs.writeSync(file, 'endfacet\n', 'n', 'ascii');
  }

  fs.closeSync(file);
}

function writeVertexAscii(file, vert){
  fs.writeSync(
    file,
    vert[0] + ' ' + vert[1] + ' ' + vert[2] + '\n',
    'nope',
    'ascii'
  );
}

function calcSolidWeight(volume, material){
  if (material === undefined) return 0;

  var weight = 0;
  switch(material){
    case 'PLA':
      weight = (volume / 1000) * 1.25;
      break;
    case 'ABS':
      weight = (volume / 1000) * 1.04;
      break;
    default:
      break;
  }

  return weight;
}

exports.createFromVox = createFromVox;
exports.writeToFile = writeToFile;
exports.calcSolidWeight = calcSolidWeight;
exports.writeASCII = writeASCII;
// exports.createFromGeometry(geo)
