import { glMatrix, mat2, mat2d, mat3, mat4, quat, vec2, vec3, vec4 } from 'gl-matrix';

class Image3DMetadataConverter {
  
  static convertOld2New( oldMeta ){
    var newMeta = {};
    
    // we never have RGB from MINC/NIfTI/MGH. Though it could happen...
    newMeta.ncpp = 1;
    newMeta.dimensions = [];
    
    var spacenameLUT = {x: "i", y: "j", z: "k", t: "t"};
    var spacePosition = {};
    
    for(var i=0; i<oldMeta.order.length; i++){
      var oldDim = oldMeta[ oldMeta.order[i] ];
      var dimension = {};
      dimension.length = oldDim.length;
      dimension.nameWorldSpace = oldMeta.order[i][0];
      spacePosition[ dimension.nameWorldSpace ] = i;
      dimension.nameVoxelSpace = spacenameLUT[ dimension.nameWorldSpace ];
      dimension.worldUnitSize = Math.abs(oldDim.step);
      dimension.step = oldDim.step;
      dimension.worldStep = oldDim.step;
      dimension.stride = oldDim.offset;
      newMeta.dimensions.push( dimension );
    }
    
    function getWidthHeighDimIndex(dim){
      switch (dim.nameWorldSpace) {
        case 'x':
          return {
            w: spacePosition.y,
            h: spacePosition.z
          }
          break;
          
        case 'y':
          return {
            w: spacePosition.x,
            h: spacePosition.z
          }
          break;
        
        case 'z':
          return {
            w: spacePosition.x,
            h: spacePosition.y
          }
          break;
        default:
          return null;
      }
    }
    
    var dim0Sides = getWidthHeighDimIndex( dimension[0] );
    dimension[0].widthDimension = dim0Sides.w;
    dimension[0].heightDimension = dim0Sides.h;
    
    var dim1Sides = getWidthHeighDimIndex( dimension[1] );
    dimension[1].widthDimension = dim1Sides.w;
    dimension[1].heightDimension = dim1Sides.h;
    
    var dim2Sides = getWidthHeighDimIndex( dimension[2] );
    dimension[2].widthDimension = dim2Sides.w;
    dimension[2].heightDimension = dim2Sides.h;
    
    
    newMeta.statistics = {
      upToDate: false,
      min: 0,
      max: 0
    }
    
    newMeta.description = "";
    newMeta.spatialUnit = "";
    newMeta.temporalUnit = "";
    newMeta.format = ("format" in oldMetaObj) ? oldMetaObj.format : "generic";
    
    
    newMeta.transformations = {};
    
    var v2wMat = mat4.fromValues(transfoMatrixToUse[0][0], transfoMatrixToUse[1][0], transfoMatrixToUse[2][0], transfoMatrixToUse[3][0],
                                 transfoMatrixToUse[0][1], transfoMatrixToUse[1][1], transfoMatrixToUse[2][1], transfoMatrixToUse[3][1],
                                 transfoMatrixToUse[0][2], transfoMatrixToUse[1][2], transfoMatrixToUse[2][2], transfoMatrixToUse[3][2],
                                 transfoMatrixToUse[0][3], transfoMatrixToUse[1][3], transfoMatrixToUse[2][3], transfoMatrixToUse[3][3] );

    var w2vMat = mat4.create();
    mat4.invert( w2vMat, v2wMat );
  }
  
  
  
  /**
  * Converts the original Image3D metadata into the new
  * 
  */
  static convertImage3DMetadata( oldMetaObj ){
    
    
    
    Image3DMetadataConverter.completeHeader( oldMetaObj );
    console.log( oldMetaObj );
  }
  
  
  static completeHeader( oldMetaObj ) {
    var xspace = oldMetaObj.xspace;
    var yspace = oldMetaObj.yspace;
    var zspace = oldMetaObj.zspace;

    var startx = xspace.start;
    var starty = yspace.start;
    var startz = zspace.start;
    var cx = xspace.direction_cosines;
    var cy = yspace.direction_cosines;
    var cz = zspace.direction_cosines;
    var stepx = xspace.step;
    var stepy = yspace.step;
    var stepz = zspace.step;

    // voxel_origin
    var o = {
      x: startx * cx[0] + starty * cy[0] + startz * cz[0],
      y: startx * cx[1] + starty * cy[1] + startz * cz[1],
      z: startx * cx[2] + starty * cy[2] + startz * cz[2]
    };

    oldMetaObj.voxel_origin = o;

    var tx = (-o.x * cx[0] - o.y * cx[1] - o.z * cx[2]) / stepx;
    var ty = (-o.x * cy[0] - o.y * cy[1] - o.z * cy[2]) / stepy;
    var tz = (-o.x * cz[0] - o.y * cz[1] - o.z * cz[2]) / stepz;

    var w2v = [
      [cx[0] / stepx, cx[1] / stepx, cx[2] / stepx, tx],
      [cy[0] / stepy, cy[1] / stepy, cy[2] / stepy, ty],
      [cz[0] / stepz, cz[1] / stepz, cz[2] / stepz, tz]
    ];

    oldMetaObj.w2v = w2v;

    xspace.width_space  = JSON.parse( JSON.stringify( yspace ) );//yspace;
    xspace.width        = yspace.space_length;
    xspace.height_space = JSON.parse( JSON.stringify( zspace ) );//zspace;
    xspace.height       = zspace.space_length;

    yspace.width_space  = JSON.parse( JSON.stringify( xspace ) );//xspace;
    yspace.width        = xspace.space_length;
    yspace.height_space = JSON.parse( JSON.stringify( zspace ) );//zspace;
    yspace.height       = zspace.space_length;

    zspace.width_space  = JSON.parse( JSON.stringify( xspace ) );//xspace;
    zspace.width        = xspace.space_length;
    zspace.height_space = JSON.parse( JSON.stringify( yspace ) );//yspace;
    zspace.height       = yspace.space_length;
  }
  
}

export { Image3DMetadataConverter }
