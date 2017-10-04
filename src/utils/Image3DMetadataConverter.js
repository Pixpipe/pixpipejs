import { glMatrix, mat2, mat2d, mat3, mat4, quat, vec2, vec3, vec4 } from 'gl-matrix';

class Image3DMetadataConverter {
  
  static convertOld2New( oldMeta ){
    var newMeta = {};
    
    // we never have RGB from MINC/NIfTI/MGH. Though it could happen...
    newMeta.ncpp = 1;
    newMeta.dimensions = [];
    
    //var spacenameLUT = {x: "i", y: "j", z: "k", t: "t"};
    var voxelSpaceNames = ["k", "j", "i", "t"];
    var spacePosition = {};
    
    for(var i=0; i<oldMeta.order.length; i++){
      var oldDim = oldMeta[ oldMeta.order[i] ];
      var dimension = {};
      dimension.length = oldDim.space_length;
      dimension.nameWorldSpace = oldMeta.order[i][0];
      dimension.nameVoxelSpace = ''; //voxelSpaceNames[i]; //spacenameLUT[ dimension.nameWorldSpace ];
      spacePosition[ dimension.nameWorldSpace ] = i;
      
      dimension.worldUnitSize = Math.abs(oldDim.step);
      dimension.step = oldDim.step;
      dimension.worldStep = oldDim.step;
      dimension.stride = oldDim.offset;
      newMeta.dimensions.push( dimension );
    }
    
    
    newMeta.dimensions.sort( function(a, b){
      return a.stride > b.stride;
    })
    
    
    for(var i=0; i<oldMeta.order.length; i++){
      newMeta.dimensions[i].nameVoxelSpace = voxelSpaceNames[i];
    }
    
    // return the index of a dimension based on the given world axis name
    function getIndexOfWorld( axisName ){
      for(var i=0; i<newMeta.dimensions.length; i++){
        if(newMeta.dimensions[i].nameWorldSpace === axisName){
          return i;
        }
      }
      return -1;
    }
    
    // given a world axis name, return the the name of the world axis that goes as width
    function getWidthAxisFrom( axisName ){
      return axisName === "x" ? "y" : axisName === "y" ? "x" : axisName === "z" ? "x" : null;
    }
    
    
    // given a world axis name, return the the name of the world axis that goes as heigth
    function getHeightAxisFrom( axisName ){
      return axisName === "x" ? "z" : axisName === "y" ? "z" : axisName === "z" ? "y" : null;
    }
    
    
    for(var i=0; i<newMeta.dimensions.length; i++){
      var axisName = newMeta.dimensions[i].nameWorldSpace;
      newMeta.dimensions[i].widthDimension = getIndexOfWorld( getWidthAxisFrom( axisName ) );
      newMeta.dimensions[i].heightDimension = getIndexOfWorld( getHeightAxisFrom( axisName ) );
    }
    
    console.log( newMeta.dimensions );
    
    /*
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
    
    var dim0Sides = getWidthHeighDimIndex( newMeta.dimensions[0] );
    newMeta.dimensions[0].widthDimension = dim0Sides.w;
    newMeta.dimensions[0].heightDimension = dim0Sides.h;
    
    var dim1Sides = getWidthHeighDimIndex( newMeta.dimensions[1] );
    newMeta.dimensions[1].widthDimension = dim1Sides.w;
    newMeta.dimensions[1].heightDimension = dim1Sides.h;
    
    var dim2Sides = getWidthHeighDimIndex( newMeta.dimensions[2] );
    newMeta.dimensions[2].widthDimension = dim2Sides.w;
    newMeta.dimensions[2].heightDimension = dim2Sides.h;
    */
    
    newMeta.statistics = {
      upToDate: false,
      min: 0,
      max: 0
    }
    
    newMeta.description = "";
    newMeta.spatialUnit = "";
    newMeta.temporalUnit = "";
    newMeta.format = ("format" in oldMeta) ? oldMeta.format : "generic";

    /*
    var v2wMat = mat4.fromValues(transfoMatrixToUse[0][0], transfoMatrixToUse[1][0], transfoMatrixToUse[2][0], transfoMatrixToUse[3][0],
                                 transfoMatrixToUse[0][1], transfoMatrixToUse[1][1], transfoMatrixToUse[2][1], transfoMatrixToUse[3][1],
                                 transfoMatrixToUse[0][2], transfoMatrixToUse[1][2], transfoMatrixToUse[2][2], transfoMatrixToUse[3][2],
                                 transfoMatrixToUse[0][3], transfoMatrixToUse[1][3], transfoMatrixToUse[2][3], transfoMatrixToUse[3][3] );
    */
    
    var w2vMat = mat4.fromValues(oldMeta.w2v[0][0], oldMeta.w2v[1][0], oldMeta.w2v[2][0], 0,
                                 oldMeta.w2v[0][1], oldMeta.w2v[1][1], oldMeta.w2v[2][1], 0,
                                 oldMeta.w2v[0][2], oldMeta.w2v[1][2], oldMeta.w2v[2][2], 0,
                                 oldMeta.w2v[0][3], oldMeta.w2v[1][3], oldMeta.w2v[2][3], 1 );


    var v2wMat = mat4.create();
    mat4.invert( v2wMat, w2vMat );
    
    newMeta.transformations = {
      "v2w": v2wMat,
      "w2v": w2vMat
    };
    
    return newMeta;
  }
  
  
  
  /**
  * Converts the original Image3D metadata into the new
  * 
  */
  static convertImage3DMetadata( oldMeta ){
    Image3DMetadataConverter.completeHeader( oldMeta );
    var newMetaObj = Image3DMetadataConverter.convertOld2New( oldMeta );
    
    console.log( oldMeta );
    return newMetaObj;
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
    
    /*
    x: x * cx[0] * stepx + y * cy[0] * stepy + z * cz[0] * stepz + o.x,
    y: x * cx[1] * stepx + y * cy[1] * stepy + z * cz[1] * stepz + o.y,
    z: x * cx[2] * stepx + y * cy[2] * stepy + z * cz[2] * stepz + o.z
    */
    
    var v2w =  [
      cx[0] * stepx,
      cx[1] * stepx,
      cx[2] * stepx,
      0,
      cy[0] * stepy,
      cy[1] * stepy,
      cy[2] * stepy,
      0,
      cz[0] * stepz,
      cz[1] * stepz,
      cz[2] * stepz,
      0,
      o.x,
      o.y,
      o.z,
      1
    ];
    
    console.log("computed v2w:");
    console.log( v2w );

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
    
    console.log( oldMetaObj );
  }
  
}

export { Image3DMetadataConverter }
