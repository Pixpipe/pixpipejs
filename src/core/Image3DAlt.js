/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


import joi from 'joi-browser';
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
  * [SUPER OVERLOAD - PipxpipeObject]
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
          direction: joi.number().integer().valid([-1, 1]).required()
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


  static validateDimensionObject( dimensions ){
    
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
      if( "xSize" in options && "xSize" in options && "xSize" in options ){

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
            direction: 1
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
        
        return true;
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
  * @param {Number} i - position along I axis (the fastest varying dimension)
  * @param {Number} j - position along J axis
  * @param {Number} k - position along K axis (the slowest varying dimension, unless there is a time dim)
  * @param {Number} t - position along T axis (time dim, the very slowest varying dim when present)
  * @return {Number} the value at a given position.
  */
  getVoxel( i, j, k, t=0 ){
    var dimensions = this._metadata.dimensions;
    
    if(i<0 || j<0 || k<0 || t<0 || 
       i>=dimensions[0].length  ||
       j>=dimensions[1].length  ||
       k>=dimensions[2].length  ||
       ( dimensions.length>3 && t>=dimensions[3].length) )
    {
      console.warn("Voxel query is out of bound.");
      return null;
    }
    
    var ncpp = this._metadata.ncpp;
    var positionBuffer = i * dimensions[0].stride +
                         j * dimensions[1].stride +
                         k * dimensions[2].stride +
                         dimensions.length > 3 ? t * dimensions[3].stride : 0;
    positionBuffer *= ncpp;
    return this._data[ positionBuffer ];
  }
  
  
  /**
  * Get a voxel value at a given position with regards of the direction the data are
  * supposed to be read. In other word, dimension.direction is taken into account.
  * @param {Number} i - position along I axis (the fastest varying dimension)
  * @param {Number} j - position along J axis
  * @param {Number} k - position along K axis (the slowest varying dimension, unless there is a time dim)
  * @param {Number} t - position along T axis (time dim, the very slowest varying dim when present)
  */
  getVoxelSafe( i, j, k, t=0){
    var dimensions = this._metadata.dimensions;
    
    if(i<0 || j<0 || k<0 || t<0 || 
       i>=dimensions[0].length  ||
       j>=dimensions[1].length  ||
       k>=dimensions[2].length  ||
       ( dimensions.length>3 && t>=dimensions[3].length) )
    {
      console.warn("Voxel query is out of bound.");
      return null;
    }
    
    var tOffset = dimensions.length > 3 ? time*dimensions[3].stride * time : 0;
    var iOffset = (dimensions[0].direction < 0 ?  dimensions[0].length - i -1 : i) * dimensions[0].stride;
    var jOffset = (dimensions[1].direction < 0 ?  dimensions[1].length - j -1 : j) * dimensions[1].stride;
    var kOffset = (dimensions[2].direction < 0 ?  dimensions[2].length - k -1 : k) * dimensions[2].stride;
    
    var positionBuffer = tOffset + iOffset + jOffset + kOffset;
    return this._data[ positionBuffer ];
  }


  /**
  * Get the size of a dimension in the voxel-based coord system
  * @param {Number|String} dimIndex - can be 0, 1, 2, 3 or "i", "j", "k", "t"
  * @return {Number} the length of this dimension
  */
  getDimensionSize( dimIndex ){
    var index = dimIndex;
    var indexer = { "i": 0, "j": 1, "k": 2, "t": 3};
    if( typeof dimIndex === "string" )
      index = indexer[ dimIndex ];
      
    var dimensions = this._metadata.dimensions;
    if( index < dimensions.length ){
      return dimensions[ index ].length;
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


  getSliceDim0( sliceIndex, time=0 ){
    var dimensions = this._metadata.dimensions;
    var width = dimensions[dimensions[0].widthDimension].length;
    var height = dimensions[dimensions[0].heightDimension].length;
    
    var Img2dData = new this._data.constructor( width * height );
    var pixelCounter = 0;
    
    if( dimensions[0].widthDimension == 1){
      for (var r = height - 1; r >= 0; r--) {
      //for(var r=0; r<height; r++){
        for(var c=0; c<width; c++){
          Img2dData[pixelCounter] = this.getVoxelSafe( sliceIndex, c, r, time);
          pixelCounter++;
        }
      }
    }else{
      for (var r = height - 1; r >= 0; r--) {
      //for(var r=0; r<height; r++){
        for(var c=0; c<width; c++){
          Img2dData[pixelCounter] = this.getVoxelSafe( sliceIndex, r, c, time);
          pixelCounter++;
        }
      }
    }
    
    var outputImage = new Image2D();
    outputImage.setData(  Img2dData, width, height, 1);
    return outputImage;
  }


  /**
  * Get a slice from the dataset
  * @param {Number|String} dimIndex - can be 0, 1, 2 or "i", "j", "k"
  * @param {Number} normalAxis - the index of the slice (default: 0)
  * @param {Number} time - time position (default:0 , only relevant in a 3D + t dataset)
  * @return {image2D} the slice
  */
  getSlice( normalAxis, sliceIndex=0, time=0 ){
    var dimIndex = normalAxis;
    var indexer = { "i": 0, "j": 1, "k": 2, "t": 3};
    if( typeof normalAxis === "string" )
      dimIndex = indexer[ normalAxis ];
      
    var dimensions = this._metadata.dimensions;
    
    // The dimension of the normalAxis must exist (and not be time)
    if( dimIndex > 2 ){
      console.warn("The dimension of a slice should be lower than 3.");
      return null;
    }
    
    // the final slice image has for normal vector the sliceDimension.
    // In other words, the width and height of the slice will be the "lenght" of
    // the sliceDimension.widthDimension and sliceDimension.heightDimension respectively
    var sliceDimension = dimensions[dimIndex];
    var widthDimension = dimensions[sliceDimension.widthDimension];
    var heightDimension = dimensions[sliceDimension.heightDimension];
    
    // Slice index checking
    if( sliceIndex < 0 || sliceIndex >= sliceDimension.length ){
      console.warn("The slice required is out of bound.");
      return null;
    }
    
    var Img2dData = new this._data.constructor( widthDimension.length * heightDimension.length );
    var timeOffset = dimensions.length > 3 ? time*dimensions[3].stride * time : 0;
    var sliceOffset = (sliceDimension.direction < 0 ? sliceDimension.length - sliceIndex - 1 : sliceIndex) * sliceDimension.stride;
    
    var pixelCounter = 0;
    // this axis is always fliped by default (not sure why)
    for (var r = heightDimension.length - 1; r >= 0; r--) {
      var heighDimOffset = (heightDimension.direction < 0 ? heightDimension.length - r -1 : r) * heightDimension.stride; 
      
      for(var c=0; c<widthDimension.length; c++){
        var widthDimOffset = (widthDimension.direction < 0 ?  widthDimension.length - c -1 : c) * widthDimension.stride; 
        
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
  * [PRIVATE]
  * Return a slice from the minc cube as a 1D typed array,
  * along with some relative data (slice size, step, etc.)
  * args:
  * @param {String} axis - "xspace", "yspace" or zspace (mandatory)
  * @param {Number} sliceIndex - index of the slice [0; length-1] (optional, default: length-1)
  * @param {Number} time - index of time (optional, default: 0)
  * TODO: add some method to a slice (get value) because it's a 1D array... and compare with Python
  */
  getSliceORIG(axis, sliceIndex = 0, time = 0) {
    if( !this.hasMetadata(axis) ){
      console.warn("The axis " + axis + " does not exist.");
      return null;
    }
  

    var time_offset = this.hasMetadata("time") ? time * this.getMetadata("time").offset : 0;

    var axis_space = this.getMetadata(axis);
    var width_space = axis_space.width_space;
    var height_space = axis_space.height_space;

    var width = axis_space.width;
    var height = axis_space.height;

    var axis_space_offset = axis_space.offset;
    var width_space_offset = width_space.offset;
    var height_space_offset = height_space.offset;

    // Calling the volume data's constructor guarantees that the
    // slice data buffer has the same type as the volume.
    //
    //var slice_data = new this._data.constructor(width * height);
    var slice_data = new this._data.constructor(width * height);

    // Rows and colums of the result slice.
    var row, col;

    // Indexes into the volume, relative to the slice.
    // NOT xspace, yspace, zspace coordinates!!!
    var x, y, z;

    // Linear offsets into volume considering an
    // increasing number of axes: (t) time,
    // (z) z-axis, (y) y-axis, (x) x-axis.
    var tz_offset, tzy_offset, tzyx_offset;

    // Whether the dimension steps positively or negatively.
    var x_positive = width_space.step  > 0;
    var y_positive = height_space.step > 0;
    var z_positive = axis_space.step   > 0;

    // iterator for the result slice.
    var i = 0;
    var intensity = 0;
    var intensitySum = 0;
    var min = Infinity;
    var max = -Infinity;

    var maxOfVolume = this.getMetadata("voxel_max");

    z = z_positive ? sliceIndex : axis_space.space_length - sliceIndex - 1;
    if (z >= 0 && z < axis_space.space_length) {
      tz_offset = time_offset + z * axis_space_offset;

      for (row = height - 1; row >= 0; row--) {
        y = y_positive ? row : height - row - 1;
        tzy_offset = tz_offset + y * height_space_offset;

        for (col = 0; col < width; col++) {
          x = x_positive ? col : width - col - 1;
          tzyx_offset = tzy_offset + x * width_space_offset;

          intensity = this._data[tzyx_offset];

          min = Math.min(min, intensity);
          max = Math.max(max, intensity);
          intensitySum += intensity;

          slice_data[i++] = intensity;
        }
      }
    }

    var outputImage = new Image2D();
    outputImage.setData(  slice_data, width, height, 1);
    outputImage.setMetadata("min", min);
    outputImage.setMetadata("max", max);
    outputImage.setMetadata("avg", intensitySum / (i-1) );
    return outputImage;

  }


  /**
  * Get the intensity of a given voxel, addressed by dimensionality order.
  * In case of doubt, use getIntensity_xyz instead.
  * @param {Number} i - Position within the biggest dimensionality order
  * @param {Number} j - Position within the in-the-middle dimensionality order
  * @param {Number} k - Position within the smallest dimensionality order
  */
  getIntensity_ijk(i, j, k, time = 0) {
    var order = this.getMetadata("order");

    if (i < 0 || i >= this.getMetadata( order[0] ).space_length ||
        j < 0 || j >= this.getMetadata( order[1] ).space_length ||
        k < 0 || k >= this.getMetadata( order[2] ).space_length)
    {
        console.warn("getIntensity_ijk position is out of range.");
        return 0;
    }

    //var time_offset = this.hasMetadata( "time" ) ? time * this.getMetadata( "time" ).offset : 0;
    var time_offset = this._metadata.time.offset * time;

    var xyzt_offset = (
      i * this.getMetadata( order[0] ).offset +
      j * this.getMetadata( order[1] ).offset +
      k * this.getMetadata( order[2] ).offset +
      time_offset);

    return this._data[xyzt_offset];
  }


  /**
  * Get the intensity of a given voxel, addressed by dimension names.
  * @param {Number} x - position within xspace
  * @param {Number} y - position within yspace
  * @param {Number} z - position within zspace
  * @param {Number} time - position in time (optional)
  */
  getIntensity_xyz(x, y, z, time = 0) {

    if (x < 0 || x >= this._metadata.xspace.space_length ||
        y < 0 || y >= this._metadata.yspace.space_length ||
        z < 0 || z >= this._metadata.zspace.space_length)
    {
        console.warn("getIntensity_xyz position is out of range.");
        return 0;
    }

    //var time_offset = this.hasMetadata( "time" ) ? time * this.getMetadata( "time" ).offset : 0;
    var time_offset = this._metadata.time.offset * time;

    var xyzt_offset = (
      x * this._metadata.xspace.offset +
      y * this._metadata.yspace.offset +
      z * this._metadata.zspace.offset +
      time_offset);

    return this._data[xyzt_offset];
  }


  /**
  * Get the number of samples over time
  */
  getTimeLength(){
    return ( this.hasMetadata("time") ? this.getMetadata("time").space_length : 1 );
  }


  /**
  * Tells if a given point is inside or outside the image
  * @param {Object} pos - position like {x: Number, y: Number, z: Number}
  * @return {Boolean} true for inside, false for outside
  */
  isInside( pos ){
    return !(pos.x < 0 || pos.x >= this._metadata.xspace.space_length ||
             pos.y < 0 || pos.y >= this._metadata.yspace.space_length ||
             pos.z < 0 || pos.z >= this._metadata.zspace.space_length)
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

      var pixValue = [this.getIntensity_xyz( currentPos.x, currentPos.y, currentPos.z )];

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
