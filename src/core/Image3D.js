/*
* Author   Jonathan Lurie - http://me.jonathanlurie.fr
* License  MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { CoreTypes } from './CoreTypes.js';
import { PixpipeContainer } from './PixpipeContainer.js';
import { Image2D } from './Image2D.js';

/**
* Image3D class is one of the few base element of Pixpipejs.
* It is always considered to be 4 channels (RGBA) and stored as a Float32Array
* typed array.
*/
class Image3D extends PixpipeContainer{


  /**
  * Constructor of an Image3D instance. If no options, no array is allocated.
  * @param {Object} options - may contain the following:
  *   - options.xSize {Number} space length along x axis
  *   - options.ySize {Number} space length along y axis
  *   - option.zSize {Number} space length along z axis
  *   - options.ncpp {Number} number of components per pixel. Default = 1
  *   - options.order {Array} dimensionality order. default = ["zspace", "yspace", "xspace"]
  */
  constructor( options=null ){
    super();
    this._type = Image3D.TYPE();

    // number of component per pixel, for color OR time series
    this.setMetadata("ncpp", 1);

    // dimensionality order
    if(options && "order" in options){
      this.setMetadata("order", options.order);
    }else{
      this.setMetadata("order", ["zspace", "yspace", "xspace"]);
    }

    var xspace = {
      offset: 1,
      step: 1
    }

    var yspace = {
      step: 1
    }

    var zspace = {
      step: 1
    }
    
    var time = {
      offset: 0,
      space_length: 1
    }

    this.setMetadata("xspace", xspace);
    this.setMetadata("yspace", yspace);
    this.setMetadata("zspace", zspace);
    this.setMetadata("time", time);

    // replacing default value for ncpp
    if(options && "ncpp" in options){
      this.setMetadata("ncpp", options.ncpp);
    }

    // allocate the array if size is specified
    if(options && "xSize" in options && "ySize" in options && "zSize" in options){

      if( options.xSize > 0 && options.ySize > 0 && options.zSize > 0 ){
        xspace.space_length = options.xSize;
        yspace.space_length = options.ySize;
        zspace.space_length = options.zSize;

        yspace.offset = xspace.space_length;
        zspace.offset = xspace.space_length * yspace.space_length;

        this._data = new Float32Array( options.xSize * options.ySize * options.zSize * this.getMetadata("ncpp") );
        this._data.fill(0);

        this._scanDataRange();
        this._finishHeader();
      }
    }
  }


  /**
  * Hardcode the datatype
  */
  static TYPE(){
    return "IMAGE3D";
  }


  /**
  * @return {Image3D} a deep copy instance of this Image3D
  */
  clone(){
    var cpImg = new Image3D();

    cpImg.setData(
      this._data,
      this.getMetadata("xspace").space_length,
      this.getMetadata("yspace").space_length,
      this.getMetadata("zspace").space_length,
      {
        ncpp: this.getMetadata("ncpp"),
        order: this.getMetadata("order").slice(),
        deepCopy: true,
      }
    );

    cpImg.copyMetadataFrom( this );

    return cpImg;
  }


  /**
  *  Set the data to this Image3D.
  * @param {Float32Array} array - 1D array of raw data stored as RGBARGBA...
  * @param {Number} xSize - length along x dimension of the Image3D
  * @param {Number} ySize - length along y dimension of the Image3D
  * @param {Number} zSize - length along z dimension of the Image3D
  * @param {Number} ncpp - number of components per pixel (default: 4)
  * @param {Boolean} deepCopy - if true, a copy of the data is given, if false we jsut give the pointer
  * @param {Object} options, among them:
  *   - ncpp {Number} number of components per pixel. Default = 1
  *   - order {Array} dimensionality order. Default = ["zspace", "yspace", "xspace"]
  *   - deepCopy {Boolean} copy the whole array if true, or just the pointer if false. Default = false
  *
  */
  setData( array, xSize, ySize, zSize, options){
    var ncpp = 1;

    // number of components per pixel
    if(options && "ncpp" in options){
      ncpp = options.ncpp;
    }

    if( array.length != xSize*ySize*zSize*ncpp){
      console.warn("The array size does not match the width and height. Cannot init the Image3D.");
      return;
    }

    // number of components per pixel
    if(options && "ncpp" in options){
      this.setMetadata("ncpp", options.ncpp);
    }

    // dimensionality order
    if(options && "order" in options){
      this.setMetadata("order", options.order);
    }

    // deep of shallow copy
    if(options && "deepCopy" in options && options.deepCopy){
      this._data = new array.constructor( array );
    }else{
      this._data = array;
    }

    var xspace = this.getMetadata("xspace");
    var yspace = this.getMetadata("yspace");
    var zspace = this.getMetadata("zspace");

    xspace.space_length = xSize;
    yspace.space_length = ySize;
    zspace.space_length = zSize;

    yspace.offset = xspace.space_length;
    zspace.offset = xspace.space_length * yspace.space_length;

    this._scanDataRange();
    this._finishHeader();
  }


  /**
  * [PRIVATE]
  * Creates common fields all headers must contain.
  */
  _finishHeader() {
    var xspace = this.getMetadata("xspace");
    var yspace = this.getMetadata("yspace");
    var zspace = this.getMetadata("zspace");

    xspace.name = "xspace";
    yspace.name = "yspace";
    zspace.name = "zspace";

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


  /**
  * [PRIVATE]
  * Look for min and max on the dataset and add them to the header metadata
  */
  _scanDataRange(){
    var min = +Infinity;
    var max = -Infinity;

    for(var i=0; i<this._data.length; i++){
      min = Math.min(min, this._data[i]);
      max = Math.max(max, this._data[i]);
    }

    this.setMetadata("voxel_min", min);
    this.setMetadata("voxel_max", max);
  }


  /**
  * Modify the color of a given pixel.
  * @param {Object} position - 3D position in the form {x, y, z}
  * @param {Array} color - color, must have the same number of components per pixel than the image
  */
  setPixel( position, color ){
    // TODO: to implement using order offset
  }


  /**
  * Same as getIntensity_xyz, get a pixel/voxel value using (x, y, z) position
  * @param {Object} position - 3D position like {x, y, z}
  * @return {Array} the color of the given pixel.
  */
  getPixel( position ){
    return this.getIntensity_xyz( position.x, position.y, position.z );
  }


  /**
  * @param {String} space - "xspace", "yspace" or "zspace"
  * @return {Number} the size of the Image3D along the given space
  */
  getSize( space ){
    if( this.hasMetadata( space )){
      return this.getMetadata( space ).space_length;
    }else{
      console.warn("The space must be \"xspace\", \"yspace\" or \"zspace\".");
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
  * Compute the 1D index within the data buffer from a 3D position {x, y, z}.
  * This has nothing to do with the number of components per pixel.
  * @param {Object} position - 3D coord like {x, y, z}
  * @return {Number} the 1D position within the buffer
  */
  get1dIndexFrom3dPosition( position ){
    //return (position.x + position.y*this._width);
    //return this._xSize * this._ySize * position.z + this._xSize * position.y + position.x;
    // TODO: to implement using order offset
  }


  /**
  * [PRIVATE]
  * Return a slice from the minc cube as a 1D typed array,
  * along with some relative data (slice size, step, etc.)
  * args:
  * @param {String} axis - "xspace", "yspace" or zspace (mandatory)
  * @param {Number} slice_num - index of the slice [0; length-1] (optional, default: length-1)
  * @param {Number} time - index of time (optional, default: 0)
  * TODO: add some method to a slice (get value) because it's a 1D array... and compare with Python
  */
  getSlice(axis, slice_num = 0, time = 0) {
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

    z = z_positive ? slice_num : axis_space.space_length - slice_num - 1;
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

  
  getIntensity_xyzOrientation( x, y, z, time=0){
    var time_offset = this.hasMetadata("time") ? time * this.getMetadata("time").offset : 0;
    
    if( x== 10 && y==30 && z==20){
      console.log("stop");
    }
    
    var xspace = this.getMetadata("xspace");
    var yspace = this.getMetadata("yspace");
    var zspace = this.getMetadata("zspace");
    
    // Whether the dimension steps positively or negatively.
    var x_positive = xspace.step > 0;
    var y_positive = yspace.step > 0;
    var z_positive = zspace.step > 0;
    
    var xOrent = x_positive ? x : xspace.space_length - x - 1;
    var yOrent = y_positive ? y : yspace.space_length - y - 1;
    //var yOrent = y_positive ? yspace.space_length - y - 1 : y;
    var zOrent = z_positive ? z : zspace.space_length - z - 1;
    
    if (x >= 0 && x < xspace.space_length &&
        y >= 0 && y < yspace.space_length &&
        z >= 0 && z < zspace.space_length )
    {
      var offset = time_offset + 
                   xOrent * xspace.offset +
                   yOrent * yspace.offset +
                   zOrent * zspace.offset;
      return this._data[offset];
    }else{
      return null;
    }
    
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
  

} /* END of class Image3D */

// register this type as a CoreType
CoreTypes.addCoreType( Image3D );

export { Image3D }
