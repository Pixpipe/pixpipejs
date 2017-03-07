(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.pixpipe = global.pixpipe || {})));
}(this, (function (exports) { 'use strict';

/**
* PixpipeObject is the base object of all. It creates a uuid and has few
* generic attributes like type, name and description. Not all these attributes
* always useful;
*/
class PixpipeObject {

  constructor(){
    // unique identifier
    this._uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    });

    this._name = null;
    this._description = null;
    this._type = PixpipeObject.TYPE();
  }


  /**
  * Acces it like a static attribute.
  * Must be overloaded.
  */
  static TYPE(){
    return "GENERIC";
  }


  /**
  * Compare a give type to the type of this object.
  * @param {String} t - a type, better to call the static method of each object, like Image.TYPE()
  */
  isOfType( t ){
    return !(this._type.localeCompare(t))
  }


  /**
  * Get type of object.
  * @return {String} the type
  */
  getType(){
    this._type;
  }

  /**
  * Return a copy of the uuid
  */
  get uuid(){
    return this._uuid.slice();
  }


  /**
  * Setter fo the name.
  * @param {String} n - name
  */
  setName( n ){
    this._name = n;
  }


  /**
  * Getter for the name
  * @return {String} name
  */
  getName(){
    return this._name;
  }


  /**
  * Setter fo the description.
  * @param {String} d - description
  */
  setDescription( d ){
    this._description = d;
  }


  /**
  * Getter for the description
  * @return {String} description
  */
  getDescription(){
    return this._description;
  }


}

/**
* Filter is a base class and must be inherited to be used properly.
* A filter takes one or more Image instances as input and returns one or more
* instances of images as output.
* Every filter has a addInput(), a getOutput() and a update() methods.
* Every input and output can be arranged by category, so that internaly, a filter
* can use and output diferent kind of data.
*/
class Filter extends PixpipeObject {

  constructor(){
    super();
    this._type = Filter.TYPE();

    this._isInputValid = false;

    this._input = {
      "0": []
    };

    this._output = {
      "0" : []
    };

  }


  /**
  * Hardcode the datatype
  */
  static TYPE(){
    return "FILTER";
  }

  /**
  * Set an input, potentially associated to a category.
  * @param {Image} imageObject - instance of an image
  * @param {Number} category - in case we want to get data from diferent categories.
  */
  addInput( imageObject, category=0){

    if(category < 0 ){
      console.warn("A input cannot be of category inferior to zero");
      return;
    }

    // the category may not exist, we create it
    if( !(category in this._input) ){
      this._input[category] = null;
    }

    this._input[category] = imageObject ;
  }


  /**
  * Return outputs from a category (default category: 0)
  * @param {Number} category - a category of output.
  */
  getOutput( category=0 ){
    if( category in this._output ){
      return this._output[ category ];
    }else{
      return null;
    }

  }


  /**
  * [PRIVATE]
  * should noly be used by the class that inherit Filter.
  * This is just a wraper to not access the raw _output object.
  * @param {Image} imageObject - instance of an image
  * @param {Number} category - in case we want to get data from diferent categories.
  */
  _setOutput( data, category=0 ){
    // the category may not exist, we create it
    if( !(category in this._output) ){
      this._output[category] = null;
    }

    this._output[category] = data ;
  }

  /**
  * MUST be implemented by the class that inherit this.
  * MUST change the value of this._isInputValid
  */
  validateInput(){
    console.warn("The update() method has not been written, input integrity are not checked.");
  }


  /**
  * MUST be implemented by the class that inherit this.
  * Launch the process.
  */
  update(){
    console.error("The update() method has not been written, this filter is not valid.");
  }


} /* END class Filter */

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
    cpImg.setData( this._data.slice(), this._width, this._height );
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

} /* END of class Image2D */

/**
* CanvasImageWriter is a filter to output an instance of Image into a
* HTML5 canvas element.
* See examples/imageToCanvasFilter.html to see how it works.
*/


class CanvasImageWriter extends Filter{

  /**
  * @param {String} idOfParent - dom id of the future canvas' parent.
  * (most likely the ID of a div)
  */
  constructor( idOfParent){
    // call Filter constructor
    super();

    // so that we can flush the content
    this._parentId = idOfParent;
    this._canvas = null;
    this._ctx = null;
  }


  /**
  * Overloaded validation method.
  */
  validateInput(){

    try{
      this._isInputValid = this._input[0].isOfType( Image2D.TYPE() );
    }catch(e){
      this._isInputValid = false;
      console.error("The input is not valid");
    }

  }


  /**
  * [PRIVATE]
  * Initialize a new canvas object
  */
  _init(){
    var parentElem = document.getElementById(this._parentId);
    while (parentElem.firstChild) {
        parentElem.removeChild(parentElem.firstChild);
    }

    // creating a canvas element
    this._canvas = document.createElement("canvas");
    this._canvas.style = "image-rendering: pixelated;";
    this._ctx = this._canvas.getContext('2d');

    // not sure this is useful since the style is "pixelated"
    // (does not seem to well super well with Firefox)
    this._ctx.imageSmoothingEnabled = true;
    this._ctx.mozImageSmoothingEnabled = false;
    this._ctx.webkitImageSmoothingEnabled = false;
    this._ctx.ctxmsImageSmoothingEnabled = false;

    document.getElementById(this._parentId).appendChild(this._canvas);
  }


  /**
  * Overwrite the generic (empty) method.
  */
  update(){
    this.validateInput();

    // abort if invalid input
    if(!this._isInputValid)
      return;

    // build a new canvas
    this._init();

    var image = this._input[0];

    // resizing the canvas
    this._canvas.width = image.getWidth();
    this._canvas.height = image.getHeight();

    var canvasImageData = this._ctx.getImageData(0, 0, this._canvas.width, this._canvas.height);
    var canvasImageDataArray = canvasImageData.data;

    // getting Image object data
    var originalImageDataArray = image.getData();

    // copying the data into the canvas array (clamped uint8)
    originalImageDataArray.forEach( function(value, index){
      canvasImageDataArray[index] = value;
    });
    this._ctx.putImageData(canvasImageData, 0, 0);



  }

}

/**
*
*/


class UrlImageReader extends Filter {

  /**
  * @param {String} url - path of the image to be loaded
  * @param {function} callback - function to call when the image is loaded.
  * The _this_ object will be in argument of this callback.
  */
  constructor( url, callback){
    super();
    
    this._imageUrl = url;
    this._onReadCallback = callback;
  }


  update(){
    var that = this;

    var img = new Image();
    img.src = this._imageUrl;

    img.onload = function() {
      var tmpCanvas = document.createElement("canvas");
      tmpCanvas.width = img.width;
      tmpCanvas.height = img.height;
      var canvasContext = tmpCanvas.getContext('2d');
      canvasContext.drawImage(img, 0, 0);

      //try{
        var imageData = canvasContext.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height);
        var dataArray = imageData.data;
        var img2D = new Image2D();
        img2D.setData( dataArray, img.width, img.height);
        console.log(img2D);

        that._setOutput( img2D );

        that._onReadCallback && that._onReadCallback( that );
      /*}catch(e){
        console.error("The server of the specified image URL does not allow Cross Origin data access. Pixpipe cannot create an Image2D object.");

        console.error(e);
      }*/

    };


  }


} /* END of class UrlImageReader */

exports.PixpipeObject = PixpipeObject;
exports.Filter = Filter;
exports.Image2D = Image2D;
exports.CanvasImageWriter = CanvasImageWriter;
exports.UrlImageReader = UrlImageReader;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=pixpipe.js.map
