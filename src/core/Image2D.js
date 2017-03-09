/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { PixpipeObject } from './PixpipeObject.js';

/**
* Image2D class is one of the few base element of Pixpipejs.
* It is always considered to be 4 channels (RGBA) and stored as a Float32Array
* typed array.
*/
class Image2D extends PixpipeObject{


  /**
  * Constructor of an Image2D instance. If no options, no array is allocated.
  * @param {Object} options - if present, must have options.width, options.height. Also options.color = [r, g, b, a] is possible but not mandatory, this sets the default color.
  */
  constructor( options=null ){
    super();
    this._type = Image2D.TYPE();

    // a rgba stored in a Float32Array (typed array)
    this._data = null;
    this._width = -1;
    this._height = -1;
    this._componentsPerPixel = 4; // RGBA

    // allocate the array if size is specified
    if(options && "width" in options && "height" in options){

      if( options.width > 0 && options.height > 0){
        this._width = options.width;
        this._height = options.height;
        this._data = new Float32Array( this._width * this._height * this._componentsPerPixel );

        // init the color if specified
        if("color" in options && options.color.length == 4 ){
          var color = options.color;

          for(var i=0; i<this._data.length; i+=4){
            this._data[i] = color[0];
            this._data[i + 1] = color[1];
            this._data[i + 2] = color[2];
            this._data[i + 3] = color[3];
          }

          console.log(this._data);
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
    cpImg.setData( this._data, this._width, this._height );
    return cpImg;
  }


  /**
  *  Set the data to this Image2D.
  * @param {Float32Array} array - 1D array of raw data stored as RGBARGBA...
  * @param {Number} width - width of the Image2D
  * @param {Number} height - height of the Image2D
  */
  setData( array, width, height ){
    // do not alloz to set a new internal array
    if( this._data ){
      console.warn("Data can be set to an Image2D object only once. Cannot init the Image2D.");
      return;
    }

    if( array.length != width*height*this._componentsPerPixel){
      console.warn("The array size does not match the width and height. Cannot init the Image2D.");
      return;
    }

    this._data = new Float32Array( array );
    this._width = width;
    this._height = height;

  }


  /**
  * @return {Number} the width of the Image2D
  */
  getWidth(){
    return this._width;
  }


  /**
  * @return {Number} the height of the Image2D
  */
  getHeight(){
    return this._height;
  }


  /**
  * @return {Number} the number of components per pixel
  */
  getComponentsPerPixel(){
    return this._componentsPerPixel;
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
  * @param {Number} i - the index of a pixel. This has nothing to do with
  * the number of components per pixel.
  * @return {Object} coordinate as {x, y}
  */
  get2dPositionFrom1dIndex( i ){
    return {
      x: i % this._width,
      y: Math.floor(i / this._width)
    }
  }

} /* END of class Image2D */

export { Image2D }
