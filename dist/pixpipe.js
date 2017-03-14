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

    // Metadata can be anything, a name, an ID, a description, a DOM element.
    // everything that is not an input but rather a setting
    this._metadata = {};

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
  * Set a metadata using a pair of key and value.
  * @param {String} key - the ID of the metadata
  * @param {Object} value - can be a string, Number or Object
  */
  setMetadata( key, value ){
    if(typeof key === 'string' || key instanceof String){
      this._metadata[ key ] = value;
    }else{
      console.warn("The given key must be a String Object.");
    }

  }


  /**
  * Retrieve a metadata using a key.
  * @param {String} key - the ID of the metadata
  * @return {Object} the metadata object - or null if non existent
  */
  getMetadata( key ){
    if( key in this._metadata){
      return this._metadata[ key ];
    }else{
      console.warn("The metadata with key: " + key + " doe not exist.");
      return null;
    }
  }




}

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

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
class Filter$1 extends PixpipeObject {

  constructor(){
    super();
    this._type = Filter$1.TYPE();

    // a bunch of event to be defined. Empty by default.
    this._events = {};

    this._inputValidator = {};

    this._input = {
      //"0": []
    };

    this._output = {
      //"0" : []
    };

    // pipeline associated with this filter. Not mandatory.
    this._pipeline = null;
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

    // add the pipeline object if defined
    if( this._pipeline ){
      inputObject.setPipeline( this._pipeline );
    }
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
  * Workaround to
  */
  _setOutput2( dataType, category=0 ){
    var outputObject = null;

    console.log(this._output);

    // the category may not exist, we create it
    if( !(category in this._output) ){
      var outputObject = new dataType();
      this._output[category] = outputObject;
      console.log("hello");
    }else{
      outputObject = this._output[category];
      console.log("hello2");
    }

    return outputObject;
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

    if(!valid){
      console.warn("The input is not valid.");
    }

    return valid;
  }


  /**
  * Check if all input image have the same size.
  * @return {Boolean} true is same size, false if not.
  */
  hasSameSizeInput(){
    var that = this;
    var inputCategories = Object.keys( this._inputValidator );
    var sameSize = true;

    var widths = [];
    var heights = [];

    inputCategories.forEach( function(key){
      widths.push( that._getInput( key ).getWidth() );
      heights.push( that._getInput( key ).getHeight() );
    });

    // if all input have the same size
    if(widths.length){
      widths.sort();
      heights.sort();
      sameSize = (widths[ 0 ] == widths[ widths.length -1 ] ) &&
                 (heights[ 0 ] == heights[ heights.length -1 ] );

      if( !sameSize ){
        console.warn("Input image do not all have the same size. Filter not valid");
      }
    }

    return sameSize;
  }


  /**
  * MUST be implemented by the class that inherit this.
  * Launch the process.
  */
  update(){
    console.error("The update() method has not been written, this filter is not valid.");
  }


  /**
  * Defines a callback. By defautl, no callback is called.
  */
  on(eventId, callback){
    this._events[ eventId ] = callback;
  }


  /**
  * Associate a Pipeline instance to this filter. Not supposed to be called manually
  * because it is automatically called-back when adding a filter to a pipeline.
  * @param {Pipeline} p - Pipeline object.
  */
  setPipeline( p ){
    // only if not already set.
    if(!this._pipeline){
      this._pipeline = p;

      // set the pipeline to all input so that they can update the entire
      // pipeline in case of modification
      var inputCategories = Object.keys( this._inputValidator );
      inputCategories.forEach( function(key){
        widths.push( that._getInput( key ).setPipeline( p ) );
      });

    }
  }


  /**
  * Update the whole pipeline due to an update in the filter
  * (new input, new metadata)
  */
  _updatePipeline(){
    if(this._pipeline){
      this._pipeline.update();
    }
  }


  /**
  * @param {String} uuid - uuid to look for
  * @return {Boolean} true if this filter uses an input with such uuid
  */
  hasInputWithUuid( uuid ){
    var found = false;

    var inputCategories = Object.keys( this._inputValidator );
    inputCategories.forEach( function(key){
      found = found | that._getInput( key ).setPipeline( p ) ;
    });

    return found;
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
    this._componentsPerPixel = 4; // RGBA, by default

    // pipeline associated with this image. Not mandatory.
    this._pipeline = null;

    // allocate the array if size is specified
    if(options && "width" in options && "height" in options){

      if( options.width > 0 && options.height > 0){
        this._width = options.width;
        this._height = options.height;

        if("color" in options){
          this._componentsPerPixel = options.color.length;
        }

        this._data = new Float32Array( this._width * this._height * this._componentsPerPixel );

        // init with the given color
        if("color" in options){
          var color = options.color;
          for(var i=0; i<this._data.length; i++){
            this._data[i] = color[i%this._componentsPerPixel];
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
    cpImg.setData( this._data, this._width, this._height );
    return cpImg;
  }


  /**
  *  Set the data to this Image2D.
  * @param {Float32Array} array - 1D array of raw data stored as RGBARGBA...
  * @param {Number} width - width of the Image2D
  * @param {Number} height - height of the Image2D
  * @param {Number} ncpp - number of components per pixel (default: 4)
}
  */
  setData( array, width, height, ncpp=4 ){
    /*
    // do not allow to set a new internal array
    if( this._data ){
      console.warn("Data can be set to an Image2D object only once. Cannot init the Image2D.");
      return;
    }
    */

    this._componentsPerPixel = ncpp;

    if( array.length != width*height*this._componentsPerPixel){
      console.warn("The array size does not match the width and height. Cannot init the Image2D.");
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
       color.length == this._componentsPerPixel)
    {

      var pos1D = this.get1dIndexFrom2dPosition( position );

      for(var i=0; i<this._componentsPerPixel; i++){
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
      var color = this._data.slice(pos1D, pos1D + this._componentsPerPixel);
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


  /**
  * Associate a Pipeline instance to this image. Not supposed to be called manually
  * because it is automatically called-back when adding a filter to a pipeline.
  * @param {Pipeline} p - Pipeline object.
  */
  setPipeline( p ){
    // only if not already set.
    if(!this._pipeline){
      this._pipeline = p;
    }
  }

  // TODO: warn the pipeline if metadata changed or pixel value changed
  // --> do NOT update the pipeline at every modif because if we change a lot
  //     of pixel values... (wait to call update() on the pipeline.)


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
class ImageToImageFilter extends Filter$1 {

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
  */
  _forEachPixelOfSuch(firstPixel, lastPixel, increment ){
    // abort if no callback per pixel
    if( ! "pixel" in this._events){
      console.warn("No function to apply per pixel was specified.");
      return;
    }

    var inputImage2D = this._getInput();
    var inputBuffer = this._inputBuffer;
    var componentPerPixel = inputImage2D.getComponentsPerPixel();

    var currentColor = null;

    for(var p=firstPixel; p<lastPixel; p+=increment ){
      var firstCompoPos1D = p * componentPerPixel;
      var position2D = inputImage2D.get2dPositionFrom1dIndex(p);
      currentColor = inputBuffer.slice(firstCompoPos1D, firstCompoPos1D + componentPerPixel);

      var newColor = this._events.pixel( position2D, currentColor);

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
* The metadata "parentDivID" has to be set using `setMetadata("parentDivID", "whatever")`
* The metadata "alpha", if true, enable transparency. Default: false.
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
class CanvasImageWriter extends Filter$1{

  /**
  * @param {String} parentDivID - dom id of the future canvas' parent.
  * (most likely the ID of a div)
  */
  constructor(){
    // call Filter constructor
    super();

    this._inputValidator[ 0 ] = Image2D.TYPE();
    this.setMetadata("alpha", false);

    // so that we can flush the content
    this._canvas = null;
    this._ctx = null;
  }


  /**
  * [PRIVATE]
  * Initialize a new canvas object
  */
  _init(){

    var parentElem = document.getElementById( this.getMetadata("parentDivID") );
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

    document.getElementById(this.getMetadata("parentDivID")).appendChild(this._canvas);
  }


  /**
  * Overwrite the generic (empty) method.
  */
  update(){

    // abort if invalid input
    if(!this.hasValidInput() )
      return;

    var image = this._input[0];
    var ncppSrc = image.getComponentsPerPixel();

    // only Image2d with 1 or 4 bands can be displayed
    if( ncppSrc != 1 && ncppSrc != 4){
      console.warn("Cannot write Image in canvas if contains other than 1 or 4 bands.");
      return;
    }

    if(!this.getMetadata("parentDivID")){
      console.error("The parent DIV ID to place the canvas element was not specified. Unable to display anything.");
      return;
    }

    // build a new canvas
    this._init();
    var useAlphaBand = this.getMetadata("alpha");

    // resizing the canvas
    this._canvas.width = image.getWidth();
    this._canvas.height = image.getHeight();

    var canvasImageData = this._ctx.getImageData(0, 0, this._canvas.width, this._canvas.height);
    var canvasImageDataArray = canvasImageData.data;

    // getting Image object data
    var originalImageDataArray = image.getData();

    if(ncppSrc == 4){
      // copying the data into the canvas array (clamped uint8)
      originalImageDataArray.forEach( function(value, index){
        if(!useAlphaBand && index%4 == 3){
          canvasImageDataArray[index] = 255;
        }else{
          canvasImageDataArray[index] = value;
        }
      });

    }else if(ncppSrc == 1){
      originalImageDataArray.forEach( function(value, index){
        canvasImageDataArray[index*4] = value;
        canvasImageDataArray[index*4 + 1] = value;
        canvasImageDataArray[index*4 + 2] = value;
        canvasImageDataArray[index*4 + 3] = 255;
      });

    }





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
* callback defined by the event .on("imageLoaded", function(){ ... }).
*
* Usage: examples/urlToImage2D.html
*
* @example
* var url2ImgFilter = new pixpipe.UrlImageReader( ... );
* url2ImgFilter.addInput( "images/sd.jpg" );
* url2ImgFilter.update();
*/
class UrlImageReader extends Filter$1 {

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

        if("imageLoaded" in that._events){
          that._events.imageLoaded( that );
        }
      }catch(e){
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
* callback defined by the event .on("imageLoaded", function(){ ... }).
*
*
*
* Usage: examples/fileToImage2D.html
*
* @example
* var file2ImgFilter = new pixpipe.file2ImgFilter( ... );
* file2ImgFilter.addInput( fileInput.files[0] );
* file2ImgFilter.update();
*/
class FileImageReader extends Filter$1 {

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

      if("imageLoaded" in that._events){
        that._events.imageLoaded( that );
      }
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
* A filter of type ForEachPixelImageFilter can perform a operation on evey pixel
* of an Image2D with a simple interface. For this purpose, a per-pixel-callback
* must be specified using method
* .on( "pixel" , function( coord, color ){ ... })
* where coord is of form {x, y} and color is of form [r, g, b, a] (with possibly)
* a different number of components per pixel.
* This callback must return, or null (original color not modified),
* or a array of color (same dimension as the one in arguments).
*
* Usage: examples/forEachPixel.html
*
* @example
* var forEachPixelFilter = new pixpipe.ForEachPixelImageFilter();
* forEachPixelFilter.on( "pixel", function(position, color){
*
*     return [
*       color[1], // red (takes the values from green)
*       color[0], // green (takes the values from red)
*       color[2] * 0.5, // blue get 50% darker
*       255 // alpha, at max
*     ]
*
*   }
* );
*
*/
class ForEachPixelImageFilter extends PixelWiseImageFilter {

  constructor(){
    super();
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

    this._forEachPixelOfSuch(firstPixel, lastPixel, increment );

    // TODO : find a way NOT to replace the ouput pointer so that the following
    // filter can use the same object when refreshed by the pipeline
    /*
    // maybe using this kind of thing:
    var anObjType = Image2D;
    var im = new anObjType();
    console.log(im);
    */

    /*
    // building the output
    var img2D = new Image2D();
    img2D.setData( this._inputBuffer, inputImage2D.getWidth(), inputImage2D.getHeight(), inputImage2D.getComponentsPerPixel());
    this._setOutput( img2D );
    */

    var outputImg = this._setOutput2( Image2D );
    console.log(outputImg);
    outputImg.setData(
      this._inputBuffer,
      inputImage2D.getWidth(),
      inputImage2D.getHeight(),
      inputImage2D.getComponentsPerPixel()
    );

  }

} /* END class ForEachPixelImageFilter */

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

/**
* Multiply an image by the other, like a scaling function.
* The image requires two inputs named "0" and "1".
* Simply use `addInput( myImg1, "0" )`
* and `addInput( myImg2, "1" )`. The input "0" can have 1 or more bands while
* the input "1" can have only one band since the same scale is apply to each band.
*
* usage: examples/forEachPixelGadient.html
*/
class SpectralScaleImageFilter extends ImageToImageFilter {

  constructor(){
    super();

    // both input are images.
    this._inputValidator[ 0 ] = Image2D.TYPE();
    this._inputValidator[ 1 ] = Image2D.TYPE();
  }


  /**
  * Run the filter
  */
  update(){
    // filter must have valid input of the same size
    if( !this.hasSameSizeInput() || !this.hasValidInput()){
      return;
    }

    var dataImg0 = this._getInput(0);
    var dataImg1 = this._getInput(1);

    // the input "1" (aka. the scaling data) must be single band
    if( dataImg1.getComponentsPerPixel() != 1 ){
      console.warn("The scaling image must have one single band.");
      return;
    }

    var nbOfPixels = dataImg0.getWidth() * dataImg0.getHeight();
    var ncpp = dataImg0.getComponentsPerPixel();

    var data0 = dataImg0.getDataCopy();
    var data1 = dataImg1.getData();

    // scale the spectral info
    for(var p=0; p<nbOfPixels; p++){
      for(var b=0; b<ncpp; b++){
        data0[ p*ncpp + b ] *=  data1[p];
      }
    }

    // building the output
    var img2D = new Image2D();
    img2D.setData( data0, dataImg0.getWidth(), dataImg0.getHeight());
    this._setOutput( img2D );

  }


} /* END class SpectralScaleImageFilter */

//export { SpatialConvolutionFilter } from './filter/SpatialConvolutionFilter.js';
//export { ImageBlendExpressionFilter } from './filter/ImageBlendExpressionFilter.js';


// filters - processing of Image3D

exports.PixpipeObject = PixpipeObject;
exports.Filter = Filter$1;
exports.Image2D = Image2D;
exports.ImageToImageFilter = ImageToImageFilter;
exports.PixelWiseImageFilter = PixelWiseImageFilter;
exports.CanvasImageWriter = CanvasImageWriter;
exports.UrlImageReader = UrlImageReader;
exports.FileImageReader = FileImageReader;
exports.ForEachPixelImageFilter = ForEachPixelImageFilter;
exports.SpectralScaleImageFilter = SpectralScaleImageFilter;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=pixpipe.js.map
