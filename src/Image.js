/**
* Image class is one of the few base element of Pixpipejs.
* It is always considered to be 4 channels (RGBA) and stored as a Float32Array
* typed array.
*/
class Image {

  /**
  * Constructor, does not take any argument because if is built later
  */
  constructor(){
    // a rgba stored in a Float32Array (typed array)
    this._data = null;
    this._width = -1;
    this._height = -1;
    this._componentsPerPixel = 4; // RGBA
  }


  /**
  *  Set the data to this image.
  * @param {Float32Array} array - 1D array of raw data stored as RGBARGBA...
  * @param {Number} width - width of the image
  * @param {Number} height - height of the image
  */
  setData( array, width, height ){
    // do not alloz to set a new internal array
    if( this._data ){
      console.warn("Data can be set to an Image object only once. Cannot init the image.");
      return;
    }

    if( array.length != width*height*this._componentsPerPixel){
      console.warn("The array size does not match the width and height. Cannot init the image.");
      return;
    }

    this._data = new Float32Array( array );
    this._width = width;
    this._heigth = height;

  }


  /**
  * @return {Number}
  */
  getWidth(){
    return this._width;
  }

  getHeight(){
    return this._height;
  }

  getData(){
    //return this._data.slice();  // return a copy
    return this._data;  // return the actual array, editable!
  }

} /* END of class Image */

export { Image }
