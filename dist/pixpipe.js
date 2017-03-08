(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.pixpipe = global.pixpipe || {})));
}(this, (function (exports) { 'use strict';

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

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

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

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

    this._inputValidator = {};

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
  * @param {Image2D} inputObject - most likely an instance of Image2D but can also be HTML5 File or Image3D
  * @param {Number} category - in case we want to get data from diferent categories.
  */
  addInput( inputObject, category=0){

    if(category < 0 ){
      console.warn("A input cannot be of category inferior to zero");
      return;
    }

    // the category may not exist, we create it
    if( !(category in this._input) ){
      this._input[category] = null;
    }

    this._input[category] = inputObject ;
  }


  /**
  * Return outputs from a category (default category: 0)
  * @param {Number} category - a category of output.
  * @return {Object} or null if no output can be returned.
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
  * @param {Image2D} imageObject - instance of an image
  * @param {Number} category - in case we want to get data from different categories.
  */
  _setOutput( data, category=0 ){
    // the category may not exist, we create it
    if( !(category in this._output) ){
      this._output[category] = null;
    }

    this._output[category] = data ;
  }


  /**
  * [PRIVATE]
  * should noly be used by the class that inherit Filter.
  * @param {Number} category - in case we want to get data from different categories.
  * @return {Object} or null if no input can be returned
  */
  _getInput( category=0 ){
    if( category in this._input ){
      return this._input[ category ];
    }else{
      return null;
    }
  }


  /**
  * Validate the input data using a model defined in _inputValidator.
  * Every class that implement Filter must implement their own _inputValidator.
  * Not mandatory to use, still a good practice.
  */
  hasValidInput(){
    var that = this;
    var inputCategories = Object.keys( this._inputValidator );

    var valid = true;

    inputCategories.forEach( function(key){
      valid = valid && that._getInput( key ).isOfType( that._inputValidator[ key ] );
    });

    return valid;
  }


  /**
  * MUST be implemented by the class that inherit this.
  * Launch the process.
  */
  update(){
    console.error("The update() method has not been written, this filter is not valid.");
  }


} /* END class Filter */

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

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

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

/**
* ImageToImageFilter is not to be used as-is but rather as a base class for any
* filter that input a single Image2D and output a single Image2D.
* This class does not overload the update() method.
*/
class ImageToImageFilter extends Filter {

  constructor(){
    super();
    this._inputValidator[ 0 ] = Image2D.TYPE();

    // will be a copy of the input Image2D buffer
    this._inputBuffer = null;
  }

} /* END class ImageToImageFilter */

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

/**
* PixelWiseImageFilter is not supposed to be use as is and is just to
* be inherited by other filters.
* This class does not overload the update() method.
*/
class PixelWiseImageFilter extends ImageToImageFilter{

  constructor(){
    super();

  }


  /**
  * [PRIVATE]
  * generic function for painting row, colum or whole
  * @param {Number} firstPixel - Index of the first pixel in 1D array
  * @param {Number} lastPixel - Index of the last pixel in 1D array
  * @param {Number} increment - jump gap from a pixel to another (in a 1D style)
  * @param {function} cb - callback of what to do for each pixel to be processed. Called with 2 args: 2D position {x, y} and color {r, g, b, a}
  */
  _forEachPixelOfSuch(firstPixel, lastPixel, increment, cb ){
    var inputImage2D = this._getInput();
    var inputBuffer = this._inputBuffer;
    var componentPerPixel = inputImage2D.getComponentsPerPixel();

    var currentColor = null;

    for(var p=firstPixel; p<lastPixel; p+=increment ){
      var firstCompoPos1D = p * componentPerPixel;
      var position2D = inputImage2D.get2dPositionFrom1dIndex(p);
      currentColor = inputBuffer.slice(firstCompoPos1D, firstCompoPos1D + componentPerPixel);

      var newColor = cb( position2D, currentColor);

      if(newColor && newColor.length == componentPerPixel){
        for(var i=0; i<componentPerPixel; i++){
          inputBuffer[firstCompoPos1D + i] = newColor[i];
        }
      }

    }
  }


} /* END of class PixelWiseImageFilter */

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

/**
* CanvasImageWriter is a filter to output an instance of Image into a
* HTML5 canvas element.
* usage: examples/imageToCanvasFilter.html
*
* @example
// create an image
* var myImage = new pixpipe.Image2D({width: 100, height: 250, color: [255, 128, 64, 255]})
*
* // create a filter to write the image into a canvas
* var imageToCanvasFilter = new pixpipe.CanvasImageWriter( "myDiv" );
* imageToCanvasFilter.addInput( myImage );
* imageToCanvasFilter.update();
*/
class CanvasImageWriter extends Filter{

  /**
  * @param {String} idOfParent - dom id of the future canvas' parent.
  * (most likely the ID of a div)
  */
  constructor( idOfParent){
    // call Filter constructor
    super();

    this._inputValidator[ 0 ] = Image2D.TYPE();

    // so that we can flush the content
    this._parentId = idOfParent;
    this._canvas = null;
    this._ctx = null;
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

    // abort if invalid input
    if(!this.hasValidInput())
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

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

/**
* An instance of UrlImageReader takes an image URL as input and
* returns an Image2D as output. Use the regular `addInput()` and `getOuput()`
* with no argument for that.
* Reading a file from URL takes an AJAX request, which is asynchronous. For this
* reason, what happens next, once the Image2D is created must take place in the
* callback defined in the constructor.
*
* Usage: examples/urlToImage2D.html
*
* @example
* var url2ImgFilter = new pixpipe.UrlImageReader( ... );
* url2ImgFilter.addInput( "images/sd.jpg" );
* url2ImgFilter.update();
*/
class UrlImageReader extends Filter {

  /**
  * @param {function} callback - function to call when the image is loaded.
  * The _this_ object will be in argument of this callback.
  */
  constructor( callback ){
    super();

    this._onReadCallback = callback;
  }


  /**
  * Run the reading
  */
  update(){
    var that = this;

    var img = new Image();
    img.src = this._getInput();

    img.onload = function() {
      var tmpCanvas = document.createElement("canvas");
      tmpCanvas.width = img.width;
      tmpCanvas.height = img.height;
      var canvasContext = tmpCanvas.getContext('2d');
      canvasContext.drawImage(img, 0, 0);

      try{

        var imageData = canvasContext.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height);
        var dataArray = imageData.data;
        var img2D = new Image2D();
        img2D.setData( dataArray, img.width, img.height);
        that._setOutput( img2D );

        that._onReadCallback && that._onReadCallback( that );
      }catch(e){
        //console.error("The server of the specified image URL does not allow Cross Origin data access. Pixpipe cannot create an Image2D object.");

        console.error(e);
      }

    };


  }


} /* END of class UrlImageReader */

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

/**
* An instance of FileImageReader takes a HTML5 File object as input and
* returns an Image2D as output. The point is mainly to use it with a file dialog.
* Use the regular `addInput()` and `getOuput()` with no argument for that.
* Reading a local file is an asynchronous process. For this
* reason, what happens next, once the Image2D is created must take place in the
* callback defined in the constructor.
*
* Usage: examples/fileToImage2D.html
*
* @example
* var file2ImgFilter = new pixpipe.file2ImgFilter( ... );
* file2ImgFilter.addInput( fileInput.files[0] );
* file2ImgFilter.update();
*/
class FileImageReader extends Filter {

  /**
  * @param {function} callback - function to call when the image is loaded.
  * The _this_ object will be in argument of this callback.
  */
  constructor( callback){
    super();

    this._allowedTypes = /image.*/;
    this._onReadCallback = callback;
  }


  /**
  * Overload the default method because HTML5 File is not a Pixpipe type
  */
  hasValidInput(){
    var valid = false;
    var file = this._getInput();

    if (file && file.type.match( this._allowedTypes )) {
      this._isInputValid = true;
    }else{
      console.error("The file must be an image (jpg/png). The type " + file.type + " is not compatible with FileImageReader.");
    }

    return valid;
  }


  /**
  * Run the reading
  */
  update(){

    if(! this.hasValidInput)
      return

    var that = this;
    var file = this._getInput();
		var reader = new FileReader();

		reader.onload = function(e) {

			var img = new Image();
			img.src = reader.result;
      var tmpCanvas = document.createElement("canvas");
      tmpCanvas.width = img.width;
      tmpCanvas.height = img.height;
      var canvasContext = tmpCanvas.getContext('2d');
      canvasContext.drawImage(img, 0, 0);
      var imageData = canvasContext.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height);
      var dataArray = imageData.data;

      var img2D = new Image2D();
      img2D.setData( dataArray, img.width, img.height);
      console.log(img2D);
      that._setOutput( img2D );

      that._onReadCallback && that._onReadCallback( that );
		};

		reader.readAsDataURL( file );
  }



} /* END of class UrlImageReader */

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

/**
*
*/
class ForEachPixelImageFilter extends PixelWiseImageFilter {

  /**
  * @param {function} cb - callback of what to do for each pixel
  */
  constructor( cb = null ){
    super();
    this._perPixelCallback = cb;
  }


  /**
  * Run the filter
  */
  update(){
    if( ! this.hasValidInput())
      return;

    var inputImage2D = this._getInput();
    var firstPixel = 0;
    var lastPixel = inputImage2D.getWidth() * inputImage2D.getHeight();
    var increment = 1;

    this._inputBuffer = inputImage2D.getDataCopy();

    this._forEachPixelOfSuch(firstPixel, lastPixel, increment, this._perPixelCallback );

    // building the output
    var img2D = new Image2D();
    img2D.setData( this._inputBuffer, inputImage2D.getWidth(), inputImage2D.getHeight());
    this._setOutput( img2D );
  }

} /* END class ForEachPixelImageFilter */

// filters - processing of Image3D

exports.PixpipeObject = PixpipeObject;
exports.Filter = Filter;
exports.Image2D = Image2D;
exports.ImageToImageFilter = ImageToImageFilter;
exports.PixelWiseImageFilter = PixelWiseImageFilter;
exports.CanvasImageWriter = CanvasImageWriter;
exports.UrlImageReader = UrlImageReader;
exports.FileImageReader = FileImageReader;
exports.ForEachPixelImageFilter = ForEachPixelImageFilter;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=pixpipe.js.map
