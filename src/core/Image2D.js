/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { PipelineElement } from './PipelineElement.js';

/**
* Image2D class is one of the few base element of Pixpipejs.
* It is always considered to be 4 channels (RGBA) and stored as a Float32Array
* typed array.
*/
class Image2D extends PipelineElement{


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

    // a rgba stored in a Float32Array (typed array)
    this._data = null;
    this.setMetadata("ncpp", 4);

    // pipeline associated with this image. Not mandatory.
    this._pipeline = null;

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
      this._data =  array.slice();
    }else{
      this._data = array;
    }

    this.setMetadata("width", width)
    this.setMetadata("height", height)
  }


  /**
  * Modify the color of a given pixel.
  * @param {Object} position - 2D position in form {x, y}
  * @param {Array} color - color, must have the same numb of components per pix than the image
  */
  setPixel( position, color ){
    var ncpp = this.getMetadata("ncpp");

    if("x" in position && position.x >=0 && position.x < this.getMetadata("width") &&
       "y" in position && position.y >=0 && position.y < this.getMetadata("height") &&
       color.length == ncpp)
    {

      var pos1D = this.get1dIndexFrom2dPosition( position ) * ncpp;

      for(var i=0; i<ncpp; i++){
        this._data[ pos1D + i] = color[i];
      }

    }else{
      console.error("x and y position have to be within the image dimensions and color size must be the same as the original image.");
    }
  }


  /**
  * @param {Object} position - 2D positoin like {x, y}
  * @return {Array} the color of the given pixel.
  */
  getPixel( position ){
    if("x" in position && position.x >=0 && position.x < this.getMetadata("width") &&
       "y" in position && position.y >=0 && position.y < this.getMetadata("height"))
    {
      var pos1D = this.get1dIndexFrom2dPosition( position ) * this.getMetadata("ncpp");
      var color = this._data.slice(pos1D, pos1D + this.getMetadata("ncpp"));
      return color;

    }else{
      console.warn("The requested position is outside the image.");
      return null;
    }
  }


  /**
  * @return {Number} the width of the Image2D
  */
  getWidth(){
    return this.getMetadata("width");
  }


  /**
  * @return {Number} the height of the Image2D
  */
  getHeight(){
    return this.getMetadata("height");
  }


  /**
  * @return {Number} the number of components per pixel
  */
  getComponentsPerPixel(){
    return this.getMetadata("ncpp");
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
      x: i % this.getMetadata("width"),
      y: Math.floor(i / this.getMetadata("width"))
    }
  }


  /**
  * Compute the 1D index within the data buffer from a 2D position {x, y}.
  * This has nothing to do with the number of components per pixel.
  * @param {Object} position - 2D coord like {x, y}
  * @return {Number} the 1D position within the buffer
  */
  get1dIndexFrom2dPosition( position ){
    return (position.x + position.y*this.getMetadata("width"));
  }




  // TODO: warn the pipeline if metadata changed or pixel value changed
  // --> do NOT update the pipeline at every modif because if we change a lot
  //     of pixel values... (wait to call update() on the pipeline.)


} /* END of class Image2D */

export { Image2D }
