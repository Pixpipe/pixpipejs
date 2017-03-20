/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { PipelineElement } from './PipelineElement.js';

/**
* Image3D class is one of the few base element of Pixpipejs.
* It is always considered to be 4 channels (RGBA) and stored as a Float32Array
* typed array.
*/
class Image3D extends PipelineElement{


  /**
  * Constructor of an Image3D instance. If no options, no array is allocated.
  * @param {Object} options - if present, must have options.width, options.height, option.depth.
  * Also options.ncpp to set the number of components per pixel. (possibly for using time series)
  */
  constructor( options=null ){
    super();
    this._type = Image3D.TYPE();

    // a rgba stored in a Float32Array (typed array)
    this._data = null;
    this._width = -1;
    this._height = -1;
    this._depth = -1;
    this._ncpp = 1;  // number of component per pixel, for color OR time series

    // pipeline associated with this image. Not mandatory.
    this._pipeline = null;

    // replacing default value for ncpp
    if(options && "ncpp" in options){
      this._ncpp = options.ncpp;
    }

    // allocate the array if size is specified
    if(options && "width" in options && "height" in options && "depth" in options){

      if( options.width > 0 && options.height > 0){
        this._width = options.width;
        this._height = options.height;
        this._depth = options.depth;
        this._data = new Float32Array( this._width * this._height * this._ncpp );
        this._data.fill(0);
      }
    }

  }


  /**
  * Hardcode the datatype
  */
  static TYPE(){
    return "Image3D";
  }


  /**
  * @return {Image3D} a deep copy instance of this Image3D
  */
  clone(){
    var cpImg = new Image3D();
    cpImg.setData( this._data, this._width, this._height );
    return cpImg;
  }


  /**
  *  Set the data to this Image3D.
  * @param {Float32Array} array - 1D array of raw data stored as RGBARGBA...
  * @param {Number} width - width of the Image3D
  * @param {Number} height - height of the Image3D
  * @param {Number} ncpp - number of components per pixel (default: 4)
}
  */
  setData( array, width, height, ncpp=4 ){
    /*
    // do not allow to set a new internal array
    if( this._data ){
      console.warn("Data can be set to an Image3D object only once. Cannot init the Image3D.");
      return;
    }
    */

    this._ncpp = ncpp;

    if( array.length != width*height*this._ncpp){
      console.warn("The array size does not match the width and height. Cannot init the Image3D.");
      return;
    }

    this._data = new Float32Array( array );
    this._width = width;
    this._height = height;
  }


  /**
  * Modify the color of a given pixel.
  * @param {Object} position - 2D position in form {x, y}
  * @param {Array} color - color, must have the same numb of components per pix than the image
  */
  setPixel( position, color ){
    if("x" in position && position.x >=0 && position.x < this._width &&
       "y" in position && position.y >=0 && position.y < this._height &&
       color.length == this._ncpp)
    {

      var pos1D = this.get1dIndexFrom2dPosition( position );

      for(var i=0; i<this._ncpp; i++){
        this._data[ pos1D + i] = color[i];
      }

    }else{
      console.error("x and y position have to be within the image dimensions and color size must be the same as the original image.");
    }
  }


  /**
  * @return {Array} the color of the given pixel.
  */
  getPixel( position ){
    if("x" in position && position.x >=0 && position.x < this._width &&
       "y" in position && position.y >=0 && position.y < this._height)
    {
      var pos1D = this.get1dIndexFrom2dPosition( position );
      var color = this._data.slice(pos1D, pos1D + this._ncpp);
      return color;

    }else{
      console.warn("The requested position is outside the image.");
      return null;
    }
  }


  /**
  * @return {Number} the width of the Image3D
  */
  getWidth(){
    return this._width;
  }


  /**
  * @return {Number} the height of the Image3D
  */
  getHeight(){
    return this._height;
  }


  /**
  * @return {Number} the number of components per pixel
  */
  getComponentsPerPixel(){
    return this._ncpp;
  }


  /**
  * @return {Float32Array} the original data, dont mess up with this one.
  * in case of doubt, use  getDataCopy()
  */
  getData(){
    //return this._data.slice();  // return a copy
    return this._data;  // return the actual array, editable!
  }


  /**
  * @return {Float32Array} a deep copy of the data
  */
  getDataCopy(){
    return this._data.slice();
  }


  /**
  * Compute the (x, y) position from a position in a 1D array.
  * This has nothing to do with the number of components per pixel.
  * @param {Number} i - the index of a pixel.
  * @return {Object} coordinate as {x, y}
  */
  get2dPositionFrom1dIndex( i ){
    return {
      x: i % this._width,
      y: Math.floor(i / this._width)
    }
  }


  /**
  * Compute the 1D index within the data buffer from a 2D position {x, y}.
  * This has nothing to do with the number of components per pixel.
  * @param {Object} position - 2D coord like {x, y}
  * @return {Number} the 1D position within the buffer
  */
  get1dIndexFrom2dPosition( position ){
    return (position.x + position.y*this._width);
  }




  // TODO: warn the pipeline if metadata changed or pixel value changed
  // --> do NOT update the pipeline at every modif because if we change a lot
  //     of pixel values... (wait to call update() on the pipeline.)


} /* END of class Image3D */

export { Image3D }
