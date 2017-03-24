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
  * @param {Object} options - if present, must have options.xSize, options.ySize, option.zSize.
  * Also options.ncpp to set the number of components per pixel. (possibly for using time series)
  */
  constructor( options=null ){
    super();
    this._type = Image3D.TYPE();

    // a rgba stored in a Float32Array (typed array)
    this._data = null;
    this._xSize = -1;
    this._ySize = -1;
    this._zSize = -1;
    this._ncpp = 1;  // number of component per pixel, for color OR time series

    // pipeline associated with this image. Not mandatory.
    this._pipeline = null;

    // replacing default value for ncpp
    if(options && "ncpp" in options){
      this._ncpp = options.ncpp;
    }

    // allocate the array if size is specified
    if(options && "xSize" in options && "ySize" in options && "zSize" in options){

      if( options.xSize > 0 && options.ySize > 0 && options.zSize > 0 ){
        this._xSize = options.xSize;
        this._ySize = options.ySize;
        this._zSize = options.zSize;
        this._data = new Float32Array( this._xSize * this._ySize * this._zSize * this._ncpp );
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
    cpImg.setData( new Float32Array( this._data ), this._xSize, this._ySize, this._zSize );
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
  */
  setData( array, xSize, ySize, zSize, ncpp=4, deepCopy=false ){

    this._ncpp = ncpp;

    if( array.length != xSize*ySize*zSize*this._ncpp){
      console.warn("The array size does not match the width and height. Cannot init the Image3D.");
      return;
    }

    if(deepCopy){
      this._data = new Float32Array( array );
    }else{
      this._data = array;
    }

    this._xSize = xSize;
    this._ySize = ySize;
    this._zSize = zSize;
  }


  /**
  * Modify the color of a given pixel.
  * @param {Object} position - 3D position in the form {x, y, z}
  * @param {Array} color - color, must have the same number of components per pixel than the image
  */
  setPixel( position, color ){
    if("x" in position && position.x >=0 && position.x < this._xSize &&
       "y" in position && position.y >=0 && position.y < this._ySize &&
       "z" in position && position.z >=0 && position.z < this._zSize &&
       color.length == this._ncpp)
    {

      var pos1D = this.get1dIndexFrom3dPosition( position ) * this._ncpp;

      for(var i=0; i<this._ncpp; i++){
        this._data[ pos1D + i] = color[i];
      }

    }else{
      console.error("The position has to be within the image dimensions and color size must be the same as the original image.");
    }
  }


  /**
  * @param {Object} position - 3D position like {x, y, z}
  * @return {Array} the color of the given pixel.
  */
  getPixel( position ){
    if("x" in position && position.x >=0 && position.x < this._xSize &&
       "y" in position && position.y >=0 && position.y < this._ySize &&
       "z" in position && position.z >=0 && position.z < this._zSize)
    {
      var pos1D = this.get1dIndexFrom3dPosition( position ) * this._ncpp;
      var color = this._data.slice(pos1D, pos1D + this._ncpp);
      return color;

    }else{
      console.warn("The requested position is outside the image.");
      return null;
    }
  }


  /**
  * @return {Number} the xSize of the Image3D
  */
  getXSize(){
    return this._xSize;
  }


  /**
  * @return {Number} the ySize of the Image3D
  */
  getYSize(){
    return this._ySize;
  }


  /**
  * @return {Number} the zSize of the Image3D
  */
  getZSize(){
    return this._zSize;
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
  * Compute the 1D index within the data buffer from a 3D position {x, y, z}.
  * This has nothing to do with the number of components per pixel.
  * @param {Object} position - 3D coord like {x, y, z}
  * @return {Number} the 1D position within the buffer
  */
  get1dIndexFrom3dPosition( position ){
    //return (position.x + position.y*this._width);
    return this._xSize * this._ySize * position.z + this._xSize * position.y + position.x;
  }


} /* END of class Image3D */

export { Image3D }
