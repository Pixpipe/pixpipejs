/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


import joi from 'joi-browser';
import { glMatrix, mat2, mat2d, mat3, mat4, quat, vec2, vec3, vec4 } from 'gl-matrix';
import { CoreTypes } from './CoreTypes.js';
import { PixpipeContainer } from './PixpipeContainer.js';
import { Image2D } from './Image2D.js';

/**
* Image3DAlt class is one of the few base element of Pixpipejs.
* It is always considered to be 4 channels (RGBA) and stored as a Float32Array
* typed array.
*/
class Image3DAlt extends PixpipeContainer{
  /**
  * Constructor of an Image3DAlt instance. If no options, no array is allocated.
  * @param {Object} options - may contain the following:
  *   - options.xSize {Number} space length along x axis
  *   - options.ySize {Number} space length along y axis
  *   - options.zSize {Number} space length along z axis
  *   - options.tSize {Number} space length along t axis (time)
  *   - options.ncpp {Number} number of components per pixel. Default = 1
  * If at least xSize, ySize and zSize are specified, a buffer is automatically initialized with the value 0.
  */
  constructor( options=null ){
    super();
    this._type = Image3DAlt.TYPE();

    // default metadata values
    this._initMetadata();
    
    // since dimensions from metadata is an array (where order matters),
    // we also build LUTs where the key is are dimension's names
    this._dimensionsWorldLUT= {}
    this._dimensionsVoxelLUT = {}

    // allocate data if the propers options are given
    this._initData( options );
  }


  /**
  * Hardcode the datatype
  */
  static TYPE(){
    return "IMAGE3DALT";
  }
  
  
  /**
  * [SUPER OVERWRITE - PipxpipeObject]
  * [PRIVATE]
  */
  _buildMetadataSchema(){
    var metadataSchema = joi.object({
      
      // required
      ncpp: joi.number().integer().min(1).required(), 
      
      // required
      dimensions: joi.array().min(3).max(4).items(
        joi.object({
          length: joi.number().integer().min(1).required(),
          widthDimension: joi.number().integer().min(0).max(2).required(),
          heightDimension: joi.number().integer().min(0).max(2).required(),
          nameVoxelSpace: joi.string().regex(/(i|j|k|t)/).required(),
          nameWorldSpace: joi.string().regex(/(x|y|z|t)/).required(),
          worldUnitSize: joi.number().required(),
          stride: joi.number().integer().min(1).required(),
          step: joi.number().required()
        }
      ).unknown()),
      
      // required, some prop can be added to the list
      statistics: joi.object({
        upToDate: joi.boolean().required(),
        min: joi.number().required(),
        max: joi.number().required()
      }).required().unknown(), // = we can have more stats but min/max are necessary
      
      // required but can be an empty object
      transformations: joi.object().unknown().pattern(/.+/, joi.array().length(16).items(joi.number())).required(),
      
      // optional
      description: joi.string().allow(''),
      
      // optional
      spatialUnit: joi.string().allow(''),
      
      // optional
      temporalUnit: joi.string().allow(''),
      
      // optional
      format: joi.string().allow(''),
      
      // optional, some prop can be added to the list
      formatSpecific: joi.object().unknown(),  
    })
    .unknown(); // = we can add other properties
    
    return metadataSchema;
  }
  
  
  /**
  * [SUPER OVERWRITE - PipxpipeObject]
  * [PRIVATE]
  * This method is called at the end of setRawMetadata
  */
  _metadataRawCopied(){
    this._buildDimensionsLUT();
  }
  
  
  /**
  * [PRIVATE]
  * Build the LUT to fetch dimensions easier = using their name as index rather than just a their index
  */
  _buildDimensionsLUT(){
    this._dimensionsWorldLUT= {};
    this._dimensionsVoxelLUT = {};
    var worldAxisNames = ["x", "y", "z"];
    var dimensions = this._metadata.dimensions;
    
    // At what position are "x", "y" and "z" in the array of dimensions?
    // e.g. if we have nameWorldSpace in dimensions that are [y z x], then this array
    // would be [2, 0, 1]
    this._worldPositionIndex = Array(3);
    
    // what is the order of the nameWorldSpace in dimensions when compare to the ordered dimname ["x", "y", "z"]?
    // e.g. if we have nameWorldSpace in dimensions that are [y z x], then this array
    // would be [1, 2, 0]
    this._worldPositionOrder = Array(3);
    
    function positionOf( dimName ){
      return dimensions[0].nameWorldSpace === dimName ? 0 : dimensions[1].nameWorldSpace === dimName ? 1 : dimensions[2].nameWorldSpace === dimName ? 2 : -1;
    }
    
    var correctOrder = [0, 1, 2];
    this._hasNativeCorrectOrder = true;
    
    for(var i=0; i<dimensions.length; i++){
      this._dimensionsWorldLUT[ dimensions[i].nameWorldSpace ] = i;
      this._dimensionsVoxelLUT[ dimensions[i].nameVoxelSpace ] = i;
      
      this._worldPositionIndex[i] = positionOf( worldAxisNames[i] );
      this._worldPositionOrder[i] = worldAxisNames.indexOf( dimensions[i].nameWorldSpace );
      
      this._hasNativeCorrectOrder = this._hasNativeCorrectOrder && (this._worldPositionIndex[i] === correctOrder[i] );
    }

    console.log( '_worldPositionIndex' );
    console.log( this._worldPositionIndex );
    console.log( '_worldPositionOrder' );
    console.log( this._worldPositionOrder );
  }
  
  
  /**
  * Get the index of a dimension, given its name.
  * Looks up in the world dim and then in the voxel-based coord
  * @param {String} name - Name of a dimension
  * @return {Number} index or the dim. -1 if not found
  */
  getDimensionIndexFromName( name ){
    if( name in this._dimensionsWorldLUT ){
      return this._dimensionsWorldLUT[ name ];
    }else if( name in this._dimensionsVoxelLUT ){
      return this._dimensionsVoxelLUT[ name ];
    }else{
      return -1;
    }
  }
  
  /**
  * [PRIVATE]
  * initialize some defualt values for metadata
  */
  _initMetadata(){
    var metaStat = { upToDate: true, min: NaN, max: NaN };

    this.setMetadata("description", "");

    this.setMetadata("statistics", metaStat );

    // number of component per pixel, for color OR time series
    this.setMetadata("ncpp", 1);

    // no special unit for space and time
    this.setMetadata("spatialUnit", "Voxel");
    this.setMetadata("temporalUnit", "Time");

    // So far, this instance does not come from a file decoding
    this.setMetadata("format", "generic");

    // this field is to hold original metadata from a reader (eg. NIfTI)
    this.setMetadata("formatSpecific", {});
    
    // possibly contains no transformations
    this.setMetadata("transformations", {});
  }
  
  /**
  * @return {Image3DAlt} a deep copy instance of this Image3DAlt
  */
  clone(){
    var cpImg = new Image3DAlt();
    cpImg.setRawData( new this._data.constructor( this._data ) );
    cpImg.copyMetadataFrom( this );
    return cpImg;
  }


  /**
  * Initialize _this_ with some data and appropriate size
  * @param {Float32Array} buffer - the raw data
  * @param {Object} options - may contain the following:
  *   - options.xSize {Number} space length along x axis
  *   - options.ySize {Number} space length along y axis
  *   - options.zSize {Number} space length along z axis
  *   - options.tSize {Number} space length along t axis (time)
  *   - options.ncpp {Number} number of components per pixel. Default = 1
  *   - options.deepCopy {Boolean} perform a deep copy if true. Simple association if false
  */
  setData( buffer, options){
    this._initData( options, buffer)
    this.scanDataRange();
  }


  /**
  * [PRIVATE]
  * Called from the constructor or the setData method
  */
  _initData( options, buffer = null ){
    if( options ){
      // replacing default value for ncpp
      if("ncpp" in options){
        this.setMetadata("ncpp", options.ncpp);
      }

      // init default ordered dimensions based on the give sizes
      if( "xSize" in options && "ySize" in options && "zSize" in options ){

        var dimensions = [
          {
            length: xSize,
            widthDimension: 1,
            heightDimension: 2,
            nameVoxelSpace: "i",
            nameWorldSpace: "x",
            worldUnitSize: 1,
            stride: 1
          },
          {
            length: ySize,
            widthDimension: 0,
            heightDimension: 2,
            nameVoxelSpace: "j",
            nameWorldSpace: "y",
            worldUnitSize: 1,
            stride: xSize
          },
          {
            length: zSize,
            widthDimension: 0,
            heightDimension: 1,
            nameVoxelSpace: "k",
            nameWorldSpace: "z",
            worldUnitSize: 1,
            stride: xSize * ySize
          },
        ]

        var bufferSize = xSize * ySize * zSize * this.getMetadata("ncpp");

        // if we get time dimension info, let's add it too
        if( "tSize" in options ){
          var timeDim = {
            length: tSize,
            widthDimension: -1, // could remove
            heightDimension: -1,
            nameVoxelSpace: "l",
            worldSpaceName: "t",
            worldUnitSize: "",
            stride: xSize * ySize * zSize,
            step: 1
          }
          bufferSize *= tSize;
          
          dimensions.push( timeDim );
          this.setMetadata("dimensions", dimensions);
        }

        // if a buffer is provided, we perform a size-check
        if( buffer ){
          if( buffer.length == bufferSize){
            
            // perform a deep copy
            if("deepCopy" in options && options.deepCopy){
              this._data = new buffer.constructor( buffer );
            }
            // perform a simple association
            else{
              this._data = buffer;
            }
            
          }else{
            console.warn("The buffer provided has a wrong size.");
            return false;
          }
        }else{
          // Allocating the buffer
          this._data = new Float32Array( bufferSize );
          var metaStat = this.getMetadata("statistics");
          metaStat.min = 0;
          metaStat.max = 0;
        }
        
        this._buildDimensionsLUT();
        return this.metadataIntegrityCheck();
      }else{
        console.warn("The necessary options xSize, ySize and zSize were not provided.");
        return false;
      }
    }else{
      return false;
    }
  }


  /**
  * [PRIVATE]
  * Look for min and max on the dataset and add them to the header metadata
  */
  scanDataRange(){
    var min = +Infinity;
    var max = -Infinity;

    for(var i=0; i<this._data.length; i++){
      min = Math.min(min, this._data[i]);
      max = Math.max(max, this._data[i]);
    }

    var metaStat = this.getMetadata("statistics");
    if(!metaStat){
      this.setMetadata("statistics", {})
      metaStat = this.getMetadata("statistics");
    }
    metaStat.min = min;
    metaStat.max = max;
  }


  /**
  * Get the voxel value from a voxel position (in a voxel-coordinate sytem) with NO
  * regards towards how the data is supposed to be read. In other word, dimension.direction
  * is ignored.
  * @param {Object} position - 3D position like {i, j, k}, i being the fastest varying, k being the slowest varying
  * @param {Number} time - position along T axis (time dim, the very slowest varying dim when present)
  
  * @return {Number} the value at a given position.
  */
  getVoxel( position, time=0 ){
    var dimensions = this._metadata.dimensions;
    var i = position.i;
    var j = position.j;
    var k = position.k;
    
    if(i<0 || j<0 || k<0 || time<0 || 
       i>=dimensions[0].length  ||
       j>=dimensions[1].length  ||
       k>=dimensions[2].length  ||
       ( dimensions.length>3 && time>=dimensions[3].length) )
    {
      console.warn("Voxel query is out of bound.");
      return null;
    }
    
    var ncpp = this._metadata.ncpp;
    
    var tOffset = dimensions.length > 3 ? time*dimensions[3].stride * time : 0;
    var iOffset = i * dimensions[2].stride;
    var jOffset = j * dimensions[1].stride;
    var kOffset = k * dimensions[0].stride;
    
    var positionBuffer = tOffset + iOffset + jOffset + kOffset;
    positionBuffer *= ncpp;
    return this._data[ positionBuffer ];
  }
  
  
  /**
  * Get a voxel value at a given position with regards of the direction the data are
  * supposed to be read. In other word, dimension.step is taken into account.
  * @param {Object} position - 3D position like {i, j, k}, i being the fastest varying, k being the slowest varying
  * @param {Number} time - position along T axis (time dim, the very slowest varying dim when present)
  */
  getVoxelSafe( position, time=0){
    var dimensions = this._metadata.dimensions;
    var i = position.i;
    var j = position.j;
    var k = position.k;
    
    if(i<0 || j<0 || k<0 || time<0 || 
       i>=dimensions[0].length  ||
       j>=dimensions[1].length  ||
       k>=dimensions[2].length  ||
       ( dimensions.length>3 && time>=dimensions[3].length) )
    {
      console.warn("Voxel query is out of bound.");
      return null;
    }
    
    var tOffset = dimensions.length > 3 ? time*dimensions[3].stride * time : 0;
    var iOffset = (dimensions[2].step < 0 ?  dimensions[2].length - i -1 : i) * dimensions[2].stride;
    var jOffset = (dimensions[1].step < 0 ?  dimensions[1].length - j -1 : j) * dimensions[1].stride;
    var kOffset = (dimensions[0].step < 0 ?  dimensions[0].length - k -1 : k) * dimensions[0].stride;
    
    var positionBuffer = tOffset + iOffset + jOffset + kOffset;
    return this._data[ positionBuffer ];
  }


  /**
  * Get the size of a dimension in the voxel-based coord system
  * @param {Number|String} dimIndex - can be 0, 1, 2, 3 or "i", "j", "k", "t"
  * @return {Number} the length of this dimension
  */
  getDimensionSize( dimIndex ){
    if( typeof dimIndex === "string" ){
      // if string/name replace by its equivalent numerical index
      dimIndex = this.getDimensionIndexFromName( dimIndex );
      if(dimIndex == -1){
        console.warn("dimensions " + dimIndex + " does not exist.");
        return;
      }
    }

    var dimensions = this._metadata.dimensions;
    if( dimIndex < dimensions.length ){
      return dimensions[ dimIndex ].length;
    }else{
      console.warn("A dimensions of such index does not exist.");
      return null;
    }
  }


  /**
  * @return {Float32Array} the original data, dont mess up with this one.
  * in case of doubt, use  getDataCopy()
  */
  getData(){
    return this._data;  // return the actual array, editable!
  }


  /**
  * @return {Float32Array} a deep copy of the data
  */
  getDataCopy(){
    return new this._data.constructor( this._data );
  }


  /**
  * [PRIVATE]
  * Convert a position from a coordinate system to another. Should be called by a method that makes sure of the
  * order of the dimensions.
  * @param {Array} positionArr - 3D position, could be [x, y, z] or in voxel coord not necessary ordered [i, j, k]
  * because this depends on the orders of the dimension.
  * @param {String} transformName - name of the transformation registered in the metadata
  * @return {Array} coordinate
  */
  _getTransformedPosition( positionArr, transformName ){
    var transformations = this._metadata.transformations;
    
    if( !(transformName in transformations) ){
      console.warn("No transform named " + transformName );
      return null;
    }
    
    var transform = transformations[ transformName ];
    var origPos = vec4.fromValues(positionArr[0], positionArr[1], positionArr[2], 1);
    var transPos = vec4.create();
    vec4.transformMat4(transPos, origPos, transform);
    return transPos;
  }


  /**
  * Convert a position from voxel coordinates to another space
  * @param {Object} voxelPosition - voxel coordinates like {i: Number, j: Number, k: Number} where i is the slowest varying and k is the fastest varying
  * @param {String} transformName - name of a transformation registered in the metadata as a child property of "transformations"
  * @return {Object} coordinates {x: Number, y: Number, z: Number} in the space coorinate given in argument
  */
  getPositionFromVoxelSpaceToTransfoSpace( voxelPosition, transformName ){
    /*
    var transPosUnordered = this._getTransformedPosition( [voxelPosition.k, voxelPosition.j, voxelPosition.i], transformName);
    
    return [
      transPosUnordered[ this._worldPositionIndex[0] ],
      transPosUnordered[ this._worldPositionIndex[1] ],
      transPosUnordered[ this._worldPositionIndex[2] ]
    ]
    */
    
    var transPosUnordered = this._getTransformedPosition( [voxelPosition.k, voxelPosition.j, voxelPosition.i], transformName);
    
    return [
      transPosUnordered[ this._worldPositionIndex[0] ],
      transPosUnordered[ this._worldPositionIndex[1] ],
      transPosUnordered[ this._worldPositionIndex[2] ]
    ]
  }
  
  
  /**
  * Convert coordinates from a a given (non-voxel based) position into a voxel based coord
  * @param {Object} spacePosition - a non-voxel based coordinate as {x, y, z}
  * @param {String} transformName - name of the transformation to use
  */
  getPositionFromTransfoSpaceToVoxelSpace( spacePosition , transformName ){
    var inputPosArray = [spacePosition.x, spacePosition.y, spacePosition.z];
    
    var reOrderedInput = [
      inputPosArray[ this._worldPositionOrder[0] ],
      inputPosArray[ this._worldPositionOrder[1] ],
      inputPosArray[ this._worldPositionOrder[2] ]
    ]
    
    var transPosUnordered = this._getTransformedPosition( reOrderedInput, transformName);
    /*
    return [
      Math.round(transPosUnordered[2]),
      Math.round(transPosUnordered[1]),
      Math.round(transPosUnordered[0])
    ];
    */
    return [
      transPosUnordered[2],
      transPosUnordered[1],
      transPosUnordered[0]
    ];
  }
  
  
  
  getPositionFromVoxelSpaceToTransfoSpaceEXP1(  voxelPosition, transformName ){
    //console.log( "_hasNativeCorrectOrder" )
    //console.log( this._hasNativeCorrectOrder );
    
    var inputPosArray = [voxelPosition.i, voxelPosition.j, voxelPosition.k];
      
    var reOrderedInput = [
      inputPosArray[ this._worldPositionOrder[2] ],
      inputPosArray[ this._worldPositionOrder[1] ],
      inputPosArray[ this._worldPositionOrder[0] ]
    ]
      
    //console.log( reOrderedInput );
      
    var transPosUnordered = this._getTransformedPosition( reOrderedInput, transformName);
      
    //console.log( transPosUnordered );
      
    return transPosUnordered.slice(0, 3);
  }
  
  
  /**
  * Add a transformation to the collection
  * @param {Array} transform - a 4x4 matrix in a shape of a 1D array of size 16 column-major
  * @param {String} name - Name to give to this transformation
  */
  addTransformation( transform, name ){
    var transformations = this._metadata.transformations;
    
    var schema = joi.array().length(16).items(joi.number())
    var isValid = joi.validate( transform , schema );
    
    if( isValid.error ){
      console.warn("Invalid transformation: " + isValid.error );
      return;
    }
    transformations[ name ] = transform;
  }


  /**
  * Get a slice from the dataset
  * @param {Number|String} dimIndex - can be 0, 1, 2 or "i", "j", "k"
  * @param {Number} normalAxis - the index of the slice (default: 0)
  * @param {Number} time - time position (default:0 , only relevant in a 3D + t dataset)
  * @return {image2D} the slice
  */
  getSlice( normalAxis, sliceIndex=0, time=0 ){
    if( typeof normalAxis === "string" ){
      // if string/name replace by its equivalent numerical index
      normalAxis = this.getDimensionIndexFromName( normalAxis );
      if(normalAxis == -1){
        console.warn("dimensions " + normalAxis + " does not exist.");
        return;
      }
    }
      
    var dimensions = this._metadata.dimensions;
    
    // The dimension of the normalAxis must exist (and not be time)
    if( normalAxis > 2 ){
      console.warn("The dimension of a slice should be lower than 3.");
      return null;
    }
    
    // the final slice image has for normal vector the sliceDimension.
    // In other words, the width and height of the slice will be the "lenght" of
    // the sliceDimension.widthDimension and sliceDimension.heightDimension respectively
    var sliceDimension = dimensions[normalAxis];
    var widthDimension = dimensions[sliceDimension.widthDimension];
    var heightDimension = dimensions[sliceDimension.heightDimension];
    
    // Slice index checking
    if( sliceIndex < 0 || sliceIndex >= sliceDimension.length ){
      console.warn("The slice required is out of bound.");
      return null;
    }
    
    var Img2dData = new this._data.constructor( widthDimension.length * heightDimension.length );
    var timeOffset = dimensions.length > 3 ? time*dimensions[3].stride * time : 0;
    var sliceOffset = (sliceDimension.step < 0 ? sliceDimension.length - sliceIndex - 1 : sliceIndex) * sliceDimension.stride;
    
    var pixelCounter = 0;
    // this axis is always fliped by default (not sure why)
    for (var r = heightDimension.length - 1; r >= 0; r--) {
      var heighDimOffset = (heightDimension.step < 0 ? heightDimension.length - r -1 : r) * heightDimension.stride; 
      
      for(var c=0; c<widthDimension.length; c++){
        var widthDimOffset = (widthDimension.step < 0 ?  widthDimension.length - c -1 : c) * widthDimension.stride; 
        
        var offset = sliceOffset + timeOffset + 
                     heighDimOffset + 
                     widthDimOffset;

        Img2dData[pixelCounter] = this._data[ offset ];
        pixelCounter ++;
      }
    }
    
    var outputImage = new Image2D();
    outputImage.setData(  Img2dData, widthDimension.length, heightDimension.length, 1);
    return outputImage;
  }


  /**
  * Get the number of samples over time
  * @return {number} the number of time samples
  */
  getTimeLength(){
    var dimensions = this._metadata.dimensions;
    return ( dimensions.length == 4 ? dimensions[3].length : 1 );
  }


  /**
  * Tells if a given point is inside or outside the image
  * @param {Object} pos - position like {x: Number, y: Number, z: Number}
  * @return {Boolean} true for inside, false for outside
  */
  isInside( pos ){
    var dimensions = this._metadata.dimensions;
    return !(pos.x < 0 || pos.x >= dimensions[0].length ||
             pos.y < 0 || pos.y >= dimensions[1].length ||
             pos.z < 0 || pos.z >= dimensions[2].length)
  }


  /**
  * Sample the color along a segment
  * @param {Object} posFrom - starting position of type {x: Number, y: Number, z: Number}
  * @param {Object} posFrom - ending position of type {x: Number, y: Number, z: Number}
  * @return {Object} array of Array like that: {
                                                  positions: [
                                                    {x: x0, y: y0, z: z0},
                                                    {x: x1, y: y1, z: z1},
                                                    {x: x2, y: y2, z: z2},
                                                    ...
                                                  ],
                                                  labels: [
                                                    "(x0, y0, z0)", "(x1, y1, z1)", "(x2, y2, z2)", ...
                                                  ],
                                                  colors: [
                                                            [r0, r1, r2 ...],
                                                            [g0, g1, g2 ...],
                                                            [b0, b1, b2 ...]
                                                  ]
                                                }
     return null if posFrom or posTo is outside
  */
  getSegmentSample( posFrom, posTo, time = 0 ){
    // both position must be inside the image
    if( !this.isInside(posFrom) || !this.isInside(posTo) )
      return null;

    var dx = posTo.x - posFrom.x;
    var dy = posTo.y - posFrom.y;
    var dz = posTo.z - posFrom.z;
    var euclidianDistance = Math.sqrt( Math.pow(dx , 2) + Math.pow(dy , 2) + Math.pow(dz , 2) );
    var numberOfSamples = Math.floor( euclidianDistance + 1 );

    // we want to sample every unit distance along the segment
    var stepX = dx / euclidianDistance;
    var stepY = dy / euclidianDistance;
    var stepZ = dz / euclidianDistance;

    var ncpp = this._metadata.ncpp;
    var positions = new Array(numberOfSamples).fill(0);
    var colors = new Array(ncpp).fill(0);
    var labels = new Array(numberOfSamples).fill(0);

    // creating empty arrays for colors
    for(var c=0; c<ncpp; c++){
      colors[c] = new Array(numberOfSamples).fill(0);
    }

    // walk along the segment, from posFrom to posTo
    for(var i=0; i<numberOfSamples; i++){
      var currentPos = {
        x: Math.round(posFrom.x + i*stepX),
        y: Math.round(posFrom.y + i*stepY),
        z: Math.round(posFrom.z + i*stepZ)
      };

      positions[i] = currentPos;
      labels[i] = "(" + currentPos.x + ", " + currentPos.y + ", " + currentPos.z + ")";

      var pixValue = [this.getVoxel( currentPos.x, currentPos.y, currentPos.z, time )];
      
      // each channel is dispatched in its array
      for(var c=0; c<ncpp; c++){
        colors[c][i] = pixValue[c];
      }
    }

    return {
      positions: positions,
      labels: labels,
      colors: colors
    }
  } /* END of method getLineSample */



} /* END of class Image3DAlt */

// register this type as a CoreType
CoreTypes.addCoreType( Image3DAlt );

export { Image3DAlt }
