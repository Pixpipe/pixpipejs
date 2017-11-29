/*
* Author   Jonathan Lurie - http://me.jonathanlurie.fr
* License  MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { CoreTypes } from './CoreTypes.js';
import { PixpipeContainer } from './PixpipeContainer.js';

/**
* Image2D class is one of the few base element of Pixpipejs.
* It is always considered to be 4 channels (RGBA) and stored as a Float32Array
* typed array.
*
* **Usage**
* - [examples/image2DToCanvas.html](../examples/image2DToCanvas.html)
*/
class Image2D extends PixpipeContainer{


  /**
  * Constructor of an Image2D instance. If no options, no array is allocated.
  * @param {Object} options - if present:
  *   - options.width {Number} width in pixel
  *   - options.height {Number} height in pixel
  *   - options.color {Array} can be [r, g, b, a] or just [i]. Optional.
  */
  constructor( options=null ){
    super();
    this._type = Image2D.TYPE();

    // default number of components per pixel
    this.setMetadata("ncpp", 4);

    // allocate the array if size is specified
    if(options && "width" in options && "height" in options){

      if( options.width > 0 && options.height > 0){
        this.setMetadata("width", options.width);
        this.setMetadata("height", options.height);

        if("color" in options){
          this.setMetadata("ncpp", options.color.length );
        }

        this._data = new Float32Array( options.width * options.height * this.getMetadata("ncpp") );
        var ncpp = this.getMetadata("ncpp");

        // init with the given color
        if("color" in options){
          var color = options.color;
          for(var i=0; i<this._data.length; i++){
            this._data[i] = color[i%ncpp];
          }
          //this.computeSimpleStat();
        }else{
          this._data.fill(0);
        }

      }
    }

  }


  /**
  * Hardcode the datatype
  */
  static TYPE(){
    return "IMAGE2D";
  }


  /**
  * @return {Image2D} a deep copy instance of this Image2D
  */
  clone(){
    var cpImg = new Image2D();
    cpImg.setData( this._data, this.getMetadata("width"), this.getMetadata("height"), this.getMetadata("ncpp"), true );
    cpImg.copyMetadataFrom( this );
    return cpImg;
  }


  /**
  * Get an empty copy of an image. Like a clone but the array of data is filled
  * with zeros and no metadata.
  * @return {Image2D}
  */
  hollowClone(){
    var cpImg = new Image2D();
    var ncpp = this.getMetadata("ncpp");
    var width = this.getMetadata("width");
    var height = this.getMetadata("height");

    cpImg.setData( new Float32Array(width*height*ncpp).fill(0), width, height, ncpp);
    return cpImg;
  }


  /**
  * Create a clone of this image that ensure data are encoded in a Float32Array.
  * @return {Image2D} the F32 clone
  */
  float32Clone(){
    var cpImg = new Image2D();
    var ncpp = this.getMetadata("ncpp");
    var width = this.getMetadata("width");
    var height = this.getMetadata("height");

    cpImg.copyMetadataFrom( this );
    cpImg.setData( new Float32Array(this._data), width, height, ncpp);
    return cpImg;
  }


  /**
  *  Set the data to this Image2D.
  * @param {Float32Array} array - 1D array of raw data stored as RGBARGBA...
  * @param {Number} width - width of the Image2D
  * @param {Number} height - height of the Image2D
  * @param {Number} ncpp - number of components per pixel (default: 4)
  * @param {Boolean} deepCopy - if true, a copy of the data is given, if false we jsut give the pointer
  */
  setData( array, width, height, ncpp=4, deepCopy=false ){
    this.setMetadata("ncpp", ncpp);

    if( array.length != width*height*ncpp){
      console.warn("The array size does not match the width and height. Cannot init the Image2D.");
      return;
    }

    if(deepCopy){
      this._data = new array.constructor( array );
    }else{
      this._data = array;
    }

    this.setMetadata("width", width)
    this.setMetadata("height", height)

    this.computeSimpleStat();
  }


  /**
  * Modify the color of a given pixel.
  * @param {Object} position - 2D position in form {x, y}
  * @param {Array} color - color, must have the same numb of components per pix than the image
  */
  setPixel( position, color, computeStat=false ){

    if(!this._data){
      console.warn("The image is empty");
      return;
    }

    var ncpp = this._metadata.ncpp;

    if("x" in position && position.x >=0 && position.x < this._metadata.width &&
       "y" in position && position.y >=0 && position.y < this._metadata.height )
    {

      if(color.length == ncpp){
        var pos1D = this.get1dIndexFrom2dPosition( position );

        if(ncpp == 1){
          this._data[ pos1D ] = color[0];
        }else{
          pos1D *= ncpp;
          for(var i=0; i<ncpp; i++){
            this._data[ pos1D + i] = color[i];
          }
        }
      }else
      // we gave a RGB color instead of a RGBA, it's ok...
      if(color.length == 3 && ncpp == 4){
        var pos1D = this.get1dIndexFrom2dPosition( position );
        pos1D *= ncpp;
        for(var i=0; i<color.length; i++){
          this._data[ pos1D + i] = color[i];
        }
      }

      if( computeStat ){
        this.computeSimpleStat();
      }

    }else{
      //console.error("x and y position have to be within the image dimensions and color size must be the same as the original image.");
    }
  }


  /**
  * @param {Object} position - 2D positoin like {x: Number, y: Number}
  * @return {Array} the color of the given pixel.
  */
  getPixel( position ){
    if(!this._data){
      console.warn("The image is empty");
      return;
    }

    if("x" in position && position.x >=0 && position.x < this._metadata.width &&
       "y" in position && position.y >=0 && position.y < this._metadata.height )
    {
      //var ncpp = this.getMetadata("ncpp");
      var ncpp = this._metadata.ncpp;
      var color = null;
      var pos1D = this.get1dIndexFrom2dPosition( position );

      //
      if(ncpp == 1){
        color = [this._data[pos1D]];
      }else{
        pos1D *= ncpp;
        color = this._data.slice(pos1D, pos1D + ncpp);
      }

      return color;

    }else{
      console.warn("The requested position is outside the image.");
      return null;
    }
  }


  /**
  * Get the width of the image
  * @return {Number} the width of the Image2D
  */
  getWidth(){
    return this._metadata.width;
  }


  /**
  * Get the height of the image
  * @return {Number} the height of the Image2D
  */
  getHeight(){
    return this._metadata.height;
  }


  /**
  * Get the number of components per pixel
  * @return {Number} the number of components per pixel
  */
  getComponentsPerPixel(){
    return this._metadata.ncpp;
  }


  /**
  * Alias to getComponentsPerPixel. Return the number of components per pixel.
  * @return {Number} ncpp
  */
  getNcpp(){
    return this.getComponentsPerPixel();
  }


  /**
  * Get the internal image data (pointer)
  * @return {TypedArray} the original data (most likely a Float32Array), dont mess up with this one.
  * in case of doubt, use  getDataCopy()
  */
  getData(){
    return this._data;  // return the actual array, editable!
  }


  /**
  * Get a copy of the data
  * @return {TypedArray} a deep copy of the data (most likely a Float32Array)
  */
  getDataCopy(){
    return new this._data.constructor( this._data );
  }


  /**
  * No matter the original type of the internal data, scale it into a [0, 255] uInt8Array
  * @return {Uint8Array} scaled data
  */
  getDataAsUInt8Array(){
    if(! this._data){
      console.warn("No data, cannot make a copy of it.");
      return;
    }

    var min = this.getMin();
    var max = this.getMax();

    var uintData = new Uint8Array(this._data.length);

    for(var i=0; i<this._data.length; i++){
      uintData[i] = ((this._data[i] - min) / max) * 256;
    }

    return uintData;
  }


  /**
  * Get a copy of the data but forced as Float 32 (no scaling is done)
  * @return {Float32Array} the casted array
  */
  getDataAsFloat32Array(){
    if(! this._data){
      console.warn("No data, cannot make a copy of it.");
      return;
    }
    
    return new Float32Array( this._data );
  }


  /**
  * Compute the (x, y) position from a position in a 1D array.
  * This has nothing to do with the number of components per pixel.
  * @param {Number} i - the index of a pixel.
  * @return {Object} coordinate as {x, y}
  */
  get2dPositionFrom1dIndex( i ){
    return {
      x: i % this._metadata.width,
      y: Math.floor(i / this._metadata.width)
    }
  }


  /**
  * Compute the 1D index within the data buffer from a 2D position {x, y}.
  * This has nothing to do with the number of components per pixel.
  * @param {Object} position - 2D coord like {x, y}
  * @return {Number} the 1D position within the buffer
  */
  get1dIndexFrom2dPosition( position ){
    //return (position.x + position.y*this.getMetadata("width"));
    return (position.x + position.y*this._metadata.width); // faster when querried a lot
  }


  /**
  * Compute "min" "max" and "avg" and store them in metadata
  */
  computeSimpleStat(){
    if(!this._data){
      console.warn("The image is empty");
      return;
    }

    var min = +Infinity;
    var max = -Infinity;
    var total = 0;

    for(var i=0; i<this._data.length; i++){
      min = Math.min(min, this._data[i]);
      max = Math.max(min, this._data[i]);
      total += this._data[i];
    }

    this.setMetadata("min", min);
    this.setMetadata("max", max);
    this.setMetadata("avg", total/this._data.length);
  }


  /**
  * Get the lowest intensity of the image
  * @return {Number} the minimum value of the data
  */
  getMin(){
    if(!this.hasMetadata("min")){
      this.computeSimpleStat();
    }
    return this.getMetadata("min");
  }


  /**
  * Get the highest intensity of the image
  * @return {Number} the maximum value of the data
  */
  getMax(){
    if(!this.hasMetadata("max")){
      this.computeSimpleStat();
    }
    return this.getMetadata("max");
  }


  /**
  * Get the average intensity of the image
  * @return {Number} the average value of the data
  */
  getAvg(){
    if(!this.hasMetadata("avg")){
      this.computeSimpleStat();
    }
    return this.getMetadata("avg");
  }


  /**
  * Tells if a given point is inside or outside the image
  * @param {Object} pos - position like {x: Number, y: Number}
  * @return {Boolean} true for inside, false for outside
  */
  isInside( pos ){
    return (
      pos.x >= 0 && pos.x < this._metadata.width &&
      pos.y >= 0 && pos.y < this._metadata.height
    )
  }

  /**
  * Sample the color along a segment
  * @param {Object} posFrom - starting position of type {x: Number, y: Number}
  * @param {Object} posFrom - ending position of type {x: Number, y: Number}
  * @return {Object} array of Array like that: {
                                                  positions: [
                                                    {x: x0, y: y0},
                                                    {x: x1, y: y1},
                                                    {x: x2, y: y2},
                                                    ...
                                                  ],
                                                  labels: [
                                                    "(x0, y0)", "(x1, y1)", "(x2, y2)", ...
                                                  ],
                                                  colors: [
                                                            [r0, r1, r2 ...],
                                                            [g0, g1, g2 ...],
                                                            [b0, b1, b2 ...]
                                                  ]
                                                }
     return null if posFrom or posTo is outside
  */
  getSegmentSample( posFrom, posTo ){
    // both position must be inside the image
    if( !this.isInside(posFrom) || !this.isInside(posTo) )
      return null;

    var dx = posTo.x - posFrom.x;
    var dy = posTo.y - posFrom.y;
    var euclidianDistance = Math.sqrt( Math.pow(dx , 2) + Math.pow(dy , 2) );
    var numberOfSamples = Math.floor( euclidianDistance + 1 );

    // we want to sample every unit distance along the segment
    var stepX = dx / euclidianDistance;
    var stepY = dy / euclidianDistance;

    var ncpp = this._metadata.ncpp;
    var positions = new Array(numberOfSamples).fill(0);
    var colors = new Array(ncpp).fill(0);
    var labels = new Array(numberOfSamples).fill(0);

    // creating empty arrays for colors
    for(var c=0; c<ncpp; c++){
      colors[c] = new Array(numberOfSamples).fill(0) ;
    }

    // walk along the segment, from posFrom to posTo
    for(var i=0; i<numberOfSamples; i++){
      var currentPos = {x: Math.round(posFrom.x + i*stepX) , y: Math.round(posFrom.y + i*stepY) };
      positions[i] = currentPos;
      labels[i] = "(" + currentPos.x + ", " + currentPos.y + ")";

      var pixValue = this.getPixel( currentPos );

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



} /* END of class Image2D */

// register this type as a CoreType
CoreTypes.addCoreType( Image2D );

export { Image2D }
