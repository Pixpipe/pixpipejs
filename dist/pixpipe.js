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

    this._pipeline = null;

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


  /**
  * Check if the metadata with the given key exists.
  * @param {String} key - the key to look up in the metadata collection
  * @return {Boolean} true if the metadata with the given is present, false if not.
  */
  hasMetadata( key ){
    return (key in this._metadata);
  }


  /**
  * @return {Array} of Strings where each is a key of an existing metadata record
  */
  getMetadataKeys(){
    return Object.keys( this._metadata );
  }


}

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

class PipelineElement extends PixpipeObject {

  constructor(){
    super();

    this._pipeline = null;
    this._type = PipelineElement.TYPE();
  }


  /**
  * Acces it like a static attribute.
  * Must be overloaded.
  */
  static TYPE(){
    return "PIPELINE_ELEMENT";
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


} /* ENDS class PipelineElement */

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

/**
* A Pipeline instance handles a cascade of filter when an input dataset is updated.
* Using a Pipeline object is not mandatory and can be replaced by calling  `update()`.
*/
class Pipeline extends PixpipeObject {

  constructor(){
    super();
    this._type = Pipeline.TYPE();

    // a list of filters
    this._filters = [];

    this._isUpdated = false;
  }


  /**
  * Hardcode the datatype
  */
  static TYPE(){
    return "PIPELINE";
  }


  /**
  * Add a filter to the pipeline.
  *
  */
  addFilter( f ){
    this._filters.push( f );
    console.log("Filter " +  f.constructor.name + " added to the pipeline.");
  }


  /**
  *
  */
  update(forceAll = true){

    if( forceAll ){
      this._forceUpdateAll();
    }else{

    }

    this._isUpdated = true;
  }


  /**
  * Run an update on every single filter
  */
  _forceUpdateAll(){
    console.log(this._filters);
    for(var f=0; f<this._filters.length; f++){
      // if output of filter is not ready, then when have to run this filter
      if( ! this._filters[f].hasOutputReady() ){
        this._filters[f].update();
        this._filters[f].setOutputAsReady();
      }
    }
  }


  /**
  * Update only starting from the step that was modified since the last update
  */
  _updateSmart(){

  }


} /* END of class Pipeline */

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

//import { Pipeline } from './Pipeline.js';


/**
* Filter is a base class and must be inherited to be used properly.
* A filter takes one or more Image instances as input and returns one or more
* instances of images as output.
* Every filter has a addInput(), a getOutput() and a update() methods.
* Every input and output can be arranged by category, so that internaly, a filter
* can use and output diferent kind of data.
*
* usage: examples/fileToArrayBuffer.html
*
*/
class Filter extends PipelineElement {

  constructor(){
    super();
    this._type = Filter.TYPE();

    // a bunch of event to be defined. Empty by default.
    this._events = {};

    this._inputValidator = {};

    this._input = {
      //"0": []
    };

    this._output = {
      //"0" : []
    };

    // to leasure time. The 2 default values are added by _beforeRun and _afterRun
    // under the name of "begin" and "end"
    this._timer = {};

    this._isOutputReady = false;

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

    // the category may not exist, we create it
    if( !(category in this._input) ){
      this._input[category] = null;
    }

    this._input[category] = inputObject ;

    // add the pipeline object if defined
    if( this._pipeline ){
      inputObject.setPipeline( this._pipeline );
    }

    this._isOutputReady = false;
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
  * Perform an action for each output.
  * @param {function} cb - callback function called for evey single output
  * with 2 args: the output category and the outpub object.
  */
  forEachOutput( cb ){
    if(!cb){
      console.warn("forEachOutput requires a callback.");
      return;
    }
    var outputCategories = this.getOutputCategories();

    for(var o=0; o<outputCategories.length; o++){
      cb( outputCategories[o], this.getOutput(outputCategories[o]) );
    }
  }


  /**
  * [PRIVATE]
  * Internal way to setup an output for this filter. Acts like a singleton in a sens
  * that if an output of a given category was already Initialized, it returns it.
  * If no input was Initialized, it creates one. Then we are sure the pointer of the
  * output remain the same and does not break the pipeline.
  * @param {type} dataType - type of object, i.e. Image2D (this is NOT a String!)
  * @param {Number} category - in case we want to get data from different categories.
  * @returns {Object} of given type.
  */
  _addOutput( dataType, category=0 ){
    var outputObject = null;

    // the category may not exist, we create it
    if( !(category in this._output) ){
      var outputObject = new dataType();
      this._output[category] = outputObject;

      //console.log(this._output);
      console.log("filter " + this.constructor.name + " creates a new output.");
      /*
      if(this._pipeline){
        outputObject.setPipeline( p );
      }
      */

    }else{
      // TODO: if output object exists but is not from dataType: error!
      //outputObject = this._output[category];
      console.warn("An output of category " + category + " was already defined. Nothing to be done.");
    }

    //return outputObject;
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
  * @return {Array} all the input categories as an array of string
  */
  getInputCategories(){
    return Object.keys( this._input );
  }


  /**
  * @return {Array} all the output categories as an array of string
  */
  getOutputCategories(){
    return Object.keys( this._output );
  }

  /**
  * Same as PixpipeObject.setMetadata but add the _isOutputReady to false.
  */
  setMetadata( key, value ){
    super.setMetadata( key, value );
    this._isOutputReady = false;
  }



  hasOutputReady(){
    return this._isOutputReady;
  }


  setOutputAsReady(){
    this._isOutputReady = true;
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
  * MUST be implemented by the class that inherit this.
  * Launch the process.
  */
  update(){
    this.addTimeRecord("begin");
    this._run();
    this.addTimeRecord("end");
    console.log("Running time for filter " + this.constructor.name + ": " + this.getTime("begin", "end") + "ms.");
    this.setOutputAsReady();
  }


  /**
  *
  */
  _run(){
    console.error("The update() method has not been written, this filter is not valid.");
  }


  /**
  * Set a time measurement (from an arbitrary starting point)
  * @param {String} recordName - name of the record
  */
  addTimeRecord( recordName ){
    this._timer[ recordName ] = performance.now();
  }


  /**
  * @return {Number} the elapsed time in ms between fromRecord and toRecord.
  * Return -1 if one or both time record
  */
  getTime(fromRecord, toRecord){
    if( fromRecord in this._timer && toRecord in this._timer ){
      return Math.abs(this._timer[toRecord] - this._timer[fromRecord])
    }else{
      console.warn("The two given record name must exist in the time record table.");
      return -1;
    }
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
    /*
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
    */
    super.setPipeline( p );

    var inputCategories = Object.keys( this._input );
    inputCategories.forEach( function(key){
      that._getInput( key ).setPipeline( p );
    });


    var outputCategories = Object.keys( this._output );
    outputCategories.forEach( function(key){
      hat.getOutput( key ).setPipeline( p );
    });

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


  /**
  * @return {Number} the number of inputs
  */
  getNumberOfInputs(){
    return Object.keys( this._input ).length;
  }


  /**
  * @return {Number} the number of outputs
  */
  getNumberOfOutputs(){
    return Object.keys( this._output ).length;
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
class Image2D extends PipelineElement{


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
    //cpImg.setData( this._data, this._width, this._height );
    cpImg.setData( new Float32Array( this._data ), this._width, this._height );
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
    this._componentsPerPixel = ncpp;

    if( array.length != width*height*this._componentsPerPixel){
      console.warn("The array size does not match the width and height. Cannot init the Image2D.");
      return;
    }

    if(deepCopy){
      this._data = new Float32Array( array );
    }else{
      this._data = array;
    }

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

      var pos1D = this.get1dIndexFrom2dPosition( position ) * this._componentsPerPixel;

      for(var i=0; i<this._componentsPerPixel; i++){
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
    if("x" in position && position.x >=0 && position.x < this._width &&
       "y" in position && position.y >=0 && position.y < this._height)
    {
      var pos1D = this.get1dIndexFrom2dPosition( position ) * this._componentsPerPixel;
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


  /**
  * Check if all input image have the same size.
  * @return {Boolean} true is same size, false if not.
  */
  hasSameSizeInput(){
    var that = this;
    var inputCategories = Object.keys( this._input );
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
  * Check if all the inputs have the same number of component per pixel.
  * @return {Boolean} true if the ncpp are the same for all input image
  */
  hasSameNcppInput(){
    var inputCategories = Object.keys( this._input );

    // if no input, return false
    if(!inputCategories.length)
      return false;

    var ncpp = this._getInput( inputCategories[0] ).getComponentsPerPixel();

    for(var i=0; i<inputCategories.length; i++){
      if( ncpp != this._getInput( inputCategories[i] ).getComponentsPerPixel()){
        console.warn("Input image do not all have the same number of components per pixel. Filter not valid");
        return false;
      }
    }

    return true;
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
class CanvasImageWriter extends Filter{

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
  _run(){

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
* Usage: examples/urlToImage2D.html
*
* UrlImageReader can also load multiple images and call the "imageLoaded" event
* only when all of them are loaded.
* Usage: examples/urlToImage2D_multiple.html
*
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
    this._loadedCounter = 0;
    this._addOutput( Image2D, 0 );
  }


  /**
  * Overload the function
  */
  _run(){
    var that = this;
    var inputCategories = this.getInputCategories();

    inputCategories.forEach( function(category){
      that._addOutput( Image2D, category );
      that._loadImage( category );
    });
  }


  /**
  * [PRIVATE]
  * Loading task for a single category (aka file, in this case)
  */
  _loadImage( inputCategory ){
    var that = this;

    var img = new Image();
    img.src = this._getInput(inputCategory);

    img.onload = function() {
      var tmpCanvas = document.createElement("canvas");
      tmpCanvas.width = img.width;
      tmpCanvas.height = img.height;
      var canvasContext = tmpCanvas.getContext('2d');
      canvasContext.drawImage(img, 0, 0);

      try{
        var imageData = canvasContext.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height);
        var dataArray = imageData.data;
        var img2D = that.getOutput( inputCategory );
        img2D.setData( dataArray, img.width, img.height);

        that._loadedCounter ++;

        // call the loaded callback only when all images are loaded
        if(that._loadedCounter == that.getNumberOfInputs() && "imageLoaded" in that._events){
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
class FileImageReader extends Filter {

  constructor(){
    super();

    this._allowedTypes = /image.*/;
    this._addOutput( Image2D, 0 );
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
  _run(){

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

      var img2D = that.getOutput();
      img2D.setData( dataArray, img.width, img.height);

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
* Takes the File inputs from a <input type="file"> and reads it as a ArrayBuffer.
* Every File given in input should be added separately using `addInput( file[i], 'uniqueID' )`.
* The event "ready" must be set up ( using .on("ready", function(){}) ) and will
* be triggered when all the files given in input are translated into ArrayBuffers.
* Once ready, all the outputs are accecible using the same uniqueID with the
* method `getOutput("uniqueID")`
*
* usage: examples/fileToArrayBuffer.html
*/
class FileToArrayBufferReader extends Filter {

  constructor(){
    super();
    this._outputCounter = 0;
  }


  _run(){
    var that = this;
    this._outputCounter = 0;
    var inputCategories = this.getInputCategories();

    inputCategories.forEach( function(category){
      that._loadFile( category );
    });
  }


  /**
  * [PRIVATE]
  * Perform the loading for the input of the given category
  * @param {String} category - input category
   */
  _loadFile( category ){
    var that = this;
    var reader = new FileReader();

    reader.onloadend = function(event) {
        var result = event.target.result;
        that._output[ category ] = result;
        that._fileLoadCount();
    };

    reader.onerror = function() {
      this._output[ category ] = null;
      that._fileLoadCount();
      console.warn( "error reading file from category " + category );
      //throw new Error(error_message);
    };

    reader.readAsArrayBuffer( this._getInput(category) );
  }


  /**
  * [PRIVATE]
  * Launch the "ready" event if all files are loaded
  */
  _fileLoadCount(){
    var that = this;
    this._outputCounter ++;

    if( this._outputCounter == this.getNumberOfInputs() ){
      that._events.ready( this );
    }
  }

} /* END of class FileToArrayBufferReader */

/*
* Author    Jonathan Lurie - http://me.jonahanlurie.fr
*           Robert D. Vincent
*
* License   MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

/**
* Decode a HDF5 file, but is most likely to be restricted to the features that are
* used for Minc2 file format.
* The input "0" is an array buffer, the metadata "debug" can be set to true to
* enable a verbose mode.
*/
class Minc2Decoder extends Filter{

  constructor(){
    super();

    this.setMetadata("debug", false);

    this._type_enum = {
      INT8: 1,
      UINT8: 2,
      INT16: 3,
      UINT16: 4,
      INT32: 5,
      UINT32: 6,
      FLT: 7,
      DBL: 8,
      STR: 9
    };

    this._type_matching = [
      "int8",
      "uint8",
      "int16",
      "uint16",
      "int32",
      "uint32",
      "float32",
      "float64",
      "undef" // STR type is not compatible with minc
      // we deal rgb8 manually
    ];

    this.type_sizes = [0, 1, 1, 2, 2, 4, 4, 4, 8, 0];

    this._dv_offset = 0;
    this._align = 8;
    this._little_endian = true;
    this._continuation_queue = [];
    this._dv = null;//new DataView(abuf);
    this._superblk = {};
    this._start_offset = 0;
    this._huge_id = 0;

  }

  /**
  * [PRIVATE]
  */
  createLink() {
    var r = {};
    // internal/private
    r.hdr_offset = 0;         // offset to object header.
    r.data_offset = 0;        // offset to actual data.
    r.data_length = 0;        // length of data.
    r.n_filled = 0;           // counts elements written to array
    r.chunk_size = 0;         // size of chunks
    r.sym_btree = 0;          // offset of symbol table btree
    r.sym_lheap = 0;          // offset of symbol table local heap
    // permanent/global
    r.name = "";              // name of this group or dataset.
    r.attributes = {};        // indexed by attribute name.
    r.children = [];          // not associative for now.
    r.array = undefined;      // actual data, if dataset.
    r.type = -1;              // type of data.
    r.inflate = false;        // true if need to inflate (gzip).
    r.dims = [];              // dimension sizes.
    return r;
  }


  /**
  * [PRIVATE]
  *
  * Turns out that alignment of the messages in at least the
  * version 1 object header is actually relative to the start
  * of the header. So we update the start position of the
  * header here, so we can refer to it when calculating the
  * alignment in this.checkAlignment().
  */
  startAlignment() {
    this._start_offset = this._dv_offset;
  }


  /**
  * [PRIVATE]
  */
  checkAlignment() {
    var tmp = this._dv_offset - this._start_offset;
    if ((tmp % this._align) !== 0) {
      var n = this._align - (tmp % this._align);
      this._dv_offset += n;
      if (this.getMetadata("debug")) {
        console.log('skipping ' + n + ' bytes at ' + tmp + ' for alignmnent');
      }
    }
  }


  /**
  * [PRIVATE]
  *
  * helper functions to manipulate the current DataView offset.
  */
  skip(n_bytes) {
    this._dv_offset += n_bytes;
  }


  /**
  * [PRIVATE]
  */
  seek(new_offset) {
    this._dv_offset = new_offset;
  }


  /**
  * [PRIVATE]
  */
  tell() {
    return this._dv_offset;
  }


  /**
  * [PRIVATE]
  *
  * helper functions for access to our DataView.
  */
  getU8() {
    var v = this._dv.getUint8(this._dv_offset);
    this._dv_offset += 1;
    return v;
  }


  /**
  * [PRIVATE]
  */
  getU16() {
    var v = this._dv.getUint16(this._dv_offset, this._little_endian);
    this._dv_offset += 2;
    return v;
  }


  /**
  * [PRIVATE]
  */
  getU32() {
    var v = this._dv.getUint32(this._dv_offset, this._little_endian);
    this._dv_offset += 4;
    return v;
  }


  /**
  * [PRIVATE]
  */
  getU64() {
    var v = this._dv.getUint64(this._dv_offset, this._little_endian);
    this._dv_offset += 8;
    return v;
  }


  /**
  * [PRIVATE]
  */
  getF32() {
    var v = this._dv.getFloat32(this._dv_offset, this._little_endian);
    this._dv_offset += 4;
    return v;
  }


  /**
  * [PRIVATE]
  */
  getF64() {
    var v = this._dv.getFloat64(this._dv_offset, this._little_endian);
    this._dv_offset += 8;
    return v;
  }


  /**
  * [PRIVATE]
  */
  getOffset(offsz) {
    var v = 0;
    offsz = offsz || this._superblk.offsz;
    if (offsz === 4) {
      v = this._dv.getUint32(this._dv_offset, this._little_endian);
    } else if (offsz === 8) {
      v = this._dv.getUint64(this._dv_offset, this._little_endian);
    } else {
      throw new Error('Unsupported value for offset size ' + offsz);
    }
    this._dv_offset += offsz;
    return v;
  }


  /**
  * [PRIVATE]
  */
  getLength() {
    var v = this._dv.getUint64(this._dv_offset, this._little_endian);
    this._dv_offset += this._superblk.lensz;
    return v;
  }


  /**
  * [PRIVATE]
  */
  getString(length) {
    var r = "";
    var i;
    var c;
    for (i = 0; i < length; i += 1) {
      c = this.getU8();
      if (c === 0) {
        this._dv_offset += (length - i - 1);
        break;
      }
      r += String.fromCharCode(c);
    }
    return r;
  }


  /**
  * [PRIVATE]
  */
  getArray(typ, n_bytes, new_off) {
    var value;
    var n_values;
    var new_abuf;
    var abuf = this._getInput();
    var i;
    var spp = this._dv_offset;
    if (new_off) {
      this._dv_offset = new_off;
    }
    switch (typ) {
    case this._type_enum.INT8:
      value = new Int8Array(abuf, this._dv_offset, n_bytes);
      break;
    case this._type_enum.UINT8:
      value = new Uint8Array(abuf, this._dv_offset, n_bytes);
      break;
    case this._type_enum.INT16:
      if ((this._dv_offset % 2) !== 0) {
        new_abuf = new ArrayBuffer(n_bytes);
        n_values = n_bytes / 2;
        value = new Int16Array(new_abuf);
        for (i = 0; i < n_values; i += 1) {
          value[i] = this.getU16();
        }
      } else {
        value = new Int16Array(abuf, this._dv_offset, n_bytes / 2);
        this._dv_offset += n_bytes;
      }
      break;
    case this._type_enum.UINT16:
      if ((this._dv_offset % 2) !== 0) {
        new_abuf = new ArrayBuffer(n_bytes);
        n_values = n_bytes / 2;
        value = new Uint16Array(new_abuf);
        for (i = 0; i < n_values; i += 1) {
          value[i] = this.getU16();
        }
      } else {
        value = new Uint16Array(abuf, this._dv_offset, n_bytes / 2);
        this._dv_offset += n_bytes;
      }
      break;
    case this._type_enum.INT32:
      if ((this._dv_offset % 4) !== 0) {
        new_abuf = new ArrayBuffer(n_bytes);
        n_values = n_bytes / 4;
        value = new Int32Array(new_abuf);
        for (i = 0; i < n_values; i += 1) {
          value[i] = this.getU32();
        }
      } else {
        value = new Int32Array(abuf, this._dv_offset, n_bytes / 4);
        this._dv_offset += n_bytes;
      }
      break;
    case this._type_enum.UINT32:
      if ((this._dv_offset % 4) !== 0) {
        new_abuf = new ArrayBuffer(n_bytes);
        n_values = n_bytes / 4;
        value = new Uint32Array(new_abuf);
        for (i = 0; i < n_values; i += 1) {
          value[i] = this.getU32();
        }
      } else {
        value = new Uint32Array(abuf, this._dv_offset, n_bytes / 4);
        this._dv_offset += n_bytes;
      }
      break;
    case this._type_enum.FLT:
      if ((this._dv_offset % 4) !== 0) {
        new_abuf = new ArrayBuffer(n_bytes);
        n_values = n_bytes / 4;
        value = new Float32Array(new_abuf);
        for (i = 0; i < n_values; i += 1) {
          value[i] = this.getF32();
        }
      } else {
        value = new Float32Array(abuf, this._dv_offset, n_bytes / 4);
        this._dv_offset += n_bytes;
      }
      break;
    case this._type_enum.DBL:
      if ((this._dv_offset % 8) !== 0) {
        new_abuf = new ArrayBuffer(n_bytes);
        n_values = n_bytes / 8;
        value = new Float64Array(new_abuf);
        for (i = 0; i < n_values; i += 1) {
          value[i] = this.getF64();
        }
      } else {
        value = new Float64Array(abuf, this._dv_offset, n_bytes / 8);
        this._dv_offset += n_bytes;
      }
      break;
    default:
      throw new Error('Bad type in this.getArray ' + typ);
    }
    if (new_off) {
      this._dv_offset = spp;
    }
    return value;
  }


  /**
  * [PRIVATE]
  *
  * Get a variably-sized integer from the DataView.
  */
  getUXX(n) {
    var v;
    var i;
    switch (n) {
    case 1:
      v = this._dv.getUint8(this._dv_offset);
      break;
    case 2:
      v = this._dv.getUint16(this._dv_offset, this._little_endian);
      break;
    case 4:
      v = this._dv.getUint32(this._dv_offset, this._little_endian);
      break;
    case 8:
      v = this._dv.getUint64(this._dv_offset, this._little_endian);
      break;
    default:
      /* Certain hdf5 types can have odd numbers of bytes. We try
       * to deal with that special case here.
       */
      v = 0;
      if (!this._little_endian) {
        for (i = 0; i < n; i++) {
          v = (v << 8) + this._dv.getUint8(this._dv_offset + i);
        }
      }
      else {
        for (i = n - 1; i >= 0; i--) {
          v = (v << 8) + this._dv.getUint8(this._dv_offset + i);
        }
      }
    }
    this._dv_offset += n;
    return v;
  }


  /**
  * [PRIVATE]
  *
  * Verify that the expected signature is found at this offset.
  */
  checkSignature(str) {
    var i;
    for (i = 0; i < str.length; i += 1) {
      if (this._dv.getUint8(this._dv_offset + i) !== str.charCodeAt(i)) {
        return false;
      }
    }
    this.skip(str.length);
    return true;
  }


  /**
  * [PRIVATE]
  */
  hdf5Superblock() {
    var sb = {};
    if (!this.checkSignature("\u0089HDF\r\n\u001A\n")) {
      throw new Error('Bad magic string in HDF5');
    }
    sb.sbver = this.getU8();
    if (sb.sbver > 2) {
      throw new Error('Unsupported HDF5 superblock version ' + sb.sbver);
    }
    if (sb.sbver <= 1) {
      sb.fsver = this.getU8();
      sb.rgver = this.getU8();
      this.skip(1);            // reserved
      sb.shver = this.getU8();
      sb.offsz = this.getU8();
      sb.lensz = this.getU8();
      this.skip(1);            // reserved
      sb.gln_k = this.getU16();
      sb.gin_k = this.getU16();
      sb.cflags = this.getU32();
      if (sb.sbver === 1) {
        sb.isin_k = this.getU16();
        this.skip(2);        // reserved
      }
      sb.base_addr = this.getOffset(sb.offsz);
      sb.gfsi_addr = this.getOffset(sb.offsz);
      sb.eof_addr = this.getOffset(sb.offsz);
      sb.dib_addr = this.getOffset(sb.offsz);
      sb.root_ln_offs = this.getOffset(sb.offsz);
      sb.root_addr = this.getOffset(sb.offsz);
      sb.root_cache_type = this.getU32();
      this.skip(4);
      this.skip(16);
    } else {
      sb.offsz = this.getU8();
      sb.lensz = this.getU8();
      sb.cflags = this.getU8();
      sb.base_addr = this.getOffset(sb.offsz);
      sb.ext_addr = this.getOffset(sb.offsz);
      sb.eof_addr = this.getOffset(sb.offsz);
      sb.root_addr = this.getOffset(sb.offsz);
      sb.checksum = this.getU32();
    }
    if (this.getMetadata("debug")) {
      console.log("HDF5 SB " + sb.sbver + " " + sb.offsz + " " + sb.lensz + " " + sb.cflags);
    }
    return sb;
  }


  /**
  * [PRIVATE]
  *
  * read the v2 fractal heap header
  */
  hdf5FractalHeapHeader() {
    var fh = {};
    if (!this.checkSignature("FRHP")) {
      throw new Error('Bad or missing FRHP signature');
    }
    fh.ver = this.getU8();         // Version
    fh.idlen = this.getU16();      // Heap ID length
    fh.iof_el = this.getU16();     // I/O filter's encoded length
    fh.flags = this.getU8();       // Flags
    fh.objmax = this.getU32();     // Maximum size of managed objects.
    fh.objnid = this.getLength();  // Next huge object ID
    fh.objbta = this.getOffset();  // v2 B-tree address of huge objects
    fh.nf_blk = this.getLength();  // Amount of free space in managed blocks
    fh.af_blk = this.getOffset();  // Address of managed block free space manager
    fh.heap_total = this.getLength(); // Amount of managed space in heap
    fh.heap_alloc = this.getLength(); // Amount of allocated managed space in heap
    fh.bai_offset = this.getLength(); // Offset of direct block allocation iterator
    fh.heap_nobj = this.getLength();  // Number of managed objects in heap
    fh.heap_chuge = this.getLength(); // Size of huge objects in heap
    fh.heap_nhuge = this.getLength(); // Number of huge objects in heap
    fh.heap_ctiny = this.getLength(); // Size of tiny objects in heap
    fh.heap_ntiny = this.getLength(); // Number of tiny objects in heap
    fh.table_width = this.getU16();   // Table width
    fh.start_blksz = this.getLength(); // Starting block size
    fh.max_blksz = this.getLength();   // Maximum direct block size
    fh.max_heapsz = this.getU16();     // Maximum heap size
    fh.rib_srows = this.getU16();      // Starting # of rows in root indirect block
    fh.root_addr = this.getOffset();   // Address of root block
    fh.rib_crows = this.getU16();      // Current # of rows in root indirect block

    var max_dblock_rows = Math.log2(fh.max_blksz) - Math.log2(fh.start_blksz) + 2;
    fh.K = Math.min(fh.rib_crows, max_dblock_rows) * fh.table_width;
    fh.N = (fh.rib_crows < max_dblock_rows) ? 0 : fh.K - (max_dblock_rows * fh.table_width);

    if (this.getMetadata("debug")) {
      console.log("FRHP V" + fh.ver + " F" + fh.flags + " " + fh.objbta + " Total:" + fh.heap_total + " Alloc:" + fh.heap_alloc + " #obj:" + fh.heap_nobj + " width:" + fh.table_width + " start_blksz:" + fh.start_blksz + " max_blksz:" + fh.max_blksz + " " + fh.max_heapsz + " srows:" + fh.rib_srows + " crows:" + fh.rib_crows + " " + fh.heap_nhuge);
      console.log("   K: " + fh.K + " N: " + fh.N);
    }

    if (fh.iof_el > 0) {
      throw new Error("Filters present in fractal heap.");
    }
    return fh;
  }


  /**
  * [PRIVATE]
  *
  * read the v2 btree header
  */
  hdf5V2BtreeHeader() {
    var bh = {};
    if (!this.checkSignature("BTHD")) {
      throw new Error('Bad or missing BTHD signature');
    }
    bh.ver = this.getU8();
    bh.type = this.getU8();
    bh.nodesz = this.getU32();
    bh.recsz = this.getU16();
    bh.depth = this.getU16();
    bh.splitp = this.getU8();
    bh.mergep = this.getU8();
    bh.root_addr = this.getOffset();
    bh.root_nrec = this.getU16();
    bh.total_nrec = this.getLength();
    bh.checksum = this.getU32();

    if (this.getMetadata("debug")) {
      console.log("BTHD V" + bh.ver + " T" + bh.type + " " + bh.nodesz + " " + bh.recsz + " " + bh.depth + " " + bh.root_addr + " " + bh.root_nrec + " " + bh.total_nrec);
    }
    return bh;
  }



  /**
  * [PRIVATE]
  *
  * Enumerates btree records in a block. Records are found both in direct
  * and indirect v2 btree blocks.
  */
  hdf5V2BtreeRecords(fh, bt_type, nrec, link) {
    var i;
    var spp;                  // saved position pointer
    var offset;
    var length;
    if (bt_type === 1) {
      for (i = 0; i < nrec; i++) {
        offset = this.getOffset();
        length = this.getLength();
        var id = this.getLength();
        if (this.getMetadata("debug")) {
          console.log("  -> " + offset + " " + length + " " + id + " " + this._this._huge_id);
        }
        spp = this.tell();
        if (id === this._this._huge_id) {
          this.seek(offset);
          this.hdf5MsgAttribute(length, link);
        }
        this.seek(spp);
      }
    }
    else if (bt_type === 8) {
      var cb_offs;
      var cb_leng;
      /* maximum heap size is stored in bits! */
      cb_offs = fh.max_heapsz / 8;
      var tmp = Math.min(fh.objmax, fh.max_blksz);
      if (tmp <= 256) {
        cb_leng = 1;
      }
      else if (tmp <= 65536) {
        cb_leng = 2;
      }
      else {
        cb_leng = 4;
      }
      for (i = 0; i < nrec; i++) {
        /* Read managed fractal heap ID.
         */
        var vt = this.getU8();
        if ((vt & 0xc0) !== 0) {
          throw new Error('Bad Fractal Heap ID version ' + vt);
        }
        var id_type = (vt & 0x30);
        var flags;
        if (id_type === 0x10) {     // huge!
          this._this._huge_id = this.getUXX(7);
        }
        else if (id_type === 0x00) { // managed.
          offset = this.getUXX(cb_offs);
          length = this.getUXX(cb_leng);
        }
        else {
          throw new Error("Can't handle this Heap ID: " + vt);
        }
        flags = this.getU8();

        /* Read the rest of the record.
         */
        this.getU32();               // creation order (IGNORE)
        this.getU32();               // hash (IGNORE)
        if (this.getMetadata("debug")) {
          console.log("  -> " + vt + " " + offset + " " + length + " " + flags);
        }
        spp = this.tell();
        if (id_type === 0x10) {
          /* A "huge" object is found by indexing through the btree
           * present in the header
           */
          this.seek(fh.objbta);
          var bh = this.hdf5V2BtreeHeader();
          if (bh.type === 1) {
            this.seek(bh.root_addr);
            this.hdf5V2BtreeLeafNode(fh, bh.root_nrec, link);
          }
          else {
            throw new Error("Can only handle type-1 btrees");
          }
        }
        else {
          /*
           * A managed object implies that the attribute message is
           * found in the associated fractal heap at the specified
           * offset in the heap. We get the actual address
           * corresponding to the offset here.
           */
          var location = this.hdf5FractalHeapOffset(fh, offset);
          this.seek(location);
          this.hdf5MsgAttribute(length, link);
        }
        this.seek(spp);
      }
    }
    else {
      throw new Error("Unhandled V2 btree type.");
    }
  }


  /**
  * [PRIVATE]
  *
  * read a v2 btree leaf node
  */
  hdf5V2BtreeLeafNode(fh, nrec, link) {

    if (!this.checkSignature("BTLF")) {
      throw new Error('Bad or missing BTLF signature');
    }

    var ver = this.getU8();
    var typ = this.getU8();

    if (this.getMetadata("debug")) {
      console.log("BTLF V" + ver + " T" + typ + " " + this.tell());
    }
    this.hdf5V2BtreeRecords(fh, typ, nrec, link);
  }


  /**
  * [PRIVATE]
  *
  * read the hdf5 v2 btree internal node
  */
  hdf5V2BtreeInternalNode(fh, nrec, depth, link) {

    if (!this.checkSignature("BTIN")) {
      throw new Error('Bad or missing BTIN signature');
    }
    var ver = this.getU8();
    var type = this.getU8();
    var i;

    if (this.getMetadata("debug")) {
      console.log("BTIN V" + ver + " T" + type);
    }
    this.hdf5V2BtreeRecords(fh, type, nrec, link);
    for (i = 0; i <= nrec; i++) {
      var child_offset = this.getOffset();
      var child_nrec = this.getUXX(1); // TODO: calculate real size!!
      var child_total;
      /* TODO: unfortunately, this field is optional and
       * variably-sized. Calculating the size is non-trivial, as it
       * depends on the total depth and size of the tree. For now
       * we will just assume it is its minimum size, as I've never
       * encountered a file with depth > 1 anyway.
       */
      if (depth > 1) {
        child_total = this.getUXX(1);
      }
      if (this.getMetadata("debug")) {
        console.log(" child->" + child_offset + " " + child_nrec + " " + child_total);
      }
    }
  }


  /**
  * [PRIVATE]
  */
  hdf5GetMsgName(n) {

    // JO: used to be in the global scope.
    /* Names of the various HDF5 messages.
     * Note that MESSAGE23 appears to be illegal. All the rest are defined,
     * although I've never encountered a BOGUS message!
     */
    var msg_names = [
      "NIL", "Dataspace", "LinkInfo", "Datatype", "FillValue 1", "FillValue 2",
      "Link", "ExternalFiles", "Layout", "BOGUS", "GroupInfo", "FilterPipeline",
      "Attribute", "ObjectComment", "ObjectModTime 1", "SharedMsgTable",
      "ObjHdrContinue", "SymbolTable", "ObjectModTime 2", "BtreeKValue",
      "DriverInfo", "AttrInfo", "ObjectRefCnt", "MESSAGE23",
      "FileSpaceInfo"
    ];

    if (n < msg_names.length) {
      return msg_names[n];
    }
    throw new Error('Unknown message type ' + n + " " + this.tell());
  }


  /**
  * [PRIVATE]
  */
  hdf5V1BtreeNode(link) {
    var abuf = this._getInput();
    var i;
    var bt = {};
    if (!this.checkSignature("TREE")) {
      throw new Error('Bad TREE signature at ' + this.tell());
    }

    bt.keys = [];

    bt.node_type = this.getU8();
    bt.node_level = this.getU8();
    bt.entries_used = this.getU16();
    bt.left_sibling = this.getOffset();
    bt.right_sibling = this.getOffset();

    if (this.getMetadata("debug")) {
      console.log("BTREE type " + bt.node_type + " lvl " +
                  bt.node_level + " n_used " + bt.entries_used + " " +
                  bt.left_sibling + " " + bt.right_sibling);
    }

    if (!link) {
      /* If this BTREE is associated with a group (not a dataset),
       * then its keys are single "length" value.
       */
      for (i = 0; i < bt.entries_used; i += 1) {
        bt.keys[i] = {};
        bt.keys[i].key_value = this.getLength();
        bt.keys[i].child_address = this.getOffset();
        if (this.getMetadata("debug")) {
          console.log("  BTREE " + i + " key " +
                      bt.keys[i].key_value + " adr " +
                      bt.keys[i].child_address);
        }
      }
    } else {
      var j;

      /* If this BTREE is a "chunked raw data node" associated
       * with a dataset, then its keys are complex, consisting
       * of the chunk size in bytes, a filter mask, and a set of
       * offsets matching the dimensionality of the chunk layout.
       * The chunk size stores the actual stored length of the
       * data, so it may not equal the uncompressed chunk size.
       */
      var chunks = [];

      for (i = 0; i < bt.entries_used; i += 1) {
        bt.keys[i] = {};
        chunks[i] = {};
        chunks[i].chunk_size = this.getU32();
        chunks[i].filter_mask = this.getU32();
        chunks[i].chunk_offsets = [];
        for (j = 0; j < link.dims.length + 1; j += 1) {
          chunks[i].chunk_offsets.push(this.getU64());
        }
        bt.keys[i].child_address = this.getOffset();
        if (i < bt.entries_used) {
          if (this.getMetadata("debug")) {
            console.log("  BTREE " + i +
                        " chunk_size " + chunks[i].chunk_size +
                        " filter_mask " + chunks[i].filter_mask +
                        " addr " + bt.keys[i].child_address);
          }
        }
      }
      chunks[i] = {};
      chunks[i].chunk_size = this.getU32();
      chunks[i].filter_mask = this.getU32();
      chunks[i].chunk_offsets = [];
      for (j = 0; j < link.dims.length + 1; j += 1) {
        chunks[i].chunk_offsets.push(this.getU64());
      }

      /* If we're at a leaf node, we have data to deal with.
       * We might have to uncompress!
       */
      if (bt.node_level === 0) {
        var length;
        var offset;
        var sp;
        var dp;

        for (i = 0; i < bt.entries_used; i += 1) {
          length = chunks[i].chunk_size;
          offset = bt.keys[i].child_address;

          if (link.inflate) {
            sp = new Uint8Array(abuf, offset, length);
            dp = pako.inflate(sp);
            switch (link.type) {
            case this._type_enum.INT8:
              dp = new Int8Array(dp.buffer);
              break;
            case this._type_enum.UINT8:
              dp = new Uint8Array(dp.buffer);
              break;
            case this._type_enum.INT16:
              dp = new Int16Array(dp.buffer);
              break;
            case this._type_enum.UINT16:
              dp = new Uint16Array(dp.buffer);
              break;
            case this._type_enum.INT32:
              dp = new Int32Array(dp.buffer);
              break;
            case this._type_enum.UINT32:
              dp = new Uint32Array(dp.buffer);
              break;
            case this._type_enum.FLT:
              dp = new Float32Array(dp.buffer);
              break;
            case this._type_enum.DBL:
              dp = new Float64Array(dp.buffer);
              break;
            default:
              throw new Error('Unknown type code ' + link.type);
            }
            if (link.array.length - link.n_filled < dp.length) {
              dp = dp.subarray(0, link.array.length - link.n_filled);
            }
            link.array.set(dp, link.n_filled);
            link.n_filled += dp.length;
            if (this.getMetadata("debug")) {
              console.log(link.name + " " + sp.length + " " + dp.length + " " + link.n_filled + "/" + link.array.length);
            }
          }
          else {
            /* no need to inflate data. */
            dp = this.getArray(link.type, length, offset);
            link.array.set(dp, link.n_filled);
            link.n_filled += dp.length;
          }
        }
      } else {
        for (i = 0; i < bt.entries_used; i += 1) {
          this.seek(bt.keys[i].child_address);
          this.hdf5V1BtreeNode(link);
        }
      }
    }
    return bt;
  }


  /**
  * [PRIVATE]
  */
  hdf5GroupSymbolTable(lh, link) {
    if (!this.checkSignature("SNOD")) {
      throw new Error('Bad or missing SNOD signature');
    }
    var ver = this.getU8();
    this.skip(1);
    var n_sym = this.getU16();
    if (this.getMetadata("debug")) {
      console.log("this.hdf5GroupSymbolTable V" + ver + " #" + n_sym +
                  " '" + link.name + "'");
    }
    var i;
    var link_name_offset;
    var ohdr_address;
    var cache_type;
    var child;
    var spp;

    for (i = 0; i < 2 * this._superblk.gln_k; i += 1) {
      link_name_offset = this.getOffset();
      ohdr_address = this.getOffset();
      cache_type = this.getU32();
      this.skip(20);

      if (i < n_sym) {
        child = this.createLink();
        child.hdr_offset = ohdr_address;
        if (lh) {
          spp = this.tell();
          /* The link name is a zero-terminated string
           * starting at the link_name_off relative to
           * the beginning of the data segment of the local
           * heap.
           */
          this.seek(lh.lh_dseg_off + link_name_offset);
          child.name = this.getString(lh.lh_dseg_len);
          this.seek(spp);
        }
        if (this.getMetadata("debug")) {
          console.log("    " + i + " O " + link_name_offset + " A " +
                      ohdr_address + " T " + cache_type + " '" +
                      child.name + "'");
        }
        link.children.push(child);
      }
    }
  }


  /**
  * [PRIVATE]
  *
  * Read a v1 local heap header. These define relatively small
  * regions used primarily for storing symbol names associated with
  * a symbol table message.
  */
  hdf5LocalHeap() {
    var lh = {};
    if (!this.checkSignature("HEAP")) {
      throw new Error('Bad or missing HEAP signature');
    }
    lh.lh_ver = this.getU8();
    this.skip(3);
    lh.lh_dseg_len = this.getLength();
    lh.lh_flst_len = this.getLength();
    lh.lh_dseg_off = this.getOffset();
    if (this.getMetadata("debug")) {
      console.log("LHEAP V" + lh.lh_ver + " " + lh.lh_dseg_len + " " +
                  lh.lh_flst_len + " " + lh.lh_dseg_off);
    }
    return lh;
  }


  /**
  * [PRIVATE]
  *
  * Process a "dataspace" message. Dataspaces define the
  * dimensionality of a dataset or attribute. They define the
  * number of dimensions (rank) and the current length of each
  * dimension. It is possible to specify a "maximum" length that is
  * greater than or equal to the current length, but MINC doesn't
  * rely on that feature so these values are ignored.  Finally it
  * is also possible to specify a "permutation index" that alters
  * storage order of the dataset, but again, MINC doesn't rely on
  * this feature, so the values are ignored.
  */
  hdf5MsgDataspace(sz, link) {
    var cb;
    var ver = this.getU8();
    var n_dim = this.getU8();
    var flag = this.getU8();
    if (ver <= 1) {
      this.skip(5);
    } else {
      this.skip(1);
    }

    var n_items = 1;
    var dlen = [];
    var i;
    for (i = 0; i < n_dim; i += 1) {
      dlen[i] = this.getLength();
      n_items *= dlen[i];
    }

    cb = (n_dim * this._superblk.lensz) + ((ver <= 1) ? 8 : 4);

    var dmax = [];
    if ((flag & 1) !== 0) {
      cb += n_dim * this._superblk.lensz;
      for (i = 0; i < n_dim; i += 1) {
        dmax[i] = this.getLength();
      }
    }

    var dind = [];
    if ((flag & 2) !== 0) {
      cb += n_dim * this._superblk.lensz;
      for (i = 0; i < n_dim; i += 1) {
        dind[i] = this.getLength();
      }
    }
    var msg = "this.hdf5MsgDataspace V" + ver + " N" + n_dim + " F" + flag;
    if (this.getMetadata("debug")) {
      if (n_dim !== 0) {
        msg += "[" + dlen.join(', ') + "]";
      }
      console.log(msg);
    }
    if (cb < sz) {
      this.skip(sz - cb);
    }
    if (link) {
      link.dims = dlen;
    }
    return n_items;
  }


  /**
  * [PRIVATE]
  *
  *
  * link info messages may contain a fractal heap address where we
  * can find additional link messages for this object. This
  * happens, for example, when there are lots of links in a
  * particular group.
  */
  hdf5MsgLinkInfo(link) {
    var that = this;

    var ver = this.getU8();
    var flags = this.getU8();
    if ((flags & 1) !== 0) {
      this.getU64();          // max. creation index (IGNORE).
    }
    var fh_address = this.getOffset(); // fractal heap address
    var bt_address = this.getOffset(); // v2 btree for name index
    if ((flags & 2) !== 0) {
      this.getOffset();       // creation order index (IGNORE).
    }
    if (this.getMetadata("debug")) {
      console.log("this.hdf5MsgLinkInfo V" + ver + " F" + flags +
                  " FH " + fh_address + " BT " + bt_address);
    }
    var spp = this.tell();
    if (fh_address < this._superblk.eof_addr) {
      this.seek(fh_address);
      /* If there is a valid fractal heap address in the link info message, that
       * means the fractal heap is a collection of link messages. We can ignore
       * the btree address because we can get the names from the link messages.
       */
      var fh = this.hdf5FractalHeapHeader();
      var n_msg = 0;
      this.hdf5FractalHeapEnumerate( fh, function(row, address, block_offset, block_length) {
        var end_address = address + block_length;
        while (n_msg < fh.heap_nobj && that.tell() < end_address) {
          that.hdf5MsgLink(link);
          n_msg += 1;
        }
        return true;          // continue with enumeration.
      });
    }
    this.seek(spp);
  }


  /**
  * [PRIVATE]
  */
  dt_class_name(cls) {
    var names = [
      "Fixed-Point", "Floating-Point", "Time", "String",
      "BitField", "Opaque", "Compound", "Reference",
      "Enumerated", "Variable-Length", "Array"
    ];

    if (cls < names.length) {
      return names[cls];
    }
    throw new Error('Unknown datatype class: ' + cls);
  }


  /**
  * [PRIVATE]
  *
  * Process a "datatype" message. These messages specify the data
  * type of a single element within a dataset or attribute. Data
  * types are extremely flexible, HDF5 supports a range of options
  * for bit widths and organization atomic types. We support only
  * fixed, float, and string atomic types, and those only for
  * certain restricted (but common) cases.  At this point we
  * provide no support for more exotic types such as bit field,
  * enumerated, array, opaque, compound, time, reference,
  * variable-length, etc.
  *
  * TODO: should support enumerated types, possibly a few others.
  */
  hdf5MsgDatatype(sz) {
    var type = {};
    var cb = 8;
    var msg = "";
    var bit_offs;
    var bit_prec;
    var exp_loc;
    var exp_sz;
    var mnt_loc;
    var mnt_sz;
    var exp_bias;

    var cv = this.getU8();
    var ver = cv >> 4;
    var cls = cv & 15;
    var bf = [];
    var i;
    for (i = 0; i < 3; i += 1) {
      bf[i] = this.getU8();
    }
    var dt_size = this.getU32();

    if (this.getMetadata("debug")) {
      console.log("this.hdf5MsgDatatype V" + ver + " C" + cls +
                  " " + this.dt_class_name(cls) +
                  " " + bf[0] + "." + bf[1] + "." + bf[2] +
                  " " + dt_size);
    }

    switch (cls) {
    case 0:      /* Fixed (integer): bit 0 for byte order, bit 3 for signed */
      bit_offs = this.getU16();
      bit_prec = this.getU16();
      switch (dt_size) {
      case 4:
        type.typ_type = (bf[0] & 8) ? this._type_enum.INT32 : this._type_enum.UINT32;
        break;
      case 2:
        type.typ_type = (bf[0] & 8) ? this._type_enum.INT16 : this._type_enum.UINT16;
        break;
      case 1:
        type.typ_type = (bf[0] & 8) ? this._type_enum.INT8 : this._type_enum.UINT8;
        break;
      default:
        throw new Error('Unknown type size ' + dt_size);
      }
      type.typ_length = dt_size;
      cb += 4;
      if (this.getMetadata("debug")) {
        console.log('  (' + bit_offs + ' ' + bit_prec + ')');
      }
      break;
    case 1:                /* Float: uses bits 0,6 for byte order */
      msg = "";
      if (this.getMetadata("debug")) {
        switch (bf[0] & 0x41) {
        case 0:
          msg += "LE ";
          break;
        case 1:
          msg += "BE ";
          break;
        case 0x41:
          msg += "VX ";
          break;
        default:
          throw new Error('Reserved fp byte order: ' + bf[0]);
        }
      }
      bit_offs = this.getU16();
      bit_prec = this.getU16();
      exp_loc = this.getU8();
      exp_sz = this.getU8();
      mnt_loc = this.getU8();
      mnt_sz = this.getU8();
      exp_bias = this.getU32();
      if (this.getMetadata("debug")) {
        msg += (bit_offs + " " + bit_prec + " " + exp_loc + " " + exp_sz +
                " " + mnt_loc + " " + mnt_sz + " " + exp_bias);
      }
      /* See if it's one of the formats we recognize.
         IEEE 64-bit or IEEE 32-bit are the only two we handle.
      */
      if (bit_prec === 64 && bit_offs === 0 &&
          exp_loc === 52 && exp_sz === 11 &&
          mnt_loc === 0 && mnt_sz === 52 &&
          exp_bias === 1023 && dt_size === 8) {
        type.typ_type = this._type_enum.DBL;
      } else if (bit_prec === 32 && bit_offs === 0 &&
                 exp_loc === 23 && exp_sz === 8 &&
                 mnt_loc === 0 && mnt_sz === 23 &&
                 exp_bias === 127 && dt_size === 4) {
        type.typ_type = this._type_enum.FLT;
      } else {
        throw new Error("Unsupported floating-point type");
      }
      if (this.getMetadata("debug")) {
        console.log(msg);
      }
      type.typ_length = dt_size;
      cb += 12;
      break;

    case 3:                   // string
      /* bits 0-3 = 0: null terminate, 1: null pad, 2: space pad */
      /* bits 4-7 = 0: ASCII, 1: UTF-8 */
      type.typ_type = this._type_enum.STR;
      type.typ_length = dt_size;
      break;

    default:
      throw new Error('Unimplemented HDF5 data class ' + cls);
    }
    if (sz > cb) {
      this.skip(sz - cb);
    }
    return type;
  }


  /**
  * [PRIVATE]
  *
  * Process a "layout" message. These messages specify the location and organization
  * of data in a dataset. The organization can be either compact, contiguous, or
  * chunked. Compact data is stored in the message as a contiguous block. Contiguous
  * data is stored elsewhere in the file in a single chunk. Chunked data is stored within
  * a V1 Btree as a series of possibly filtered (e.g. compressed) chunks.
  */
  hdf5MsgLayout(link) {
    var msg = "";

    var ver = this.getU8();
    var cls;
    var n_dim;
    var cdsz;
    var dim = [];
    var i;
    var dtadr;
    var dtsz;
    var elsz;

    var n_items = 1;
    if (ver === 1 || ver === 2) {
      n_dim = this.getU8();
      cls = this.getU8();
      this.skip(5);
      if (this.getMetadata("debug")) {
        msg += "this.hdf5MsgLayout V" + ver + " N" + n_dim + " C" + cls;
      }
      if (cls === 1 || cls === 2) { // contiguous or chunked
        var addr = this.getOffset();
        if (this.getMetadata("debug")) {
          msg += " A" + addr;
        }
        link.data_offset = addr;
      }

      for (i = 0; i < n_dim; i += 1) {
        dim[i] = this.getU32();
        n_items *= dim[i];
      }

      if (this.getMetadata("debug")) {
        msg += "[" + dim.join(', ') + "]";
      }

      if (cls === 2) {        // chunked
        elsz = this.getU32();
        link.chunk_size = n_items * elsz;
        if (this.getMetadata("debug")) {
          msg += " E" + elsz;
        }
      }
      if (cls === 0) {        // compact
        cdsz = this.getU32();
        if (this.getMetadata("debug")) {
          msg += "(" + cdsz + ")";
        }
        link.data_offset = this.tell();
        link.data_length = cdsz;
      } else if (cls === 1) {
        link.data_length = n_items;
      }
    } else if (ver === 3) {
      cls = this.getU8();
      msg = "this.hdf5MsgLayout V" + ver + " C" + cls;

      if (cls === 0) {
        cdsz = this.getU16();
        if (this.getMetadata("debug")) {
          msg += "(" + cdsz + ")";
        }
        link.data_offset = this.tell();
        link.data_length = cdsz;
      } else if (cls === 1) {
        dtadr = this.getOffset();
        dtsz = this.getLength();
        if (this.getMetadata("debug")) {
          msg += "(" + dtadr + ", " + dtsz + ")";
        }
        link.data_offset = dtadr;
        link.data_length = dtsz;
      } else if (cls === 2) {
        n_dim = this.getU8();
        dtadr = this.getOffset();
        link.data_offset = dtadr;
        link.chunk_size = 1;
        for (i = 0; i < n_dim - 1; i += 1) {
          dim[i] = this.getU32();
          n_items *= dim[i];
        }
        if (this.getMetadata("debug")) {
          msg += "(N" + n_dim + ", A" + dtadr + " [" + dim.join(',') + "]";
        }
        elsz = this.getU32();
        link.chunk_size = n_items * elsz;
        if (this.getMetadata("debug")) {
          msg += " E" + elsz;
        }
      }
    } else {
      throw new Error("Illegal layout version " + ver);
    }
    if (this.getMetadata("debug")) {
      console.log(msg);
    }
  }


  /**
  * [PRIVATE]
  *
  * Read a "filter pipeline" message. At the moment we _only_ handle
  * deflate/inflate. Anything else will cause us to throw an exception.
  */
  hdf5MsgPipeline(link) {
    var ver = this.getU8();
    var nflt = this.getU8();

    var msg = "this.hdf5MsgPipeline V" + ver + " N" + nflt;
    if (ver === 1) {
      this.skip(6);
    }

    if (this.getMetadata("debug")) {
      console.log(msg);
    }

    var i;
    var fiv;
    var nlen;
    var flags;
    var ncdv;
    for (i = 0; i < nflt; i += 1) {
      fiv = this.getU16();
      if (fiv !== 1) {             /* deflate */
        throw new Error("Unimplemented HDF5 filter " + fiv);
      }
      else {
        if (typeof pako !== 'object') {
          throw new Error('Need pako to inflate data.');
        }
        link.inflate = true;
      }
      if (ver === 1 || fiv > 256) {
        nlen = this.getU16();
      } else {
        nlen = 0;
      }

      flags = this.getU16();
      ncdv = this.getU16();
      if ((ncdv & 1) !== 0) {
        ncdv += 1;
      }
      if (nlen !== 0) {
        this.skip(nlen);     // ignore name.
      }

      this.skip(ncdv * 4);

      if (this.getMetadata("debug")) {
        console.log("  " + i + " ID" + fiv + " F" + flags + " " + ncdv);
      }
    }
  }


  /**
  * [PRIVATE]
  *
  * Process an "attribute" message. This actually defines an attribute that is
  * to be associated with a group or dataset (what I generally call a "link"
  * in this code. Attributes include a name, a datatype, and a dataspace, followed
  * by the actual data.
  */
  hdf5MsgAttribute(sz, link) {
    var ver = this.getU8();
    var flags = this.getU8();
    var nm_len = this.getU16();
    var dt_len = this.getU16();
    var ds_len = this.getU16();
    var msg = "this.hdf5MsgAttribute V" + ver + " F" + flags + " " + sz + ": ";

    if ((flags & 3) !== 0) {
      throw new Error('Shared dataspaces and datatypes are not supported.');
    }

    if (ver === 3) {
      var cset = this.getU8();
      if (this.getMetadata("debug")) {
        msg += (cset === 0) ? "ASCII" : "UTF-8";
      }
    }
    if (this.getMetadata("debug")) {
      msg += "(" + nm_len + " " + dt_len + " " + ds_len + ")";
    }
    if (ver < 3) {
      nm_len = Math.floor((nm_len + 7) / 8) * 8;
      dt_len = Math.floor((dt_len + 7) / 8) * 8;
      ds_len = Math.floor((ds_len + 7) / 8) * 8;

      if (this.getMetadata("debug")) {
        msg += "/(" + nm_len + " " + dt_len + " " + ds_len + ")";
      }
    }

    var att_name = this.getString(nm_len);
    if (this.getMetadata("debug")) {
      msg += " Name: " + att_name;
      console.log(msg);
    }
    var val_type = this.hdf5MsgDatatype(dt_len);
    var n_items = this.hdf5MsgDataspace(ds_len);
    var val_len = 0;
    if (sz > 0) {
      if (ver < 3) {
        val_len = sz - (8 + nm_len + dt_len + ds_len);
      } else {
        val_len = sz - (9 + nm_len + dt_len + ds_len);
      }
    } else {
      val_len = val_type.typ_length * n_items;
    }
    if (this.getMetadata("debug")) {
      console.log("  attribute data size " + val_len + " " + this.tell());
    }
    var att_value;
    if (val_type.typ_type === this._type_enum.STR) {
      att_value = this.getString(val_len);
    } else {
      att_value = this.getArray(val_type.typ_type, val_len);
    }
    link.attributes[att_name] = att_value;
  }


  /**
  * [PRIVATE]
  *
  * Process a "group info" message. We don't actually do anything with these.
  */
  hdf5MsgGroupInfo() {
    var n_ent = 4;
    var n_lnl = 8;
    var ver = this.getU8();
    var flags = this.getU8();
    if ((flags & 1) !== 0) {
      this.getU16();          // link phase change: max compact value (IGNORE)
      this.getU16();          // link phase cange: max dense value (IGNORE)
    }
    if ((flags & 2) !== 0) {
      n_ent = this.getU16();
      n_lnl = this.getU16();
    }
    if (this.getMetadata("debug")) {
      console.log("this.hdf5MsgGroupInfo V" + ver + " F" + flags + " ENT " + n_ent + " LNL " + n_lnl);
    }
  }


  /**
  * [PRIVATE]
  *
  * Process a "link" message. This specifies the name and header location of either a
  * group or a dataset within the current group. It is probably also used to implement
  * internal links but we don't really support that.
  */
  hdf5MsgLink(link) {
    var ver = this.getU8();
    var ltype = 0;
    if (ver !== 1) {
      throw new Error("Bad link message version " + ver);
    }
    var flags = this.getU8();
    if ((flags & 8) !== 0) {
      ltype = this.getU8();
    }
    if ((flags & 4) !== 0) {
      this.getU64();               // creation order (IGNORE)
    }
    if ((flags & 16) !== 0) {
      this.getU8();                // link name character set (IGNORE)
    }
    var cb = 1 << (flags & 3);
    var lnsz = this.getUXX(cb);

    var child = this.createLink();

    child.name = this.getString(lnsz);

    if ((flags & 8) === 0) {
      child.hdr_offset = this.getOffset();
    }

    if (this.getMetadata("debug")) {
      console.log("this.hdf5MsgLink V" + ver + " F" + flags + " T" + ltype +
                  " NM " + child.name + " OF " + child.hdr_offset);
    }
    link.children.push(child);
  }


  /**
  * [PRIVATE]
  *
  * The fractal heap direct block contains:
  * 1. A signature.
  * 2. a byte version.
  * 3. an offset pointing to the header (for integrity checking).
  * 4. A variably-sized block offset that gives (_I think_) the mininum block offset
  * associated with this block.
  * 5. Variably-sized data. Block size varies with row number in a slightly tricky
  * fashion. Each "row" consists of "table_width" blocks. The first two rows, row 0 and 1,
  * have blocks of the "starting block size". Row 2-N have blocks of size 2^(row-1) times
  * the starting block size.
  */
  hdf5FractalHeapDirectBlock(fh, row, address, callback) {
    if (!this.checkSignature("FHDB")) {
      throw new Error("Bad or missing FHDB signature");
    }
    var ver = this.getU8();
    if (ver !== 0) {
      throw new Error('Bad FHDB version: ' + ver);
    }
    this.getOffset();              // heap header address (IGNORE)
    var cb = Math.ceil(fh.max_heapsz / 8.0);
    var block_offset = this.getUXX(cb); // block offset
    if ((fh.flags & 2) !== 0) {
      this.getU32();               // checksum (IGNORE)
    }

    if (this.getMetadata("debug")) {
      console.log("FHDB V:" + ver + " R:" + row + " O:" + block_offset + " A:" + address);
    }
    var header_length = 5 + this._superblk.offsz + cb;
    if ((fh.flags & 2) !== 0) {
      header_length += 4;
    }
    var block_length;
    if (row <= 1) {
      block_length = fh.start_blksz;
    }
    else {
      block_length = Math.pow(2, row - 1) * fh.start_blksz;
    }
    if (callback) {
      return callback(row, address, block_offset, block_length);
    }
    else {
      return true;            // continue enumeration.
    }
  }


  /**
  * [PRIVATE]
  *
  * The fractal heap indirect block contains:
  * 1. A signature.
  * 2. a byte version
  * 3. an offset pointing to the header (for integrity checking).
  * 4. a variably-sized block offset that gives (_I think_) the mininum block offset
  * associated with children of this block.
  * 5. pointers to K direct blocks
  * 6. pointers to N indirect blocks
  * 7. A checksum. This code completely ignores checksums.
  * See calculations of K and N in this.hdf5FractalHeapHeader(). Note that there can also
  * be additional information in the header if "filtered" direct blocks are used. I have
  * made no attempt to support this.
  */
  hdf5FractalHeapIndirectBlock(fh, callback) {
    if (!this.checkSignature("FHIB")) {
      throw new Error("Bad or missing FHIB signature");
    }
    var ver = this.getU8();
    if (ver !== 0) {
      throw new Error('Bad FHIB version: ' + ver);
    }
    this.getOffset();              // heap header address (IGNORE)
    var cb = Math.ceil(fh.max_heapsz / 8.0);
    var block_offset = this.getUXX(cb); // block offset

    if (this.getMetadata("debug")) {
      console.log("FHIB V:" + ver + " O:" + block_offset);
    }
    var i;
    var address;
    var db_addrs = [];
    for (i = 0; i < fh.K; i += 1) {
      address = this.getOffset();
      if (address < this._superblk.eof_addr) {
        if (this.getMetadata("debug")) {
          console.log("direct block at " + address);
        }
        db_addrs.push(address);
      }
    }

    var ib_addrs = [];
    for (i = 0; i < fh.N; i += 1) {
      address = this.getOffset();
      if (address < this._superblk.eof_addr) {
        if (this.getMetadata("debug")) {
          console.log("indirect block at " + address);
        }
        ib_addrs.push(address);
      }
    }
    this.getU32();                 // checksum (IGNORE)

    /* Finished reading the indirect block, now go read its children.
     */
    for (i = 0; i < db_addrs.length; i++) {
      this.seek(db_addrs[i]);
      /* TODO: check row calculation!
       */
      if (!this.hdf5FractalHeapDirectBlock(fh, i / fh.table_width, db_addrs[i], callback)) {
        return false;
      }
    }
    for (i = 0; i < ib_addrs.length; i++) {
      this.seek(ib_addrs[i]);
      if (!this.hdf5FractalHeapIndirectBlock(fh, callback)) {
        return false;
      }
    }
    return true;
  }


  /**
  * [PRIVATE]
  *
  * enumerate over all of the direct blocks in the fractal heap.
  */
  hdf5FractalHeapEnumerate(fh, callback) {
    this.seek(fh.root_addr);
    if (fh.K === 0) {
      this.hdf5FractalHeapDirectBlock(fh, 0, fh.root_addr, callback);
    }
    else {
      this.hdf5FractalHeapIndirectBlock(fh, callback);
    }
  }


  /**
  * [PRIVATE]
  */
  hdf5FractalHeapOffset(fh, offset) {
    var location;
    this.hdf5FractalHeapEnumerate(fh, function(row, address, block_offset, block_length) {
      if (offset >= block_offset && offset < block_offset + block_length) {
        location = address + (offset - block_offset);
        return false;         // stop enumeration.
      }
      return true;            // continue enumeration.
    });
    return location;
  }


  /**
  * [PRIVATE]
  *
  * Attribute info messages contain pointers to a fractal heap and a v2 btree.
  * If these pointers are valid, we must follow them to find more attributes.
  * The attributes are indexed by records in the "type 8" btree. These btree
  * records
  */
  hdf5MsgAttrInfo(link) {
    var ver = this.getU8();
    if (ver !== 0) {
      throw new Error('Bad attribute information message version: ' + ver);
    }

    var flags = this.getU8();

    if ((flags & 1) !== 0) {
      this.getU16();          // maximum creation index (IGNORE)
    }
    var fh_addr = this.getOffset();
    var bt_addr = this.getOffset();
    if ((flags & 2) !== 0) {
      this.getOffset();       // attribute creation order (IGNORE)
    }

    if (this.getMetadata("debug")) {
      console.log("this.hdf5MsgAttrInfo V" + ver + " F" + flags + " HP " + fh_addr +
                  " AN " + bt_addr);
    }

    var spp = this.tell();
    var fh;                   // fractal heap header.
    if (fh_addr < this._superblk.eof_addr) {
      this.seek(fh_addr);
      fh = this.hdf5FractalHeapHeader();
    }
    if (bt_addr < this._superblk.eof_addr) {
      this.seek(bt_addr);
      var bh = this.hdf5V2BtreeHeader();
      if (bh.type !== 8) {
        throw new Error("Can only handle indexed attributes.");
      }
      this.seek(bh.root_addr);
      if (bh.depth > 0) {
        this.hdf5V2BtreeInternalNode(fh, bh.root_nrec, bh.depth, link);
      }
      else {
        this.hdf5V2BtreeLeafNode(fh, bh.root_nrec, link);
      }
    }
    this.seek(spp);
  }


  /**
  * [PRIVATE]
  *
  * Process a single message, given a message header. Assumes that
  * the data view offset is pointing to the remainder of the
  * message.
  *
  * V1 and V2 files use different sets of messages to accomplish
  * similar things. For example, V1 files tend to use "symbol
  * table" messages to describe links within a group, whereas V2
  * files use "link" and "linkinfo" messages.
  */
  hdf5ProcessMessage(msg, link) {
    var cq_new = {};
    var val_type;

    switch (msg.hm_type) {
    case 1:
      this.hdf5MsgDataspace(msg.hm_size, link);
      break;
    case 2:
      this.hdf5MsgLinkInfo(link);
      break;
    case 3:
      val_type = this.hdf5MsgDatatype(msg.hm_size);
      if (link) {
        link.type = val_type.typ_type;
      }
      break;
    case 6:
      this.hdf5MsgLink(link);
      break;
    case 8:
      this.hdf5MsgLayout(link);
      break;
    case 10:
      this.hdf5MsgGroupInfo();
      break;
    case 11:
      this.hdf5MsgPipeline(link);
      break;
    case 12:
      this.hdf5MsgAttribute(msg.hm_size, link);
      break;
    case 16:
      /* Process an object header continuation message. These
       * basically just say this header continues with a new segment
       * with a given location and length. They can come before the
       * end of the current message segment, and multiple
       * continuation messages can occur in any particular segment.
       * This means we have to enqueue them and shift them off the
       * queue when we finish processing the current segment.
       */
      cq_new.cq_off = this.getOffset();
      cq_new.cq_len = this.getLength();
      this._continuation_queue.push(cq_new);
      if (this.getMetadata("debug")) {
        console.log("hdf5MsgObjHdrContinue " + cq_new.cq_off + " " + cq_new.cq_len);
      }
      break;
    case 17: // SymbolTable
      link.sym_btree = this.getOffset();
      link.sym_lheap = this.getOffset();
      if (this.getMetadata("debug")) {
        console.log("hdf5MsgSymbolTable " + link.sym_btree + " " + link.sym_lheap);
      }
      break;
    case 21:
      this.hdf5MsgAttrInfo(link);
      break;
    case 0:
    case 4:
    case 5:
    case 7:
    case 18:
    case 19:
    case 20:
    case 22:
    case 24:
      this.skip(msg.hm_size);
      break;
    default:
      throw new Error('Unknown message type: ' + msg.hm_type);
    }
  }


  /**
  * [PRIVATE]
  *
  * Read a V2 object header. Object headers contain a series of messages that define
  * an HDF5 object, primarily a group or a dataset. V2 object headers, and V2 objects
  * generally, are much less concerned about alignment than V1 objects.
  */
  hdf5V2ObjectHeader(link) {
    if (!this.checkSignature("OHDR")) {
      throw new Error('Bad or missing OHDR signature');
    }

    var ver = this.getU8();
    var flags = this.getU8();

    if ((flags & 0x20) !== 0) {
      this.getU32();          // access time (IGNORE)
      this.getU32();          // modify time (IGNORE)
      this.getU32();          // change time (IGNORE)
      this.getU32();          // birth time (IGNORE)
    }

    if ((flags & 0x10) !== 0) {
      this.getU16(); // maximum number of compact attributes (IGNORE)
      this.getU16(); // maximum number of dense attributes (IGNORE)
    }

    var cb = 1 << (flags & 3);
    var ck0_size = this.getUXX(cb);

    var msg_num = 0;
    var msg_offs = 0;
    var msg_bytes = ck0_size;

    if (this.getMetadata("debug")) {
      console.log("this.hdf5V2ObjectHeader V" + ver + " F" + flags + " HS" + ck0_size);
    }

    var hmsg;
    var cq_head;
    var spp;

    while (true) {
      while (msg_bytes - msg_offs >= 8) {
        hmsg = {};
        hmsg.hm_type = this.getU8();
        hmsg.hm_size = this.getU16();
        hmsg.hm_flags = this.getU8();
        if (this.getMetadata("debug")) {
          console.log("  msg" + msg_num + " F" + hmsg.hm_flags + " T " +
                      hmsg.hm_type + " S " + hmsg.hm_size +
                      " (" + msg_offs + "/" + msg_bytes + ") " +
                      this.hdf5GetMsgName(hmsg.hm_type));
        }
        if ((flags & 0x04) !== 0) {
          hmsg.hm_corder = this.getU16();
        }
        spp = this.tell();
        this.hdf5ProcessMessage(hmsg, link);
        this.seek(spp + hmsg.hm_size); // this.skip past message.

        msg_offs += hmsg.hm_size + 4;

        msg_num += 1;
      }

      if ((msg_bytes - msg_offs) > 4) {
        this.skip(msg_bytes - (msg_offs + 4));
      }

      this.getU32();          // checksum (IGNORE)

      if (this._continuation_queue.length !== 0) {
        cq_head = this._continuation_queue.shift();
        this.seek(cq_head.cq_off);
        msg_bytes = cq_head.cq_len - 4;
        msg_offs = 0;
        if (this.getMetadata("debug")) {
          console.log('continuing with ' + cq_head.cq_len + ' bytes at ' + this.tell());
        }
        if (!this.checkSignature("OCHK")) {
          throw new Error("Bad v2 object continuation");
        }
      } else {
        break;
      }
    }

    link.children.forEach(function (child, link_num) {
      that.seek(child.hdr_offset);
      if (that.getMetadata("debug")) {
        console.log(link_num + " " + child.hdr_offset + " " + child.name);
      }
      if (this.checkSignature("OHDR")) {
        that.seek(child.hdr_offset);
        that.hdf5V2ObjectHeader(child);
      }
      else {
        that.seek(child.hdr_offset);
        that.hdf5V1ObjectHeader(child);
      }
    });
  }


  /**
  * [PRIVATE]
  */
  loadData(link) {
    var that = this;

    if (link.chunk_size !== 0) {
      this.seek(link.data_offset);

      var n_bytes = 1;
      var i;
      for (i = 0; i < link.dims.length; i += 1) {
        n_bytes *= link.dims[i];
      }
      n_bytes *= this.typeSize(link.type);
      if (this.getMetadata("debug")) {
        console.log('allocating ' + n_bytes + ' bytes');
      }
      var ab = new ArrayBuffer(n_bytes);
      link.n_filled = 0;
      switch (link.type) {
      case this._type_enum.INT8:
        link.array = new Int8Array(ab);
        break;
      case this._type_enum.UINT8:
        link.array = new Uint8Array(ab);
        break;
      case this._type_enum.INT16:
        link.array = new Int16Array(ab);
        break;
      case this._type_enum.UINT16:
        link.array = new Uint16Array(ab);
        break;
      case this._type_enum.INT32:
        link.array = new Int32Array(ab);
        break;
      case this._type_enum.UINT32:
        link.array = new Uint32Array(ab);
        break;
      case this._type_enum.FLT:
        link.array = new Float32Array(ab);
        break;
      case this._type_enum.DBL:
        link.array = new Float64Array(ab);
        break;
      default:
        throw new Error('Illegal type: ' + link.type);
      }
      this.hdf5V1BtreeNode(link);
    } else {
      if (link.data_offset > 0 && link.data_offset < this._superblk.eof_addr) {
        if (this.getMetadata("debug")) {
          console.log('loading ' + link.data_length + ' bytes from ' + link.data_offset + ' to ' + link.name);
        }
        link.array = this.getArray(link.type, link.data_length,
                                   link.data_offset);
      } else {
        if (this.getMetadata("debug")) {
          console.log('data not present for /' + link.name + '/');
        }
      }
    }

    link.children.forEach(function (child) {
      that.loadData(child);
    });
  }


  /**
  * [PRIVATE]
  *
  * Read a v1 object header. Object headers contain a series of
  * messages that define an HDF5 object, primarily a group or a
  * dataset. The v1 object header, like most of the v1 format, is
  * very careful about alignment. Every message must be on an
  * 8-byte alignment RELATIVE TO THE START OF THE HEADER. So if the
  * header starts on an odd boundary, messages may start on odd
  * boundaries as well. No, this doesn't make much sense.
  */
  hdf5V1ObjectHeader(link) {
    var that = this;
    var oh = {};
    this.startAlignment();
    oh.oh_ver = this.getU8();
    this.skip(1);                // reserved
    oh.oh_n_msgs = this.getU16();
    oh.oh_ref_cnt = this.getU32();
    oh.oh_hdr_sz = this.getU32();
    if (oh.oh_ver !== 1) {
      throw new Error("Bad v1 object header version: " + oh.oh_ver);
    }
    if (this.getMetadata("debug")) {
      console.log("this.hdf5V1ObjectHeader V" + oh.oh_ver +
                  " #M " + oh.oh_n_msgs +
                  " RC " + oh.oh_ref_cnt +
                  " HS " + oh.oh_hdr_sz);
    }

    var msg_bytes = oh.oh_hdr_sz;
    var cq_head;
    var msg_num;
    var hmsg;
    var spp;

    for (msg_num = 0; msg_num < oh.oh_n_msgs; msg_num += 1) {
      if (msg_bytes <= 8) {
        if (this._continuation_queue.length !== 0) {
          cq_head = this._continuation_queue.shift();
          this.seek(cq_head.cq_off);
          msg_bytes = cq_head.cq_len;
          if (this.getMetadata("debug")) {
            console.log('continuing with ' + msg_bytes + ' bytes at ' + this.tell());
          }
          this.startAlignment();
        } else {
          break;
        }
      }

      this.checkAlignment();

      hmsg = {};
      hmsg.hm_type = this.getU16();
      hmsg.hm_size = this.getU16();
      hmsg.hm_flags = this.getU8();

      if ((hmsg.hm_size % 8) !== 0) {
        throw new Error('Size is not 8-byte aligned: ' + hmsg.hm_size);
      }
      this.skip(3);            // this.skip reserved
      msg_bytes -= (8 + hmsg.hm_size);
      if (this.getMetadata("debug")) {
        console.log("  msg" + msg_num +
                    " F " + hmsg.hm_flags +
                    " T " + hmsg.hm_type +
                    " S " + hmsg.hm_size +
                    "(" + msg_bytes + ") " + this.hdf5GetMsgName(hmsg.hm_type));
      }

      spp = this.tell();
      this.hdf5ProcessMessage(hmsg, link);
      this.seek(spp + hmsg.hm_size); // this.skip whole message.
    }

    if (link.sym_btree !== 0 && link.sym_lheap !== 0) {
      this.seek(link.sym_btree);
      var bt = this.hdf5V1BtreeNode();
      this.seek(link.sym_lheap);
      var lh = this.hdf5LocalHeap();
      var i;
      for (i = 0; i < bt.entries_used; i += 1) {
        this.seek(bt.keys[i].child_address);
        if (this.checkSignature("SNOD")) {
          this.seek(bt.keys[i].child_address);
          this.hdf5GroupSymbolTable(lh, link);
        } else {
          this.seek(bt.keys[i].child_address);
          this.hdf5V1ObjectHeader(link);
        }
      }

      link.children.forEach(function (child) {
        that.seek(child.hdr_offset);
        that.hdf5V1ObjectHeader(child);
      });
    }
  }


//------------------------------------------------------------------------------
//      FROM hdf5_tools.js

  getTypeMatchMinc(typeEnumVal){
    return this._type_matching[typeEnumVal - 1];
  }



  defined(x) {
      return typeof x !== 'undefined';
  }


  typeName(x) {
      if (! this.defined(x)) {
          return "undefined";
      }
      return x.constructor.name;
  }



  typeSize(typ) {
      if (typ >= this._type_enum.INT8 && typ < this.type_sizes.length) {
          return this.type_sizes[typ];
      }
      throw new Error('Unknown type ' + typ);
  }


  typeIsFloat(typ) {
      return (typ >= this._type_enum.FLT && typ <=this._type_enum.DBL);
  }


    /*
     * The remaining code after this point is not truly HDF5 specific -
     * it's mostly about converting the MINC file into the form
     * BrainBrowser is able to use. Therefore it is used for both HDF5
     * and NetCDF files.
     */

    /*
     * Join does not seem to be defined on the typed arrays in
     * javascript, so I've re-implemented it here, sadly.
     */
    join(array, string) {
      var result = "";
      if (array && array.length) {
        var i;
        for (i = 0; i < array.length - 1; i += 1) {
          result += array[i];
          result += string;
        }
        result += array[i];
      }
      return result;
    }

    /*
     * Recursively print out the structure and contents of the file.
     * Primarily useful for debugging.
     */
    printStructure(link, level) {
      var that = this;

      var i;
      var msg = "";
      for (i = 0; i < level * 2; i += 1) {
        msg += " ";
      }
      msg += link.name + (link.children.length ? "/" : "");
      if (link.type > 0) {
        msg += ' ' + this.typeName(link.array);
        if (link.dims.length) {
          msg += '[' + link.dims.join(', ') + ']';
        }
        if (link.array) {
          msg += ":" + link.array.length;
        } else {
          msg += " NULL";
        }
      }
      console.log(msg);

      Object.keys(link.attributes).forEach(function (name) {
        var value = link.attributes[name];

        msg = "";
        for (i = 0; i < level * 2 + 1; i += 1) {
          msg += " ";
        }
        msg += link.name + ':' + name + " " +
          that.typeName(value) + "[" + value.length + "] ";
        if (typeof value === "string") {
          msg += JSON.stringify(value);
        } else {
          msg += "{" + that.join(value.slice(0, 16), ', ');
          if (value.length > 16) {
            msg += ", ...";
          }
          msg += "}";
        }
        console.log(msg);
      });

      link.children.forEach(function (child) {
        that.printStructure(child, level + 1);
      });
    }

    /* Find a dataset with a given name, by recursively searching through
     * the links. Groups will have 'type' fields of -1, since they contain
     * no data.
     * TODO (maybe): Use associative array for children?
     */
    findDataset(link, name, level) {
      var that = this;
      var result;
      if (link && link.name === name && link.type > 0) {
        result = link;
      } else {
        link.children.find( function( child ) {
          result = that.findDataset(child, name, level + 1);
          return that.defined(result);
        });
      }
      return result;
    }

    /* Find an attribute with a given name.
     */
    findAttribute(link, name, level) {
      var that = this;
      var result = link.attributes[name];
      if (result)
        return result;

      link.children.find( function (child ) {
        result = that.findAttribute( child, name, level + 1);
        return that.defined(result);
      });
      return result;
    }

    /**
     * @doc function
     * @name hdf5.this.scaleVoxels
     * @param {object} image The link object corresponding to the image data.
     * @param {object} image_min The link object corresponding to the image-min
     * data.
     * @param {object} image_max The link object corresponding to the image-max
     * data.
     * @param {object} valid_range An array of exactly two items corresponding
     * to the minimum and maximum valid _raw_ voxel values.
     * @param {boolean} debug True if we should print debugging information.
     * @returns A new ArrayBuffer containing the rescaled data.
     * @description
     * Convert the MINC data from voxel to real range. This returns a
     * new buffer that contains the "real" voxel values. It does less
     * work for floating-point volumes, since they don't need scaling.
     *
     * For debugging/testing purposes, also gathers basic voxel statistics,
     * for comparison against mincstats.
     */
    scaleVoxels(image, image_min, image_max, valid_range, debug) {
      /*
      var new_abuf = new ArrayBuffer(image.array.length *
                                     Float32Array.BYTES_PER_ELEMENT);
      var new_data = new Float32Array(new_abuf);

      */

      // 1D array to store the voxel data,
      // not initialized yet because it depends on the hdf5 type.
      var new_abuf = null;
      var new_data = null;

      // we could simply use image.type, but written types are easier to read...
      switch (this.getTypeMatchMinc(image.type)) {
        case 'int8':
          new_abuf = new ArrayBuffer(image.array.length * Int8Array.BYTES_PER_ELEMENT);
          new_data = new Int8Array(new_abuf);
          break;

        case 'int16':
          new_abuf = new ArrayBuffer(image.array.length * Int16Array.BYTES_PER_ELEMENT);
          new_data = new Int16Array(new_abuf);
          break;

        case 'int32':
          new_abuf = new ArrayBuffer(image.array.length * Int32Array.BYTES_PER_ELEMENT);
          new_data = new Int32Array(new_abuf);
          break;

        case 'float32':
          new_abuf = new ArrayBuffer(image.array.length * Float32Array.BYTES_PER_ELEMENT);
          new_data = new Float32Array(new_abuf);
          break;

        case 'float64':
          new_abuf = new ArrayBuffer(image.array.length * Float64Array.BYTES_PER_ELEMENT);
          new_data = new Float64Array(new_abuf);
          break;

        case 'uint8':
          new_abuf = new ArrayBuffer(image.array.length * Uint8Array.BYTES_PER_ELEMENT);
          new_data = new Uint8Array(new_abuf);
          break;

        case 'uint16':
          new_abuf = new ArrayBuffer(image.array.length * Uint16Array.BYTES_PER_ELEMENT);
          new_data = new Uint16Array(new_abuf);
          break;

        case 'uint32':
          new_abuf = new ArrayBuffer(image.array.length * Uint32Array.BYTES_PER_ELEMENT);
          new_data = new Uint32Array(new_abuf);
          break;

        default:
          var error_message = "Unsupported data type: " + header.datatype;
          console.log({ message: error_message } );
          //BrainBrowser.events.triggerEvent("error", { message: error_message } );
          throw new Error(error_message);

      }


      var n_slice_dims = image.dims.length - image_min.dims.length;

      if (n_slice_dims < 1) {
        throw new Error("Too few slice dimensions: " + image.dims.length +
                        " " + image_min.dims.length);
      }
      var n_slice_elements = 1;
      var i;
      for (i = image_min.dims.length; i < image.dims.length; i += 1) {
        n_slice_elements *= image.dims[i];
      }
      if (debug) {
        console.log(n_slice_elements + " voxels in slice.");
      }
      var s = 0;
      var c = 0;
      var x = -Number.MAX_VALUE;
      var n = Number.MAX_VALUE;
      var im = image.array;
      var im_max = image_max.array;
      var im_min = image_min.array;
      if (debug) {
        console.log("valid range is " + valid_range[0] + " to " + valid_range[1]);
      }

      var vrange;
      var rrange;
      var vmin = valid_range[0];
      var rmin;
      var j;
      var v;
      var is_float = this.typeIsFloat(image.type);
      for (i = 0; i < image_min.array.length; i += 1) {
        if (debug) {
          console.log(i + " " + im_min[i] + " " + im_max[i] + " " +
                      im[i * n_slice_elements]);
        }
        if (is_float) {
          /* For floating-point volumes there is no scaling to be performed.
           * We do scan the data and make sure voxels are within the valid
           * range, and collect our statistics.
           */
          for (j = 0; j < n_slice_elements; j += 1) {
            v = im[c];
            if (v < valid_range[0] || v > valid_range[1]) {
              new_data[c] = 0.0;
            }
            else {
              new_data[c] = v;
              s += v;
              if (v > x) {
                x = v;
              }
              if (v < n) {
                n = v;
              }
            }
            c += 1;
          }
        }
        else {
          /* For integer volumes we have to scale each slice according to image-min,
           * image-max, and valid_range.
           */
          vrange = (valid_range[1] - valid_range[0]);
          rrange = (im_max[i] - im_min[i]);
          rmin = im_min[i];

          /*
          console.log(n_slice_elements);
          console.log(vrange);
          console.log(rrange);
          console.log(rmin);
          console.log("-----------------");
          */


          for (j = 0; j < n_slice_elements; j += 1) {

            // v normalization to avoid "flickering".
            // v is scaled to the range [0, im_max[i]]
            // (possibly uint16 if the original per-slice min-max was not scaled up/down)
            v = (im[c] - vmin) / vrange * rrange + rmin;

            // we scale up/down to match the type of the target array
            v = v / im_max[i] * valid_range[1];


            new_data[c] = v;
            s += v;
            c += 1;
            if (v > x) {
              x = v;
            }
            if (v < n) {
              n = v;
            }

          }

        }
      }

      if (debug) {
        console.log("Min: " + n);
        console.log("Max: " + x);
        console.log("Sum: " + s);
        console.log("Mean: " + s / c);
      }

      return new_abuf;
    }

    /**
     * @doc function
     * @name hdf5.this.isRgbVolume
     * @param {object} header The header object representing the structure
     * of the MINC file.
     * @param {object} image The typed array object used to represent the
     * image data.
     * @returns {boolean} True if this is an RGB volume.
     * @description
     * A MINC volume is an RGB volume if all three are true:
     * 1. The voxel type is unsigned byte.
     * 2. It has a vector_dimension in the last (fastest-varying) position.
     * 3. The vector dimension has length 3.
     */
    isRgbVolume(header, image) {
      var order = header.order;
      return (image.array.constructor.name === 'Uint8Array' &&
              order.length > 0 &&
              order[order.length - 1] === "vector_dimension" &&
              header.vector_dimension.space_length === 3);
    }

    /**
     * @doc function
     * @name hdf5.this.rgbVoxels
     * @param {object} image The 'link' object created using createLink(),
     * that corresponds to the image within the HDF5 or NetCDF file.
     * @returns {object} A new ArrayBuffer that contains the original RGB
     * data augmented with alpha values.
     * @description
     * This function copies the RGB voxels to the destination buffer.
     * Essentially we just convert from 24 to 32 bits per voxel. This
     * is another MINC-specific function.
     */
    rgbVoxels(image) {
      var im = image.array;
      var n = im.length;
      var new_abuf = new ArrayBuffer(n / 3 * 4);
      var new_byte = new Uint8Array(new_abuf);
      var i, j = 0;
      for (i = 0; i < n; i += 3) {
        new_byte[j+0] = im[i+0];
        new_byte[j+1] = im[i+1];
        new_byte[j+2] = im[i+2];
        new_byte[j+3] = 255;
        j += 4;
      }
      return new_abuf;
    }


  //----------------------------------------------------------------------------
  // FROM minc_reader.js
  parseHeader(header_text) {
    var header;
    var error_message;

    try{
      header = JSON.parse(header_text);
    } catch(error) {
      error_message = "server did not respond with valid JSON" + "\n" +
      "Response was: \n" + header_text;

      console.log( { message: error_message });

      //  BrainBrowser.events.triggerEvent("error", { message: error_message });
      throw new Error(error_message);
    }

    if(header.order.length === 4) {
      header.order = header.order.slice(1);
    }

    header.datatype = header.datatype || "uint8";

    header.xspace.space_length = parseFloat(header.xspace.space_length);
    header.yspace.space_length = parseFloat(header.yspace.space_length);
    header.zspace.space_length = parseFloat(header.zspace.space_length);

    header.xspace.start = parseFloat(header.xspace.start);
    header.yspace.start = parseFloat(header.yspace.start);
    header.zspace.start = parseFloat(header.zspace.start);

    header.xspace.step = parseFloat(header.xspace.step);
    header.yspace.step = parseFloat(header.yspace.step);
    header.zspace.step = parseFloat(header.zspace.step);

    header.xspace.direction_cosines = header.xspace.direction_cosines || [1, 0, 0];
    header.yspace.direction_cosines = header.yspace.direction_cosines || [0, 1, 0];
    header.zspace.direction_cosines = header.zspace.direction_cosines || [0, 0, 1];

    header.xspace.direction_cosines = header.xspace.direction_cosines.map(parseFloat);
    header.yspace.direction_cosines = header.yspace.direction_cosines.map(parseFloat);
    header.zspace.direction_cosines = header.zspace.direction_cosines.map(parseFloat);

    /* Incrementation offsets for each dimension of the volume.
    * Note that this somewhat format-specific, so it does not
    * belong in the generic "createVolume()" code.
    */
    header[header.order[0]].offset = header[header.order[1]].space_length * header[header.order[2]].space_length;
    header[header.order[1]].offset = header[header.order[2]].space_length;
    header[header.order[2]].offset = 1;

    if(header.time) {
      header.time.space_length = parseFloat(header.time.space_length);
      header.time.start = parseFloat(header.time.start);
      header.time.step = parseFloat(header.time.step);
      header.time.offset = header.xspace.space_length * header.yspace.space_length * header.zspace.space_length;
    }

    return header;
  }



  createMincVolume(header, raw_data){
    var volume = createVolume(header, createMincData(header, raw_data));
    volume.type = "minc";

    volume.saveOriginAndTransform(header);
    volume.intensity_min = header.voxel_min;
    volume.intensity_max = header.voxel_max;

    return volume;

  }


  //----------------------------------------------------------------------------

  _run(){
    var that = this;

    var inputBuffer = this._getInput(0);

    this._dv = new DataView(inputBuffer);


    /* Patch in the missing function to get 64-bit integers.
     * Note: this won't really quite work b/c Javascript doesn't
     * have support for 64-bit integers.
     */
    this._dv.getUint64 = function (off, little_endian) {
      var l4 = that._dv.getUint32(off + 0, little_endian);
      var u4 = that._dv.getUint32(off + 4, little_endian);
      if (little_endian) {
        return (u4 << 32) + l4;
      } else {
        return (l4 << 32) + u4;
      }
    };


    var root = this.createLink();

    this._superblk = this.hdf5Superblock();
    this.seek(this._superblk.root_addr);

    if (this._superblk.sbver <= 1) {
      this.hdf5V1ObjectHeader(root);
    } else {
      this.hdf5V2ObjectHeader(root);
    }

    this.loadData(root);





    if (this.getMetadata("debug")) {
      this.printStructure(root, 0);
    }

    /* The rest of this code is MINC-specific, so like some of the
     * functions above, it can migrate into minc.js once things have
     * stabilized.
     *
     * This code is responsible for collecting up the various pieces
     * of important data and metadata, and reorganizing them into the
     * form the volume viewer can handle.
     */
    var image = this.findDataset(root, "image");
    if (!this.defined(image)) {
      throw new Error("Can't find image dataset.");
    }

    console.log(image);

    var valid_range = this.findAttribute(image, "valid_range", 0);
    /* If no valid_range is found, we substitute our own. */
    if (!this.defined(valid_range)) {
      var min_val;
      var max_val;
      switch (image.type) {
      case this._type_enum.INT8:
        min_val = -(1 << 7);
        max_val = (1 << 7) - 1;
        break;
      case this._type_enum.UINT8:
        min_val = 0;
        max_val = (1 << 8) - 1;
        break;
      case this._type_enum.INT16:
        min_val = -(1 << 15);
        max_val = (1 << 15) - 1;
        break;
      case this._type_enum.UINT16:
        min_val = 0;
        max_val = (1 << 16) - 1;
        break;
      case this._type_enum.INT32:
        min_val = -(1 << 31);
        max_val = (1 << 31) - 1;
        break;
      case this._type_enum.UINT32:
        min_val = 0;
        max_val = (1 << 32) - 1;
        break;
      }
      valid_range = Float32Array.of(min_val, max_val);
    }


    var image_min = this.findDataset(root, "image-min");
    if (!this.defined(image_min)) {
      image_min = {
        array: Float32Array.of(0),
        dims: []
      };
    }

    var image_max = this.findDataset(root, "image-max");
    if (!this.defined(image_max)) {
      image_max = {
        array: Float32Array.of(1),
        dims: []
      };
    }


    /* Create the header expected by the existing brainbrowser code.
     */
    var header = {};
    var tmp = this.findAttribute(image, "dimorder", 0);
    if (typeof tmp !== 'string') {
      throw new Error("Can't find dimension order.");
    }
    header.order = tmp.split(',');

    header.order.forEach(function(dimname) {
      var dim = that.findDataset(root, dimname);
      if (!that.defined(dim)) {
        throw new Error("Can't find dimension variable " + dimname);
      }

      header[dimname] = {};

      tmp = that.findAttribute(dim, "step", 0);
      if (!that.defined(tmp)) {
        tmp = Float32Array.of(1);
      }
      header[dimname].step = tmp[0];

      tmp = that.findAttribute(dim, "start", 0);
      if (!that.defined(tmp)) {
        tmp = Float32Array.of(0);
      }
      header[dimname].start = tmp[0];

      tmp = that.findAttribute(dim, "length", 0);
      if (!that.defined(tmp)) {
        throw new Error("Can't find length for " + dimname);
      }
      header[dimname].space_length = tmp[0];

      tmp = that.findAttribute(dim, "direction_cosines", 0);
      if (that.defined(tmp)) {
        // why is the bizarre call to slice needed?? it seems to work, though!
        header[dimname].direction_cosines = Array.prototype.slice.call(tmp);
      }
      else {
        if (dimname === "xspace") {
          header[dimname].direction_cosines = [1, 0, 0];
        } else if (dimname === "yspace") {
          header[dimname].direction_cosines = [0, 1, 0];
        } else if (dimname === "zspace") {
          header[dimname].direction_cosines = [0, 0, 1];
        }
      }
    });

    var new_abuf;

    if (this.isRgbVolume(header, image)) {
      header.order.pop();
      header.datatype = 'rgb8';
      new_abuf = this.rgbVoxels(image);
    }
    else {

      //header.datatype = 'float32';
      header.datatype = this.getTypeMatchMinc(image.type);

      new_abuf = this.scaleVoxels(image, image_min, image_max, valid_range, this.getMetadata("debug"));
    }


    var hdf5_data = {
      header_text: JSON.stringify(header),
      raw_data: new_abuf
    };

    console.log( hdf5_data );

    var minc_header = this.parseHeader(hdf5_data.header_text);
    console.log(minc_header);
    //var minc_volume = createMincVolume(minc_header, hdf5_data.raw_data);
  }



} /* END of class Hdf5Decoder */

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
    this._addOutput( Image2D );
  }


  /**
  * Run the filter
  */
  _run(){
    if( ! this.hasValidInput())
      return;

    var inputImage2D = this._getInput();
    var firstPixel = 0;
    var lastPixel = inputImage2D.getWidth() * inputImage2D.getHeight();
    var increment = 1;

    this._inputBuffer = inputImage2D.getDataCopy();

    this._forEachPixelOfSuch(firstPixel, lastPixel, increment );

    // 1 - init the output
    var outputImg = this.getOutput();
    console.log(outputImg.uuid);

    // 2 - tune the output
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

    this._addOutput( Image2D );
  }


  /**
  * Run the filter
  */
  _run(){
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
    var img2D = this.getOutput();
    img2D.setData(
      data0,
      dataImg0.getWidth(),
      dataImg0.getHeight()
    );

  }


} /* END class SpectralScaleImageFilter */

var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};





function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var bundle = createCommonjsModule(function (module, exports) {
(function (global, factory) {
  module.exports = factory();
}(commonjsGlobal, (function () { 'use strict';

/*!
 Based on ndef.parser, by Raphael Graf(r@undefined.ch)
 http://www.undefined.ch/mparser/index.html

 Ported to JavaScript and modified by Matthew Crumley (email@matthewcrumley.com, http://silentmatt.com/)

 You are free to use and modify this code in anyway you find useful. Please leave this comment in the code
 to acknowledge its original source. If you feel like it, I enjoy hearing about projects that use my code,
 but don't feel like you have to let me know or ask permission.
*/

function indexOf(array, obj) {
  for (var i = 0; i < array.length; i++) {
    if (array[i] === obj) {
      return i;
    }
  }
  return -1;
}

var INUMBER = 'INUMBER';
var IOP1 = 'IOP1';
var IOP2 = 'IOP2';
var IOP3 = 'IOP3';
var IVAR = 'IVAR';
var IFUNCALL = 'IFUNCALL';
var IEXPR = 'IEXPR';
var IMEMBER = 'IMEMBER';

function Instruction(type, value) {
  this.type = type;
  this.value = (value !== undefined && value !== null) ? value : 0;
}

Instruction.prototype.toString = function () {
  switch (this.type) {
    case INUMBER:
    case IOP1:
    case IOP2:
    case IOP3:
    case IVAR:
      return this.value;
    case IFUNCALL:
      return 'CALL ' + this.value;
    case IMEMBER:
      return '.' + this.value;
    default:
      return 'Invalid Instruction';
  }
};

function Expression(tokens, parser) {
  this.tokens = tokens;
  this.parser = parser;
  this.unaryOps = parser.unaryOps;
  this.binaryOps = parser.binaryOps;
  this.ternaryOps = parser.ternaryOps;
  this.functions = parser.functions;
}

function escapeValue(v) {
  if (typeof v === 'string') {
    return JSON.stringify(v).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  }
  return v;
}

function simplify(tokens, unaryOps, binaryOps, ternaryOps, values) {
  var nstack = [];
  var newexpression = [];
  var n1, n2, n3;
  var f;
  for (var i = 0, L = tokens.length; i < L; i++) {
    var item = tokens[i];
    var type = item.type;
    if (type === INUMBER) {
      nstack.push(item);
    } else if (type === IVAR && values.hasOwnProperty(item.value)) {
      item = new Instruction(INUMBER, values[item.value]);
      nstack.push(item);
    } else if (type === IOP2 && nstack.length > 1) {
      n2 = nstack.pop();
      n1 = nstack.pop();
      f = binaryOps[item.value];
      item = new Instruction(INUMBER, f(n1.value, n2.value));
      nstack.push(item);
    } else if (type === IOP3 && nstack.length > 2) {
      n3 = nstack.pop();
      n2 = nstack.pop();
      n1 = nstack.pop();
      if (item.value === '?') {
        nstack.push(n1.value ? n2.value : n3.value);
      } else {
        f = ternaryOps[item.value];
        item = new Instruction(INUMBER, f(n1.value, n2.value, n3.value));
        nstack.push(item);
      }
    } else if (type === IOP1 && nstack.length > 0) {
      n1 = nstack.pop();
      f = unaryOps[item.value];
      item = new Instruction(INUMBER, f(n1.value));
      nstack.push(item);
    } else if (type === IEXPR) {
      while (nstack.length > 0) {
        newexpression.push(nstack.shift());
      }
      newexpression.push(new Instruction(IEXPR, simplify(item.value, unaryOps, binaryOps, ternaryOps, values)));
    } else if (type === IMEMBER && nstack.length > 0) {
      n1 = nstack.pop();
      nstack.push(new Instruction(INUMBER, n1.value[item.value]));
    } else {
      while (nstack.length > 0) {
        newexpression.push(nstack.shift());
      }
      newexpression.push(item);
    }
  }
  while (nstack.length > 0) {
    newexpression.push(nstack.shift());
  }
  return newexpression;
}

Expression.prototype.simplify = function (values) {
  values = values || {};
  return new Expression(simplify(this.tokens, this.unaryOps, this.binaryOps, this.ternaryOps, values), this.parser);
};

function substitute(tokens, variable, expr) {
  var newexpression = [];
  for (var i = 0, L = tokens.length; i < L; i++) {
    var item = tokens[i];
    var type = item.type;
    if (type === IVAR && item.value === variable) {
      for (var j = 0; j < expr.tokens.length; j++) {
        var expritem = expr.tokens[j];
        var replitem;
        if (expritem.type === IOP1) {
          replitem = unaryInstruction(expritem.value);
        } else if (expritem.type === IOP2) {
          replitem = binaryInstruction(expritem.value);
        } else if (expritem.type === IOP3) {
          replitem = ternaryInstruction(expritem.value);
        } else {
          replitem = new Instruction(expritem.type, expritem.value);
        }
        newexpression.push(replitem);
      }
    } else if (type === IEXPR) {
      newexpression.push(new Instruction(IEXPR, substitute(item.value, variable, expr)));
    } else {
      newexpression.push(item);
    }
  }
  return newexpression;
}

Expression.prototype.substitute = function (variable, expr) {
  if (!(expr instanceof Expression)) {
    expr = this.parser.parse(String(expr));
  }

  return new Expression(substitute(this.tokens, variable, expr), this.parser);
};

function evaluate(tokens, expr, values) {
  var nstack = [];
  var n1, n2, n3;
  var f;
  for (var i = 0, L = tokens.length; i < L; i++) {
    var item = tokens[i];
    var type = item.type;
    if (type === INUMBER) {
      nstack.push(item.value);
    } else if (type === IOP2) {
      n2 = nstack.pop();
      n1 = nstack.pop();
      f = expr.binaryOps[item.value];
      nstack.push(f(n1, n2));
    } else if (type === IOP3) {
      n3 = nstack.pop();
      n2 = nstack.pop();
      n1 = nstack.pop();
      if (item.value === '?') {
        nstack.push(evaluate(n1 ? n2 : n3, expr, values));
      } else {
        f = expr.ternaryOps[item.value];
        nstack.push(f(n1, n2, n3));
      }
    } else if (type === IVAR) {
      if (item.value in expr.functions) {
        nstack.push(expr.functions[item.value]);
      } else {
        var v = values[item.value];
        if (v !== undefined) {
          nstack.push(v);
        } else {
          throw new Error('undefined variable: ' + item.value);
        }
      }
    } else if (type === IOP1) {
      n1 = nstack.pop();
      f = expr.unaryOps[item.value];
      nstack.push(f(n1));
    } else if (type === IFUNCALL) {
      var argCount = item.value;
      var args = [];
      while (argCount-- > 0) {
        args.unshift(nstack.pop());
      }
      f = nstack.pop();
      if (f.apply && f.call) {
        nstack.push(f.apply(undefined, args));
      } else {
        throw new Error(f + ' is not a function');
      }
    } else if (type === IEXPR) {
      nstack.push(item.value);
    } else if (type === IMEMBER) {
      n1 = nstack.pop();
      nstack.push(n1[item.value]);
    } else {
      throw new Error('invalid Expression');
    }
  }
  if (nstack.length > 1) {
    throw new Error('invalid Expression (parity)');
  }
  return nstack[0];
}

Expression.prototype.evaluate = function (values) {
  values = values || {};
  return evaluate(this.tokens, this, values);
};

function expressionToString(tokens, toJS) {
  var nstack = [];
  var n1, n2, n3;
  var f;
  for (var i = 0, L = tokens.length; i < L; i++) {
    var item = tokens[i];
    var type = item.type;
    if (type === INUMBER) {
      if (typeof item.value === 'number' && item.value < 0) {
        nstack.push('(' + item.value + ')');
      } else {
        nstack.push(escapeValue(item.value));
      }
    } else if (type === IOP2) {
      n2 = nstack.pop();
      n1 = nstack.pop();
      f = item.value;
      if (toJS) {
        if (f === '^') {
          nstack.push('Math.pow(' + n1 + ', ' + n2 + ')');
        } else if (f === 'and') {
          nstack.push('(!!' + n1 + ' && !!' + n2 + ')');
        } else if (f === 'or') {
          nstack.push('(!!' + n1 + ' || !!' + n2 + ')');
        } else if (f === '||') {
          nstack.push('(String(' + n1 + ') + String(' + n2 + '))');
        } else if (f === '==') {
          nstack.push('(' + n1 + ' === ' + n2 + ')');
        } else if (f === '!=') {
          nstack.push('(' + n1 + ' !== ' + n2 + ')');
        } else {
          nstack.push('(' + n1 + ' ' + f + ' ' + n2 + ')');
        }
      } else {
        nstack.push('(' + n1 + ' ' + f + ' ' + n2 + ')');
      }
    } else if (type === IOP3) {
      n3 = nstack.pop();
      n2 = nstack.pop();
      n1 = nstack.pop();
      f = item.value;
      if (f === '?') {
        nstack.push('(' + n1 + ' ? ' + n2 + ' : ' + n3 + ')');
      } else {
        throw new Error('invalid Expression');
      }
    } else if (type === IVAR) {
      nstack.push(item.value);
    } else if (type === IOP1) {
      n1 = nstack.pop();
      f = item.value;
      if (f === '-' || f === '+') {
        nstack.push('(' + f + n1 + ')');
      } else if (toJS) {
        if (f === 'not') {
          nstack.push('(' + '!' + n1 + ')');
        } else if (f === '!') {
          nstack.push('fac(' + n1 + ')');
        } else {
          nstack.push(f + '(' + n1 + ')');
        }
      } else if (f === '!') {
        nstack.push('(' + n1 + '!)');
      } else {
        nstack.push('(' + f + ' ' + n1 + ')');
      }
    } else if (type === IFUNCALL) {
      var argCount = item.value;
      var args = [];
      while (argCount-- > 0) {
        args.unshift(nstack.pop());
      }
      f = nstack.pop();
      nstack.push(f + '(' + args.join(', ') + ')');
    } else if (type === IMEMBER) {
      n1 = nstack.pop();
      nstack.push(n1 + '.' + item.value);
    } else if (type === IEXPR) {
      nstack.push('(' + expressionToString(item.value, toJS) + ')');
    } else {
      throw new Error('invalid Expression');
    }
  }
  if (nstack.length > 1) {
    throw new Error('invalid Expression (parity)');
  }
  return nstack[0];
}

Expression.prototype.toString = function () {
  return expressionToString(this.tokens, false);
};

function getSymbols(tokens, symbols) {
  for (var i = 0, L = tokens.length; i < L; i++) {
    var item = tokens[i];
    if (item.type === IVAR && (indexOf(symbols, item.value) === -1)) {
      symbols.push(item.value);
    } else if (item.type === IEXPR) {
      getSymbols(item.value, symbols);
    }
  }
}

Expression.prototype.symbols = function () {
  var vars = [];
  getSymbols(this.tokens, vars);
  return vars;
};

Expression.prototype.variables = function () {
  var vars = [];
  getSymbols(this.tokens, vars);
  var functions = this.functions;
  return vars.filter(function (name) {
    return !(name in functions);
  });
};

Expression.prototype.toJSFunction = function (param, variables) {
  var expr = this;
  var f = new Function(param, 'with(this.functions) with (this.ternaryOps) with (this.binaryOps) with (this.unaryOps) { return ' + expressionToString(this.simplify(variables).tokens, true) + '; }'); // eslint-disable-line no-new-func
  return function () {
    return f.apply(expr, arguments);
  };
};

function add(a, b) {
  return Number(a) + Number(b);
}
function sub(a, b) {
  return a - b;
}
function mul(a, b) {
  return a * b;
}
function div(a, b) {
  return a / b;
}
function mod(a, b) {
  return a % b;
}
function concat(a, b) {
  return '' + a + b;
}
function equal(a, b) {
  return a === b;
}
function notEqual(a, b) {
  return a !== b;
}
function greaterThan(a, b) {
  return a > b;
}
function lessThan(a, b) {
  return a < b;
}
function greaterThanEqual(a, b) {
  return a >= b;
}
function lessThanEqual(a, b) {
  return a <= b;
}
function andOperator(a, b) {
  return Boolean(a && b);
}
function orOperator(a, b) {
  return Boolean(a || b);
}
function sinh(a) {
  return ((Math.exp(a) - Math.exp(-a)) / 2);
}
function cosh(a) {
  return ((Math.exp(a) + Math.exp(-a)) / 2);
}
function tanh(a) {
  if (a === Infinity) return 1;
  if (a === -Infinity) return -1;
  return (Math.exp(a) - Math.exp(-a)) / (Math.exp(a) + Math.exp(-a));
}
function asinh(a) {
  if (a === -Infinity) return a;
  return Math.log(a + Math.sqrt(a * a + 1));
}
function acosh(a) {
  return Math.log(a + Math.sqrt(a * a - 1));
}
function atanh(a) {
  return (Math.log((1 + a) / (1 - a)) / 2);
}
function log10(a) {
  return Math.log(a) * Math.LOG10E;
}
function neg(a) {
  return -a;
}
function not(a) {
  return !a;
}
function trunc(a) {
  return a < 0 ? Math.ceil(a) : Math.floor(a);
}
function random(a) {
  return Math.random() * (a || 1);
}
function factorial(a) { // a!
  return gamma(a + 1);
}
function stringLength(s) {
  return String(s).length;
}

function hypot() {
  var sum = 0;
  var larg = 0;
  for (var i = 0, L = arguments.length; i < L; i++) {
    var arg = Math.abs(arguments[i]);
    var div;
    if (larg < arg) {
      div = larg / arg;
      sum = sum * div * div + 1;
      larg = arg;
    } else if (arg > 0) {
      div = arg / larg;
      sum += div * div;
    } else {
      sum += arg;
    }
  }
  return larg === Infinity ? Infinity : larg * Math.sqrt(sum);
}

function condition(cond, yep, nope) {
  return cond ? yep : nope;
}

function isInteger(value) {
  return isFinite(value) && (value === Math.round(value));
}

var GAMMA_G = 4.7421875;
var GAMMA_P = [
  0.99999999999999709182,
  57.156235665862923517, -59.597960355475491248,
  14.136097974741747174, -0.49191381609762019978,
  0.33994649984811888699e-4,
  0.46523628927048575665e-4, -0.98374475304879564677e-4,
  0.15808870322491248884e-3, -0.21026444172410488319e-3,
  0.21743961811521264320e-3, -0.16431810653676389022e-3,
  0.84418223983852743293e-4, -0.26190838401581408670e-4,
  0.36899182659531622704e-5
];

// Gamma function from math.js
function gamma(n) {
  var t, x;

  if (isInteger(n)) {
    if (n <= 0) {
      return isFinite(n) ? Infinity : NaN;
    }

    if (n > 171) {
      return Infinity; // Will overflow
    }

    var value = n - 2;
    var res = n - 1;
    while (value > 1) {
      res *= value;
      value--;
    }

    if (res === 0) {
      res = 1; // 0! is per definition 1
    }

    return res;
  }

  if (n < 0.5) {
    return Math.PI / (Math.sin(Math.PI * n) * gamma(1 - n));
  }

  if (n >= 171.35) {
    return Infinity; // will overflow
  }

  if (n > 85.0) { // Extended Stirling Approx
    var twoN = n * n;
    var threeN = twoN * n;
    var fourN = threeN * n;
    var fiveN = fourN * n;
    return Math.sqrt(2 * Math.PI / n) * Math.pow((n / Math.E), n) *
      (1 + 1 / (12 * n) + 1 / (288 * twoN) - 139 / (51840 * threeN) -
      571 / (2488320 * fourN) + 163879 / (209018880 * fiveN) +
      5246819 / (75246796800 * fiveN * n));
  }

  --n;
  x = GAMMA_P[0];
  for (var i = 1; i < GAMMA_P.length; ++i) {
    x += GAMMA_P[i] / (n + i);
  }

  t = n + GAMMA_G + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, n + 0.5) * Math.exp(-t) * x;
}

var TEOF = 'TEOF';
var TOP = 'TOP';
var TNUMBER = 'TNUMBER';
var TSTRING = 'TSTRING';
var TPAREN = 'TPAREN';
var TCOMMA = 'TCOMMA';
var TNAME = 'TNAME';

function Token(type, value, line, column) {
  this.type = type;
  this.value = value;
  this.line = line;
  this.column = column;
}

Token.prototype.toString = function () {
  return this.type + ': ' + this.value;
};

function TokenStream(expression, unaryOps, binaryOps, ternaryOps, consts) {
  this.pos = 0;
  this.line = 0;
  this.column = 0;
  this.current = null;
  this.unaryOps = unaryOps;
  this.binaryOps = binaryOps;
  this.ternaryOps = ternaryOps;
  this.consts = consts;
  this.expression = expression;
  this.savedPosition = 0;
  this.savedCurrent = null;
  this.savedLine = 0;
  this.savedColumn = 0;
}

TokenStream.prototype.newToken = function (type, value, line, column) {
  return new Token(type, value, line != null ? line : this.line, column != null ? column : this.column);
};

TokenStream.prototype.save = function () {
  this.savedPosition = this.pos;
  this.savedCurrent = this.current;
  this.savedLine = this.line;
  this.savedColumn = this.column;
};

TokenStream.prototype.restore = function () {
  this.pos = this.savedPosition;
  this.current = this.savedCurrent;
  this.line = this.savedLine;
  this.column = this.savedColumn;
};

TokenStream.prototype.next = function () {
  if (this.pos >= this.expression.length) {
    return this.newToken(TEOF, 'EOF');
  }

  if (this.isWhitespace() || this.isComment()) {
    return this.next();
  } else if (this.isNumber() ||
      this.isOperator() ||
      this.isString() ||
      this.isParen() ||
      this.isComma() ||
      this.isNamedOp() ||
      this.isConst() ||
      this.isName()) {
    return this.current;
  } else {
    this.parseError('Unknown character "' + this.expression.charAt(this.pos) + '"');
  }
};

TokenStream.prototype.isString = function () {
  var r = false;
  var startLine = this.line;
  var startColumn = this.column;
  var startPos = this.pos;
  var quote = this.expression.charAt(startPos);

  if (quote === '\'' || quote === '"') {
    this.pos++;
    this.column++;
    var index = this.expression.indexOf(quote, startPos + 1);
    while (index >= 0 && this.pos < this.expression.length) {
      this.pos = index + 1;
      if (this.expression.charAt(index - 1) !== '\\') {
        var rawString = this.expression.substring(startPos + 1, index);
        this.current = this.newToken(TSTRING, this.unescape(rawString), startLine, startColumn);
        var newLine = rawString.indexOf('\n');
        var lastNewline = -1;
        while (newLine >= 0) {
          this.line++;
          this.column = 0;
          lastNewline = newLine;
          newLine = rawString.indexOf('\n', newLine + 1);
        }
        this.column += rawString.length - lastNewline;
        r = true;
        break;
      }
      index = this.expression.indexOf(quote, index + 1);
    }
  }
  return r;
};

TokenStream.prototype.isParen = function () {
  var char = this.expression.charAt(this.pos);
  if (char === '(' || char === ')') {
    this.current = this.newToken(TPAREN, char);
    this.pos++;
    this.column++;
    return true;
  }
  return false;
};

TokenStream.prototype.isComma = function () {
  var char = this.expression.charAt(this.pos);
  if (char === ',') {
    this.current = this.newToken(TCOMMA, ',');
    this.pos++;
    this.column++;
    return true;
  }
  return false;
};

TokenStream.prototype.isConst = function () {
  var startPos = this.pos;
  var i = startPos;
  for (; i < this.expression.length; i++) {
    var c = this.expression.charAt(i);
    if (c.toUpperCase() === c.toLowerCase()) {
      if (i === this.pos || (c !== '_' && c !== '.' && (c < '0' || c > '9'))) {
        break;
      }
    }
  }
  if (i > startPos) {
    var str = this.expression.substring(startPos, i);
    if (str in this.consts) {
      this.current = this.newToken(TNUMBER, this.consts[str]);
      this.pos += str.length;
      this.column += str.length;
      return true;
    }
  }
  return false;
};

TokenStream.prototype.isNamedOp = function () {
  var startPos = this.pos;
  var i = startPos;
  for (; i < this.expression.length; i++) {
    var c = this.expression.charAt(i);
    if (c.toUpperCase() === c.toLowerCase()) {
      if (i === this.pos || (c !== '_' && (c < '0' || c > '9'))) {
        break;
      }
    }
  }
  if (i > startPos) {
    var str = this.expression.substring(startPos, i);
    if (str in this.binaryOps || str in this.unaryOps || str in this.ternaryOps) {
      this.current = this.newToken(TOP, str);
      this.pos += str.length;
      this.column += str.length;
      return true;
    }
  }
  return false;
};

TokenStream.prototype.isName = function () {
  var startPos = this.pos;
  var i = startPos;
  for (; i < this.expression.length; i++) {
    var c = this.expression.charAt(i);
    if (c.toUpperCase() === c.toLowerCase()) {
      if (i === this.pos || (c !== '_' && (c < '0' || c > '9'))) {
        break;
      }
    }
  }
  if (i > startPos) {
    var str = this.expression.substring(startPos, i);
    this.current = this.newToken(TNAME, str);
    this.pos += str.length;
    this.column += str.length;
    return true;
  }
  return false;
};

TokenStream.prototype.isWhitespace = function () {
  var r = false;
  var char = this.expression.charAt(this.pos);
  while (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
    r = true;
    this.pos++;
    this.column++;
    if (char === '\n') {
      this.line++;
      this.column = 0;
    }
    if (this.pos >= this.expression.length) {
      break;
    }
    char = this.expression.charAt(this.pos);
  }
  return r;
};

var codePointPattern = /^[0-9a-f]{4}$/i;

TokenStream.prototype.unescape = function (v) {
  var index = v.indexOf('\\');
  if (index < 0) {
    return v;
  }

  var buffer = v.substring(0, index);
  while (index >= 0) {
    var c = v.charAt(++index);
    switch (c) {
      case '\'':
        buffer += '\'';
        break;
      case '"':
        buffer += '"';
        break;
      case '\\':
        buffer += '\\';
        break;
      case '/':
        buffer += '/';
        break;
      case 'b':
        buffer += '\b';
        break;
      case 'f':
        buffer += '\f';
        break;
      case 'n':
        buffer += '\n';
        break;
      case 'r':
        buffer += '\r';
        break;
      case 't':
        buffer += '\t';
        break;
      case 'u':
        // interpret the following 4 characters as the hex of the unicode code point
        var codePoint = v.substring(index + 1, index + 5);
        if (!codePointPattern.test(codePoint)) {
          this.parseError('Illegal escape sequence: \\u' + codePoint);
        }
        buffer += String.fromCharCode(parseInt(codePoint, 16));
        index += 4;
        break;
      default:
        throw this.parseError('Illegal escape sequence: "\\' + c + '"');
    }
    ++index;
    var backslash = v.indexOf('\\', index);
    buffer += v.substring(index, backslash < 0 ? v.length : backslash);
    index = backslash;
  }

  return buffer;
};

TokenStream.prototype.isComment = function () {
  var char = this.expression.charAt(this.pos);
  if (char === '/' && this.expression.charAt(this.pos + 1) === '*') {
    var startPos = this.pos;
    this.pos = this.expression.indexOf('*/', this.pos) + 2;
    if (this.pos === 1) {
      this.pos = this.expression.length;
    }
    var comment = this.expression.substring(startPos, this.pos);
    var newline = comment.indexOf('\n');
    while (newline >= 0) {
      this.line++;
      this.column = comment.length - newline;
      newline = comment.indexOf('\n', newline + 1);
    }
    return true;
  }
  return false;
};

TokenStream.prototype.isNumber = function () {
  var valid = false;
  var pos = this.pos;
  var startPos = pos;
  var resetPos = pos;
  var column = this.column;
  var resetColumn = column;
  var foundDot = false;
  var foundDigits = false;
  var char;

  while (pos < this.expression.length) {
    char = this.expression.charAt(pos);
    if ((char >= '0' && char <= '9') || (!foundDot && char === '.')) {
      if (char === '.') {
        foundDot = true;
      } else {
        foundDigits = true;
      }
      pos++;
      column++;
      valid = foundDigits;
    } else {
      break;
    }
  }

  if (valid) {
    resetPos = pos;
    resetColumn = column;
  }

  if (char === 'e' || char === 'E') {
    pos++;
    column++;
    var acceptSign = true;
    var validExponent = false;
    while (pos < this.expression.length) {
      char = this.expression.charAt(pos);
      if (acceptSign && (char === '+' || char === '-')) {
        acceptSign = false;
      } else if (char >= '0' && char <= '9') {
        validExponent = true;
        acceptSign = false;
      } else {
        break;
      }
      pos++;
      column++;
    }

    if (!validExponent) {
      pos = resetPos;
      column = resetColumn;
    }
  }

  if (valid) {
    this.current = this.newToken(TNUMBER, parseFloat(this.expression.substring(startPos, pos)));
    this.pos = pos;
    this.column = column;
  } else {
    this.pos = resetPos;
    this.column = resetColumn;
  }
  return valid;
};

TokenStream.prototype.isOperator = function () {
  var char = this.expression.charAt(this.pos);

  if (char === '+' || char === '-' || char === '*' || char === '/' || char === '%' || char === '^' || char === '?' || char === ':' || char === '.') {
    this.current = this.newToken(TOP, char);
  } else if (char === '∙' || char === '•') {
    this.current = this.newToken(TOP, '*');
  } else if (char === '>') {
    if (this.expression.charAt(this.pos + 1) === '=') {
      this.current = this.newToken(TOP, '>=');
      this.pos++;
      this.column++;
    } else {
      this.current = this.newToken(TOP, '>');
    }
  } else if (char === '<') {
    if (this.expression.charAt(this.pos + 1) === '=') {
      this.current = this.newToken(TOP, '<=');
      this.pos++;
      this.column++;
    } else {
      this.current = this.newToken(TOP, '<');
    }
  } else if (char === '|') {
    if (this.expression.charAt(this.pos + 1) === '|') {
      this.current = this.newToken(TOP, '||');
      this.pos++;
      this.column++;
    } else {
      return false;
    }
  } else if (char === '=') {
    if (this.expression.charAt(this.pos + 1) === '=') {
      this.current = this.newToken(TOP, '==');
      this.pos++;
      this.column++;
    } else {
      return false;
    }
  } else if (char === '!') {
    if (this.expression.charAt(this.pos + 1) === '=') {
      this.current = this.newToken(TOP, '!=');
      this.pos++;
      this.column++;
    } else {
      this.current = this.newToken(TOP, char);
    }
  } else {
    return false;
  }
  this.pos++;
  this.column++;
  return true;
};

TokenStream.prototype.parseError = function (msg) {
  throw new Error('parse error [' + (this.line + 1) + ':' + (this.column + 1) + ']: ' + msg);
};

var unaryInstructionCache = {};
function unaryInstruction(value) {
  var inst = unaryInstructionCache[value];
  if (!inst) {
    inst = unaryInstructionCache[value] = new Instruction(IOP1, value);
  }
  return inst;
}

var binaryInstructionCache = {};
function binaryInstruction(value) {
  var inst = binaryInstructionCache[value];
  if (!inst) {
    inst = binaryInstructionCache[value] = new Instruction(IOP2, value);
  }
  return inst;
}

var ternaryInstructionCache = {};
function ternaryInstruction(value) {
  var inst = ternaryInstructionCache[value];
  if (!inst) {
    inst = ternaryInstructionCache[value] = new Instruction(IOP3, value);
  }
  return inst;
}

function ParserState(parser, tokenStream) {
  this.parser = parser;
  this.tokens = tokenStream;
  this.current = null;
  this.nextToken = null;
  this.next();
  this.savedCurrent = null;
  this.savedNextToken = null;
}

ParserState.prototype.next = function () {
  this.current = this.nextToken;
  return (this.nextToken = this.tokens.next());
};

ParserState.prototype.tokenMatches = function (token, value) {
  if (typeof value === 'undefined') {
    return true;
  } else if (Array.isArray(value)) {
    return indexOf(value, token.value) >= 0;
  } else if (typeof value === 'function') {
    return value(token);
  } else {
    return token.value === value;
  }
};

ParserState.prototype.save = function () {
  this.savedCurrent = this.current;
  this.savedNextToken = this.nextToken;
  this.tokens.save();
};

ParserState.prototype.restore = function () {
  this.tokens.restore();
  this.current = this.savedCurrent;
  this.nextToken = this.savedNextToken;
};

ParserState.prototype.accept = function (type, value) {
  if (this.nextToken.type === type && this.tokenMatches(this.nextToken, value)) {
    this.next();
    return true;
  }
  return false;
};

ParserState.prototype.expect = function (type, value) {
  if (!this.accept(type, value)) {
    throw new Error('parse error [' + this.tokens.line + ':' + this.tokens.column + ']: Expected ' + (value || type));
  }
};

ParserState.prototype.parseAtom = function (instr) {
  if (this.accept(TNAME)) {
    instr.push(new Instruction(IVAR, this.current.value));
  } else if (this.accept(TNUMBER)) {
    instr.push(new Instruction(INUMBER, this.current.value));
  } else if (this.accept(TSTRING)) {
    instr.push(new Instruction(INUMBER, this.current.value));
  } else if (this.accept(TPAREN, '(')) {
    this.parseExpression(instr);
    this.expect(TPAREN, ')');
  } else {
    throw new Error('unexpected ' + this.nextToken);
  }
};

ParserState.prototype.parseExpression = function (instr) {
  this.parseConditionalExpression(instr);
};

ParserState.prototype.parseConditionalExpression = function (instr) {
  this.parseOrExpression(instr);
  while (this.accept(TOP, '?')) {
    var trueBranch = [];
    var falseBranch = [];
    this.parseConditionalExpression(trueBranch);
    this.expect(TOP, ':');
    this.parseConditionalExpression(falseBranch);
    instr.push(new Instruction(IEXPR, trueBranch));
    instr.push(new Instruction(IEXPR, falseBranch));
    instr.push(ternaryInstruction('?'));
  }
};

ParserState.prototype.parseOrExpression = function (instr) {
  this.parseAndExpression(instr);
  while (this.accept(TOP, 'or')) {
    this.parseAndExpression(instr);
    instr.push(binaryInstruction('or'));
  }
};

ParserState.prototype.parseAndExpression = function (instr) {
  this.parseComparison(instr);
  while (this.accept(TOP, 'and')) {
    this.parseComparison(instr);
    instr.push(binaryInstruction('and'));
  }
};

ParserState.prototype.parseComparison = function (instr) {
  this.parseAddSub(instr);
  while (this.accept(TOP, ['==', '!=', '<', '<=', '>=', '>'])) {
    var op = this.current;
    this.parseAddSub(instr);
    instr.push(binaryInstruction(op.value));
  }
};

ParserState.prototype.parseAddSub = function (instr) {
  this.parseTerm(instr);
  while (this.accept(TOP, ['+', '-', '||'])) {
    var op = this.current;
    this.parseTerm(instr);
    instr.push(binaryInstruction(op.value));
  }
};

ParserState.prototype.parseTerm = function (instr) {
  this.parseFactor(instr);
  while (this.accept(TOP, ['*', '/', '%'])) {
    var op = this.current;
    this.parseFactor(instr);
    instr.push(binaryInstruction(op.value));
  }
};

ParserState.prototype.parseFactor = function (instr) {
  var unaryOps = this.tokens.unaryOps;
  function isPrefixOperator(token) {
    return token.value in unaryOps;
  }

  this.save();
  if (this.accept(TOP, isPrefixOperator)) {
    if ((this.current.value !== '-' && this.current.value !== '+' && this.nextToken.type === TPAREN && this.nextToken.value === '(')) {
      this.restore();
      this.parseExponential(instr);
    } else {
      var op = this.current;
      this.parseFactor(instr);
      instr.push(unaryInstruction(op.value));
    }
  } else {
    this.parseExponential(instr);
  }
};

ParserState.prototype.parseExponential = function (instr) {
  this.parsePostfixExpression(instr);
  while (this.accept(TOP, '^')) {
    this.parseFactor(instr);
    instr.push(binaryInstruction('^'));
  }
};

ParserState.prototype.parsePostfixExpression = function (instr) {
  this.parseFunctionCall(instr);
  while (this.accept(TOP, '!')) {
    instr.push(unaryInstruction('!'));
  }
};

ParserState.prototype.parseFunctionCall = function (instr) {
  var unaryOps = this.tokens.unaryOps;
  function isPrefixOperator(token) {
    return token.value in unaryOps;
  }

  if (this.accept(TOP, isPrefixOperator)) {
    var op = this.current;
    this.parseAtom(instr);
    instr.push(unaryInstruction(op.value));
  } else {
    this.parseMemberExpression(instr);
    while (this.accept(TPAREN, '(')) {
      if (this.accept(TPAREN, ')')) {
        instr.push(new Instruction(IFUNCALL, 0));
      } else {
        var argCount = this.parseArgumentList(instr);
        instr.push(new Instruction(IFUNCALL, argCount));
      }
    }
  }
};

ParserState.prototype.parseArgumentList = function (instr) {
  var argCount = 0;

  while (!this.accept(TPAREN, ')')) {
    this.parseExpression(instr);
    ++argCount;
    while (this.accept(TCOMMA)) {
      this.parseExpression(instr);
      ++argCount;
    }
  }

  return argCount;
};

ParserState.prototype.parseMemberExpression = function (instr) {
  this.parseAtom(instr);
  while (this.accept(TOP, '.')) {
    this.expect(TNAME);
    instr.push(new Instruction(IMEMBER, this.current.value));
  }
};

function Parser() {
  this.unaryOps = {
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    asin: Math.asin,
    acos: Math.acos,
    atan: Math.atan,
    sinh: Math.sinh || sinh,
    cosh: Math.cosh || cosh,
    tanh: Math.tanh || tanh,
    asinh: Math.asinh || asinh,
    acosh: Math.acosh || acosh,
    atanh: Math.atanh || atanh,
    sqrt: Math.sqrt,
    log: Math.log,
    ln: Math.log,
    lg: Math.log10 || log10,
    log10: Math.log10 || log10,
    abs: Math.abs,
    ceil: Math.ceil,
    floor: Math.floor,
    round: Math.round,
    trunc: Math.trunc || trunc,
    '-': neg,
    '+': Number,
    exp: Math.exp,
    not: not,
    length: stringLength,
    '!': factorial
  };

  this.binaryOps = {
    '+': add,
    '-': sub,
    '*': mul,
    '/': div,
    '%': mod,
    '^': Math.pow,
    '||': concat,
    '==': equal,
    '!=': notEqual,
    '>': greaterThan,
    '<': lessThan,
    '>=': greaterThanEqual,
    '<=': lessThanEqual,
    and: andOperator,
    or: orOperator
  };

  this.ternaryOps = {
    '?': condition
  };

  this.functions = {
    random: random,
    fac: factorial,
    min: Math.min,
    max: Math.max,
    hypot: Math.hypot || hypot,
    pyt: Math.hypot || hypot, // backward compat
    pow: Math.pow,
    atan2: Math.atan2,
    'if': condition,
    gamma: gamma
  };

  this.consts = {
    E: Math.E,
    PI: Math.PI,
    'true': true,
    'false': false
  };
}

Parser.parse = function (expr) {
  return new Parser().parse(expr);
};

Parser.evaluate = function (expr, variables) {
  return Parser.parse(expr).evaluate(variables);
};

Parser.prototype = {
  parse: function (expr) {
    var instr = [];
    var parserState = new ParserState(this, new TokenStream(expr, this.unaryOps, this.binaryOps, this.ternaryOps, this.consts));
    parserState.parseExpression(instr);
    parserState.expect(TEOF, 'EOF');

    return new Expression(instr, this);
  },

  evaluate: function (expr, variables) {
    return this.parse(expr).evaluate(variables);
  }
};

var parser = {
  Parser: Parser,
  Expression: Expression
};

return parser;

})));
});

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


/**
* An instance of ImageBlendExpressionFilter takes Image2D inputs, as many as
* we need as long as they have the same size and the same number of components
* per pixel.
* This filter blends images pixel values using a literal expression. This expression
* should be set using `setMetadata( "expresssion", "A * B" )` , where `A` and `B`
* are the categories set in input.
*
* Using a blending expression is the aesiest way to test a blending but it is a
* pretty slow process since the expresion has to be evaluated for every process.
* To speed-up your process, it is recomended to develop a new filter that does
* exactly (and only) the blending method you want.
*
* usage: examples/imageBlending.html
* usage: examples/imageBlending2.html
* usage: examples/forEachPixelGradientBlend.html
*
*/
class ImageBlendExpressionFilter extends ImageToImageFilter {

  constructor(){
    super();
    this._addOutput( Image2D );
  }



  _run(){

    // the metadata was not set
    if(!this.hasMetadata("expression")){
      console.warn("A filter of type ImageBlendExpressionFilter requires a blending expression.\nUse 'setMetadata(\"expression\", \"...\")' to set it." );
      return;
    }

    if( !this.hasSameNcppInput() || !this.hasSameSizeInput() ){
      return;
    }

    if(!this.getNumberOfInputs()){
      console.warn("A filter of type ImageBlendExpressionFilter requires at least one inpupt.");
      return;
    }

    var inputCategories = this.getInputCategories();
    var firstInput = this._getInput( inputCategories[0] );
    var outputBuffer = firstInput.getDataCopy();
    var parser = new bundle.Parser();
    var expr = parser.parse( this.getMetadata("expression") );

    for(var i=0; i<outputBuffer.length; i++){

      var evaluationData = {};
      for(var c=0; c<inputCategories.length; c++){
        evaluationData[ inputCategories[c] ] = this._getInput( inputCategories[c] ).getData()[i];
      }

      outputBuffer[i] = expr.evaluate( evaluationData );
    }

    // building the output
    var img2D = this.getOutput();

    img2D.setData(
      outputBuffer,
      firstInput.getWidth(),
      firstInput.getHeight()
    );

  }




} /* END of class ImageBlendExpressionFilter */

//export { SpatialConvolutionFilter } from './filter/SpatialConvolutionFilter.js';



// filters - processing of Image3D

exports.PixpipeObject = PixpipeObject;
exports.PipelineElement = PipelineElement;
exports.Pipeline = Pipeline;
exports.Filter = Filter;
exports.Image2D = Image2D;
exports.Image3D = Image3D;
exports.ImageToImageFilter = ImageToImageFilter;
exports.PixelWiseImageFilter = PixelWiseImageFilter;
exports.CanvasImageWriter = CanvasImageWriter;
exports.UrlImageReader = UrlImageReader;
exports.FileImageReader = FileImageReader;
exports.FileToArrayBufferReader = FileToArrayBufferReader;
exports.Minc2Decoder = Minc2Decoder;
exports.ForEachPixelImageFilter = ForEachPixelImageFilter;
exports.SpectralScaleImageFilter = SpectralScaleImageFilter;
exports.ImageBlendExpressionFilter = ImageBlendExpressionFilter;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=pixpipe.js.map
