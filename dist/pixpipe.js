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
  getUuid(){
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


  /**
  * Copy all the metadata from the object in argument to this.
  * A deep copy by serialization is perform.
  * The metadata that exist only in _this_ are kept.
  * @param {PixpipeObject} otherObject - the object to copy metadata from
  */
  copyMetadataFrom( otherObject ){
    var that = this;

    otherObject.getMetadataKeys().forEach( function(key){
      try{
        var metadataObjectCopy = JSON.parse( JSON.stringify( otherObject.getMetadata(key) ) );
        that.setMetadata(key, metadataObjectCopy);
      }catch(e){
        console.error(e);
      }
    });
  }


  /**
  * @return {Object} a copy of local metadata
  */
  getMetadataCopy(){
    return JSON.parse( JSON.stringify( this._metadata ) );
  }
  
  
  /**
  * [PRIVATE]
  * Deal with an option object (usually as an argument of a constructor).
  * @param {Object} optionsObject - the option object
  * @param {String} key - a property name in this optionObject
  * @param {Object} defaultValue - the value to return if the key in the optionObject was not found
  * @return {Object} the value from the optionObject that has the property name key, unless this property does not exist, then it returns the defaultValue.
  */
  _getOption(optionsObject, key, defaultValue){
    if(!optionsObject)
      return defaultValue;
      
    return optionsObject[ key ] || defaultValue;
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
*
* **Usage**
* - [examples/fileToArrayBuffer.html](../examples/fileToArrayBuffer.html)
*
*/
class Filter extends PixpipeObject {

  constructor(){
    super();
    this._type = Filter.TYPE();

    // a bunch of event to be defined. Empty by default.
    this._events = {};

    this._inputValidator = {};

    this._allValidator = null;

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

    this.setMetadata("time", true);

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

    if(!inputObject){
      console.warn("A null input cannot be added.");
      return;
    }

    // the category may not exist, we create it
    if( !(category in this._input) ){
      this._input[category] = null;
    }

    this._input[category] = inputObject ;

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
  * Perform an action for each output. Within the callback, "this" is this filter.
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
      cb.call(this, outputCategories[o], this.getOutput(outputCategories[o]) );
    }
  }


  /**
  * [PRIVATE]
  * Perform an action for each input. Within the callback, "this" is this filter.
  * @param {function} cb - callback function to call for every single input
  * with 2 args: the output category and the outpub object.
  */
  _forEachInput( cb ){
    if(!cb){
      console.warn("forEachOutput requires a callback.");
      return;
    }

    var inputCategories = this.getInputCategories();

    for(var i=0; i<inputCategories.length; i++){
      cb.call(this, inputCategories[i], this._getInput(inputCategories[i]) );
    }
  }


  /**
  * [PRIVATE]
  * Internal way to setup an output for this filter. Acts like a singleton in a sens
  * that if an output of a given category was already Initialized, it returns it.
  * If no input was Initialized, it creates one.
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

    }else{
      // TODO: if output object exists but is not from dataType: error!
      //outputObject = this._output[category];
      console.warn("An output of category " + category + " was already defined. Nothing to be done.");
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
  * Look up the input to check if an input of a given category is present
  * @param {String} category - a category to look for.
  * @return {Boolean} true if an input of the given
  */
  hasInputOfCategory( category ){
    return (category in this._input);
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
  * Add an entry to the input validator. Made for be used with hasValidInput
  * @param {String} category - category of input (can also be integer)
  * @param {Type} InputType - the type of the expected input, like Image2D, Image3D, etc. without quotes
  */
  addInputValidator( category, InputType ){
    if ("TYPE" in InputType) {
      if (category === 'ALL') {
        this._allValidator = InputType.TYPE();
        return;
      }
      this._inputValidator[ category ] = InputType.TYPE();
    } else {
      if (category === 'ALL') {
        this._allValidator = InputType;
        return;
      }
      this._inputValidator[ category ] = InputType;
    }
  }


  /**
  * Validate the input data using a model defined in _inputValidator.
  * Every class that implement Filter must implement their own _inputValidator.
  * Not mandatory to use, still a good practice.
  */
  hasValidInput(){
    var that = this;
    var inputCategories = this.getInputCategories();
    var valid = true;
    if(inputCategories.length === 0){
      valid = false;
      console.warn("No input validator was added. Filter cannot run. Use addInputValidator(...) to specify input types.");
    }
    inputCategories.forEach( function(key){
      var inputOfCategory = that._getInput( key );

      if(inputOfCategory){
        if("isOfType" in inputOfCategory){
          if (that._inputValidator[ key ]) {
            valid = valid && inputOfCategory.isOfType( that._inputValidator[ key ] );
          }
          if (that._allValidator) {
            valid = valid && inputOfCategory.isOfType(that._allValidator);
          }
        }else{
          try{
            if (that._inputValidator[ key ]) {
              valid = valid && (inputOfCategory instanceof that._inputValidator[ key ] );
            }
            if (that._allValidator) {
              valid = valid && (inputOfCategory instanceof that._allValidator );
            }
          }catch(e){
            valid = false;
          }
        }

      }
      // input simply not existing!
      else{
        valid = false;
      }

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
    if( this._metadata.time ){
      this.addTimeRecord("begin");
      this._run();
      this.addTimeRecord("end");
      console.log("Running time for filter " + this.constructor.name + ": " + this.getTime("begin", "end") + "ms.");
    }else{
      this._run();
    }

    if(this.getNumberOfOutputs()){
      this.setOutputAsReady();
    }
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
  getTime(fromRecord, toRecord, print=false){
    if( fromRecord in this._timer && toRecord in this._timer ){
      var t = Math.abs(this._timer[toRecord] - this._timer[fromRecord]);

      if(print){
        console.log("> Time: [" + fromRecord + " , " + toRecord + "] is " + t + " millisec.");
      }

      return t;
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
  * Call an event with arguments.
  * Inside the callback, the "this" object will be the filter.
  * @param {String} eventName - name of the event to trigger
  * @param {Object} any other param can follow
  */
  triggerEvent( eventName /* any other arguments to follow */ ){
    var returnValue = null;

    if(this.hasEvent(eventName)){
      if( arguments.length > 1 ){

        // a-la-mano slicing argument array to comply with V8 JS engine optimization...
        var argToSend = [];
        for(var i=1; i<arguments.length; i++){
          argToSend.push( arguments[i] );
        }

        returnValue = this._events[eventName].apply(this, argToSend );
      }else{
        returnValue = this._events[eventName].call(this);
      }
    }else{
      console.warn("The event " + eventName + " does not exist.");
    }

    return returnValue;
  }


  /**
  * Tells if an event of such name was registered
  * @return {Boolean} true if registred, false if not
  */
  hasEvent( eventName ){
    return (eventName in this._events);
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
* RasterContainer is a common interface for Image2D and Image3D
* (and possibly some other future formats).
* Should not be used as-is.
*/
class PixpipeContainer extends PixpipeObject {
  constructor(){
    super();
    this._data = null;
  }


  /**
  * Associate d with the internal data object by pointer copy (if Object or Array)
  * @param {TypedArray} d - pixel or voxel data. If multi-band, should be rgbargba...
  */
  setRawData( d ){
    this._data = d;
  }


  /**
  * Associate the internal metadata object with the one in args.
  * @param {Object} m - metadata. Should NOT contain TypedArray
  */
  setRawMetadata( m ){
    this._metadata = m;
  }

} /* END of class PixpipeContainer */

/*
 * Author   Armin Taheri - https://github.com/ArminTaheri
 * License  MIT
 * Link     https://github.com/Pixpipe/pixpipejs
 * Lab      MCIN - Montreal Neurological Institute
 */
class Signal1D extends PixpipeContainer {
  constructor() {
    super();
    this._type = Signal1D.TYPE();
    this.setMetadata('length', 0);
  }

  static TYPE() {
    return 'SIGNAL1D';
  }

  getData() {
    return this._data;
  }

  setData(array, deepCopy = false) {
    if (deepCopy) {
      this._data = new array.constructor(array);
    } else {
      this._data = array;
    }

    this.setMetadata('length', array.length);
  }

  clone(){
    const copy = new Signal1D();
    if (this._data) {
      copy.setData(this._data, true);
    }
    return copy;
  }

  hollowClone(){
    const copy = new Signal1D();
    const length = this.getMetadata('length');
    copy.setData( new Float32Array(length).fill(0) );
    return copy
  }
}

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

    cpImg.setData( new Float32Array(this._data), width, height, ncpp);
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
      this._data = new array.constructor( array );
    }else{
      this._data = array;
    }

    this.setMetadata("width", width);
    this.setMetadata("height", height);

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
class Image3D extends PixpipeContainer{


  /**
  * Constructor of an Image3D instance. If no options, no array is allocated.
  * @param {Object} options - may contain the following:
  *   - options.xSize {Number} space length along x axis
  *   - options.ySize {Number} space length along y axis
  *   - option.zSize {Number} space length along z axis
  *   - options.ncpp {Number} number of components per pixel. Default = 1
  *   - options.order {Array} dimensionality order. default = ["zspace", "yspace", "xspace"]
  */
  constructor( options=null ){
    super();
    this._type = Image3D.TYPE();

    // number of component per pixel, for color OR time series
    this.setMetadata("ncpp", 1);

    // dimensionality order
    if(options && "order" in options){
      this.setMetadata("order", options.order);
    }else{
      this.setMetadata("order", ["zspace", "yspace", "xspace"]);
    }

    var xspace = {
      offset: 1,
      step: 1
    };

    var yspace = {
      step: 1
    };

    var zspace = {
      step: 1
    };
    
    var time = {
      offset: 0,
      space_length: 1
    };

    this.setMetadata("xspace", xspace);
    this.setMetadata("yspace", yspace);
    this.setMetadata("zspace", zspace);
    this.setMetadata("time", time);

    // replacing default value for ncpp
    if(options && "ncpp" in options){
      this.setMetadata("ncpp", options.ncpp);
    }

    // allocate the array if size is specified
    if(options && "xSize" in options && "ySize" in options && "zSize" in options){

      if( options.xSize > 0 && options.ySize > 0 && options.zSize > 0 ){
        xspace.space_length = options.xSize;
        yspace.space_length = options.ySize;
        zspace.space_length = options.zSize;

        yspace.offset = xspace.space_length;
        zspace.offset = xspace.space_length * yspace.space_length;

        this._data = new Float32Array( options.xSize * options.ySize * options.zSize * this.getMetadata("ncpp") );
        this._data.fill(0);

        this._scanDataRange();
        this._finishHeader();
      }
    }
  }


  /**
  * Hardcode the datatype
  */
  static TYPE(){
    return "IMAGE3D";
  }


  /**
  * @return {Image3D} a deep copy instance of this Image3D
  */
  clone(){
    var cpImg = new Image3D();

    cpImg.setData(
      this._data,
      this.getMetadata("xspace").space_length,
      this.getMetadata("yspace").space_length,
      this.getMetadata("zspace").space_length,
      {
        ncpp: this.getMetadata("ncpp"),
        order: this.getMetadata("order").slice(),
        deepCopy: true,
      }
    );

    cpImg.copyMetadataFrom( this );

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
  * @param {Object} options, among them:
  *   - ncpp {Number} number of components per pixel. Default = 1
  *   - order {Array} dimensionality order. Default = ["zspace", "yspace", "xspace"]
  *   - deepCopy {Boolean} copy the whole array if true, or just the pointer if false. Default = false
  *
  */
  setData( array, xSize, ySize, zSize, options){
    var ncpp = 1;

    // number of components per pixel
    if(options && "ncpp" in options){
      ncpp = options.ncpp;
    }

    if( array.length != xSize*ySize*zSize*ncpp){
      console.warn("The array size does not match the width and height. Cannot init the Image3D.");
      return;
    }

    // number of components per pixel
    if(options && "ncpp" in options){
      this.setMetadata("ncpp", options.ncpp);
    }

    // dimensionality order
    if(options && "order" in options){
      this.setMetadata("order", options.order);
    }

    // deep of shallow copy
    if(options && "deepCopy" in options && options.deepCopy){
      this._data = new array.constructor( array );
    }else{
      this._data = array;
    }

    var xspace = this.getMetadata("xspace");
    var yspace = this.getMetadata("yspace");
    var zspace = this.getMetadata("zspace");

    xspace.space_length = xSize;
    yspace.space_length = ySize;
    zspace.space_length = zSize;

    yspace.offset = xspace.space_length;
    zspace.offset = xspace.space_length * yspace.space_length;

    this._scanDataRange();
    this._finishHeader();
  }


  /**
  * [PRIVATE]
  * Creates common fields all headers must contain.
  */
  _finishHeader() {
    var xspace = this.getMetadata("xspace");
    var yspace = this.getMetadata("yspace");
    var zspace = this.getMetadata("zspace");

    xspace.name = "xspace";
    yspace.name = "yspace";
    zspace.name = "zspace";

    xspace.width_space  = JSON.parse( JSON.stringify( yspace ) );//yspace;
    xspace.width        = yspace.space_length;
    xspace.height_space = JSON.parse( JSON.stringify( zspace ) );//zspace;
    xspace.height       = zspace.space_length;

    yspace.width_space  = JSON.parse( JSON.stringify( xspace ) );//xspace;
    yspace.width        = xspace.space_length;
    yspace.height_space = JSON.parse( JSON.stringify( zspace ) );//zspace;
    yspace.height       = zspace.space_length;

    zspace.width_space  = JSON.parse( JSON.stringify( xspace ) );//xspace;
    zspace.width        = xspace.space_length;
    zspace.height_space = JSON.parse( JSON.stringify( yspace ) );//yspace;
    zspace.height       = yspace.space_length;
  }


  /**
  * [PRIVATE]
  * Look for min and max on the dataset and add them to the header metadata
  */
  _scanDataRange(){
    var min = +Infinity;
    var max = -Infinity;

    for(var i=0; i<this._data.length; i++){
      min = Math.min(min, this._data[i]);
      max = Math.max(max, this._data[i]);
    }

    this.setMetadata("voxel_min", min);
    this.setMetadata("voxel_max", max);
  }


  /**
  * Modify the color of a given pixel.
  * @param {Object} position - 3D position in the form {x, y, z}
  * @param {Array} color - color, must have the same number of components per pixel than the image
  */
  setPixel( position, color ){
    // TODO: to implement using order offset
  }


  /**
  * Same as getIntensity_xyz, get a pixel/voxel value using (x, y, z) position
  * @param {Object} position - 3D position like {x, y, z}
  * @return {Array} the color of the given pixel.
  */
  getPixel( position ){
    return this.getIntensity_xyz( position.x, position.y, position.z );
  }


  /**
  * @param {String} space - "xspace", "yspace" or "zspace"
  * @return {Number} the size of the Image3D along the given space
  */
  getSize( space ){
    if( this.hasMetadata( space )){
      return this.getMetadata( space ).space_length;
    }else{
      console.warn("The space must be \"xspace\", \"yspace\" or \"zspace\".");
      return null;
    }
  }


  /**
  * @return {Float32Array} the original data, dont mess up with this one.
  * in case of doubt, use  getDataCopy()
  */
  getData(){
    return this._data;  // return the actual array, editable!
  }


  /**
  * @return {Float32Array} a deep copy of the data
  */
  getDataCopy(){
    return new this._data.constructor( this._data );
  }


  /**
  * Compute the 1D index within the data buffer from a 3D position {x, y, z}.
  * This has nothing to do with the number of components per pixel.
  * @param {Object} position - 3D coord like {x, y, z}
  * @return {Number} the 1D position within the buffer
  */
  get1dIndexFrom3dPosition( position ){
    //return (position.x + position.y*this._width);
    //return this._xSize * this._ySize * position.z + this._xSize * position.y + position.x;
    // TODO: to implement using order offset
  }


  /**
  * [PRIVATE]
  * Return a slice from the minc cube as a 1D typed array,
  * along with some relative data (slice size, step, etc.)
  * args:
  * @param {String} axis - "xspace", "yspace" or zspace (mandatory)
  * @param {Number} slice_num - index of the slice [0; length-1] (optional, default: length-1)
  * @param {Number} time - index of time (optional, default: 0)
  * TODO: add some method to a slice (get value) because it's a 1D array... and compare with Python
  */
  getSlice(axis, slice_num = 0, time = 0) {
    if( !this.hasMetadata(axis) ){
      console.warn("The axis " + axis + " does not exist.");
      return null;
    }

    var time_offset = this.hasMetadata("time") ? time * this.getMetadata("time").offset : 0;

    var axis_space = this.getMetadata(axis);
    var width_space = axis_space.width_space;
    var height_space = axis_space.height_space;

    var width = axis_space.width;
    var height = axis_space.height;

    var axis_space_offset = axis_space.offset;
    var width_space_offset = width_space.offset;
    var height_space_offset = height_space.offset;

    // Calling the volume data's constructor guarantees that the
    // slice data buffer has the same type as the volume.
    //
    //var slice_data = new this._data.constructor(width * height);
    var slice_data = new this._data.constructor(width * height);

    // Rows and colums of the result slice.
    var row, col;

    // Indexes into the volume, relative to the slice.
    // NOT xspace, yspace, zspace coordinates!!!
    var x, y, z;

    // Linear offsets into volume considering an
    // increasing number of axes: (t) time,
    // (z) z-axis, (y) y-axis, (x) x-axis.
    var tz_offset, tzy_offset, tzyx_offset;

    // Whether the dimension steps positively or negatively.
    var x_positive = width_space.step  > 0;
    var y_positive = height_space.step > 0;
    var z_positive = axis_space.step   > 0;

    // iterator for the result slice.
    var i = 0;
    var intensity = 0;
    var intensitySum = 0;
    var min = Infinity;
    var max = -Infinity;

    var maxOfVolume = this.getMetadata("voxel_max");

    z = z_positive ? slice_num : axis_space.space_length - slice_num - 1;
    if (z >= 0 && z < axis_space.space_length) {
      tz_offset = time_offset + z * axis_space_offset;

      for (row = height - 1; row >= 0; row--) {
        y = y_positive ? row : height - row - 1;
        tzy_offset = tz_offset + y * height_space_offset;

        for (col = 0; col < width; col++) {
          x = x_positive ? col : width - col - 1;
          tzyx_offset = tzy_offset + x * width_space_offset;

          intensity = this._data[tzyx_offset];

          min = Math.min(min, intensity);
          max = Math.max(max, intensity);
          intensitySum += intensity;

          slice_data[i++] = intensity;
        }
      }
    }

    var outputImage = new Image2D();
    outputImage.setData(  slice_data, width, height, 1);
    outputImage.setMetadata("min", min);
    outputImage.setMetadata("max", max);
    outputImage.setMetadata("avg", intensitySum / (i-1) );
    return outputImage;

  }


  /**
  * Get the intensity of a given voxel, addressed by dimensionality order.
  * In case of doubt, use getIntensity_xyz instead.
  * @param {Number} i - Position within the biggest dimensionality order
  * @param {Number} j - Position within the in-the-middle dimensionality order
  * @param {Number} k - Position within the smallest dimensionality order
  */
  getIntensity_ijk(i, j, k, time = 0) {
    var order = this.getMetadata("order");

    if (i < 0 || i >= this.getMetadata( order[0] ).space_length ||
        j < 0 || j >= this.getMetadata( order[1] ).space_length ||
        k < 0 || k >= this.getMetadata( order[2] ).space_length)
    {
        console.warn("getIntensity_ijk position is out of range.");
        return 0;
    }

    //var time_offset = this.hasMetadata( "time" ) ? time * this.getMetadata( "time" ).offset : 0;
    var time_offset = this._metadata.time.offset * time;

    var xyzt_offset = (
      i * this.getMetadata( order[0] ).offset +
      j * this.getMetadata( order[1] ).offset +
      k * this.getMetadata( order[2] ).offset +
      time_offset);

    return this._data[xyzt_offset];
  }


  /**
  * Get the intensity of a given voxel, addressed by dimension names.
  * @param {Number} x - position within xspace
  * @param {Number} y - position within yspace
  * @param {Number} z - position within zspace
  * @param {Number} time - position in time (optional)
  */
  getIntensity_xyz(x, y, z, time = 0) {

    if (x < 0 || x >= this._metadata.xspace.space_length ||
        y < 0 || y >= this._metadata.yspace.space_length ||
        z < 0 || z >= this._metadata.zspace.space_length)
    {
        console.warn("getIntensity_xyz position is out of range.");
        return 0;
    }

    //var time_offset = this.hasMetadata( "time" ) ? time * this.getMetadata( "time" ).offset : 0;
    var time_offset = this._metadata.time.offset * time;
    
    var xyzt_offset = (
      x * this._metadata.xspace.offset +
      y * this._metadata.yspace.offset +
      z * this._metadata.zspace.offset +
      time_offset);

    return this._data[xyzt_offset];
  }

  
  /**
  * Get the number of samples over time
  */
  getTimeLength(){
    return ( this.hasMetadata("time") ? this.getMetadata("time").space_length : 1 );
  }


  /**
  * Tells if a given point is inside or outside the image
  * @param {Object} pos - position like {x: Number, y: Number, z: Number}
  * @return {Boolean} true for inside, false for outside
  */
  isInside( pos ){
    return !(pos.x < 0 || pos.x >= this._metadata.xspace.space_length ||
             pos.y < 0 || pos.y >= this._metadata.yspace.space_length ||
             pos.z < 0 || pos.z >= this._metadata.zspace.space_length)
  }
  

  /**
  * Sample the color along a segment
  * @param {Object} posFrom - starting position of type {x: Number, y: Number, z: Number}
  * @param {Object} posFrom - ending position of type {x: Number, y: Number, z: Number}
  * @return {Object} array of Array like that: {
                                                  positions: [
                                                    {x: x0, y: y0, z: z0},
                                                    {x: x1, y: y1, z: z1},
                                                    {x: x2, y: y2, z: z2},
                                                    ...
                                                  ],
                                                  labels: [
                                                    "(x0, y0, z0)", "(x1, y1, z1)", "(x2, y2, z2)", ...
                                                  ],
                                                  colors: [
                                                            [r0, r1, r2 ...],
                                                            [g0, g1, g2 ...],
                                                            [b0, b1, b2 ...]
                                                  ]
                                                }
     return null if posFrom or posTo is outside
  */
  getSegmentSample( posFrom, posTo, time = 0 ){
    // both position must be inside the image
    if( !this.isInside(posFrom) || !this.isInside(posTo) )
      return null;
      
    var dx = posTo.x - posFrom.x;
    var dy = posTo.y - posFrom.y;
    var dz = posTo.z - posFrom.z;
    var euclidianDistance = Math.sqrt( Math.pow(dx , 2) + Math.pow(dy , 2) + Math.pow(dz , 2) );
    var numberOfSamples = Math.floor( euclidianDistance + 1 );
    
    // we want to sample every unit distance along the segment
    var stepX = dx / euclidianDistance;
    var stepY = dy / euclidianDistance;
    var stepZ = dz / euclidianDistance;
    
    var ncpp = this._metadata.ncpp;
    var positions = new Array(numberOfSamples).fill(0);
    var colors = new Array(ncpp).fill(0);
    var labels = new Array(numberOfSamples).fill(0);
    
    // creating empty arrays for colors
    for(var c=0; c<ncpp; c++){
      colors[c] = new Array(numberOfSamples).fill(0);
    }
    
    // walk along the segment, from posFrom to posTo
    for(var i=0; i<numberOfSamples; i++){
      var currentPos = {
        x: Math.round(posFrom.x + i*stepX),
        y: Math.round(posFrom.y + i*stepY),
        z: Math.round(posFrom.z + i*stepZ)
      };
      
      positions[i] = currentPos;
      labels[i] = "(" + currentPos.x + ", " + currentPos.y + ", " + currentPos.z + ")";
      
      var pixValue = [this.getIntensity_xyz( currentPos.x, currentPos.y, currentPos.z )];
      
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
* MniVolume instance are like Image3D but include some brain things
*/
class MniVolume extends Image3D{


  /**
  * Constructor of an Image3D instance. If no options, no array is allocated.
  * @param {Object} options - if present, must have options.xSize, options.ySize, option.zSize.
  * Also options.ncpp to set the number of components per pixel. (possibly for using time series)
  */
  constructor( options=null ){
    super();
  }


  /**
  * [STATIC]
  * mainly used by the ouside world (like from Nifti)
  */
  static transformToMinc(transform, header) {
    var x_dir_cosines = [];
    var y_dir_cosines = [];
    var z_dir_cosines = [];

    // A tiny helper function to calculate the magnitude of the rotational
    // part of the transform.
    //
    function magnitude(v) {
      var dotprod = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
      if (dotprod <= 0) {
        dotprod = 1.0;
      }
      return Math.sqrt(dotprod);
    }

    // Calculate the determinant of a 3x3 matrix, from:
    // http://www.mathworks.com/help/aeroblks/determinantof3x3matrix.html
    //
    // det(A) = A_{11} (A_{22}A_{33} - A_{23}A_{32}) -
    //          A_{12} (A_{21}A_{33} - A_{23}A_{31}) +
    //          A_{13} (A_{21}A_{32} - A_{22}A_{31})
    //
    // Of course, I had to change the indices from 1-based to 0-based.
    //
    function determinant(c0, c1, c2) {
      return (c0[0] * (c1[1] * c2[2] - c1[2] * c2[1]) -
              c0[1] * (c1[0] * c2[2] - c1[2] * c2[0]) +
              c0[2] * (c1[0] * c2[1] - c1[1] * c2[0]));
    }

    // Now that we have the transform, need to convert it to MINC-like
    // steps and direction_cosines.

    var xmag = magnitude(transform[0]);
    var ymag = magnitude(transform[1]);
    var zmag = magnitude(transform[2]);

    var xstep = (transform[0][0] < 0) ? -xmag : xmag;
    var ystep = (transform[1][1] < 0) ? -ymag : ymag;
    var zstep = (transform[2][2] < 0) ? -zmag : zmag;

    for (var i = 0; i < 3; i++) {
      x_dir_cosines[i] = transform[i][0] / xstep;
      y_dir_cosines[i] = transform[i][1] / ystep;
      z_dir_cosines[i] = transform[i][2] / zstep;
    }

    header.xspace.step = xstep;
    header.yspace.step = ystep;
    header.zspace.step = zstep;

    // Calculate the corrected start values.
    var starts = [transform[0][3],
                  transform[1][3],
                  transform[2][3]
                 ];

    // (bert): I believe that the determinant of the direction
    // cosines should always work out to 1, so the calculation of
    // this value should not be needed. But I have no idea if NIfTI
    // enforces this when sform transforms are written.
    var denom  = determinant(x_dir_cosines, y_dir_cosines, z_dir_cosines);
    var xstart = determinant(starts, y_dir_cosines, z_dir_cosines);
    var ystart = determinant(x_dir_cosines, starts, z_dir_cosines);
    var zstart = determinant(x_dir_cosines, y_dir_cosines, starts);

    header.xspace.start = xstart / denom;
    header.yspace.start = ystart / denom;
    header.zspace.start = zstart / denom;

    header.xspace.direction_cosines = x_dir_cosines;
    header.yspace.direction_cosines = y_dir_cosines;
    header.zspace.direction_cosines = z_dir_cosines;
  };


  /**
  * [STATIC]
  * swap the data to be used from the outside (ie. nifti)
  */
  static swapn(byte_data, n_per_item) {
    for (var d = 0; d < byte_data.length; d += n_per_item) {
      var hi_offset = n_per_item - 1;
      var lo_offset = 0;
      while (hi_offset > lo_offset) {
        var tmp = byte_data[d + hi_offset];
        byte_data[d + hi_offset] = byte_data[d + lo_offset];
        byte_data[d + lo_offset] = tmp;
        hi_offset--;
        lo_offset++;
      }
    }
  }


  /**
  * Initialize a MniVolume with the data and the header.
  * @param {Array} data - TypedArray containing the data
  */
  setData( data, header ){
    var that = this;
    this._data = data;

    this.setMetadata( "position", {} );
    this.setMetadata( "current_time", 0 );

    // copying header into metadata
    var headerKeys = Object.keys(header);
    headerKeys.forEach( function(key){
      that.setMetadata( key, header[key] );
    });

    // find min/max
    this._scanDataRange();

    // set W2v matrix
    this._saveOriginAndTransform();

    // adding some fields to metadata header
    this._finishHeader();

    console.log(this._metadata);
  }





  /**
  * [PRIVATE}
  * Calculate the world to voxel transform and save it, so we
  * can access it efficiently. The transform is:
  * cxx / stepx | cxy / stepx | cxz / stepx | (-o.x * cxx - o.y * cxy - o.z * cxz) / stepx
  * cyx / stepy | cyy / stepy | cyz / stepy | (-o.x * cyx - o.y * cyy - o.z * cyz) / stepy
  * czx / stepz | czy / stepz | czz / stepz | (-o.x * czx - o.y * czy - o.z * czz) / stepz
  * 0           | 0           | 0           | 1
  *
  * Origin equation taken from (http://www.bic.mni.mcgill.ca/software/minc/minc2_format/node4.html)
  */
  _saveOriginAndTransform() {

    var xspace = this.getMetadata("xspace");
    var yspace = this.getMetadata("yspace");
    var zspace = this.getMetadata("zspace");

    var startx = xspace.start;
    var starty = yspace.start;
    var startz = zspace.start;
    var cx = xspace.direction_cosines;
    var cy = yspace.direction_cosines;
    var cz = zspace.direction_cosines;
    var stepx = xspace.step;
    var stepy = yspace.step;
    var stepz = zspace.step;

    // voxel_origin
    var o = {
      x: startx * cx[0] + starty * cy[0] + startz * cz[0],
      y: startx * cx[1] + starty * cy[1] + startz * cz[1],
      z: startx * cx[2] + starty * cy[2] + startz * cz[2]
    };

    this.setMetadata("voxel_origin", o);

    var tx = (-o.x * cx[0] - o.y * cx[1] - o.z * cx[2]) / stepx;
    var ty = (-o.x * cy[0] - o.y * cy[1] - o.z * cy[2]) / stepy;
    var tz = (-o.x * cz[0] - o.y * cz[1] - o.z * cz[2]) / stepz;

    var w2v = [
      [cx[0] / stepx, cx[1] / stepx, cx[2] / stepx, tx],
      [cy[0] / stepy, cy[1] / stepy, cy[2] / stepy, ty],
      [cz[0] / stepz, cz[1] / stepz, cz[2] / stepz, tz]
    ];

    this.setMetadata("w2v", w2v);
  }


} /* END of class Image3D */

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

/**
* A LineString is a vectorial reprensation of a line or polyline, open or closed.
* When closed, it can be considered as a polygon.  
* By default, a LineString is 2 dimensional but the dimension can be changed when
* using the `.setData(...)` method or before any point addition with `.setNod()`.
* To close a LineString, use `.setMetadata("closed", true);`, this will not add
* any point but will flag this LineString as "closed".
*
*/
class LineString extends PixpipeContainer {
  
  constructor() {
    super();
    this.setMetadata("closed", false);
    this.setMetadata("defaultNod", 2);
    this.setMetadata("nod", 2);
    
    this._type = LineString.TYPE();
    
    // local record for saving the last point
    this._lastPoint = null;
  }
  
  
  /**
  * Hardcode the datatype
  */
  static TYPE(){
    return "LINESTRING";
  }
  
  
  /**
  * Set/replace the point data.
  * @param {points} points - 1D array containing coord [x, y, x, y, x, y, ...]
  * @param {Number} nod - Number of Dimensions, default = 2
  * @param {Boolean} deepCopy - pointer copy if false, deep copy if true.
  */
  setData(points, nod=-1, deepCopy=false){
    if( nod != -1){
      this.setMetadata("nod", nod);
    }
    
    if(points.length % this.getMetadata("nod") != 0 ){
      console.warn("The number of points is not compatible with the number of dimensions (nod).");
      return;
    }
    
    if(deepCopy){
      this._data = new points.constructor( points );
    }else{
      this._data = points;
    }
    
    this._setLastPoint();
  }
  
  
  /**
  * Define the number of dimensions. This can be done only when this LineString
  * is still empty.
  * @param {Number} nod - Number of dimensions
  */
  setNod( nod ){
    if(!this._data || !this._data.length){
      console.warn("The number of dimension can be set only when this LineString is empty.");
      return;
    }
    
    this.setMetadata("nod", nod);
  }
  
  
  /**
  * Get the number of dimensions
  * @return {Number} the nod
  */
  getNod(){
    return this.getMetadata("nod");
  }
  
  
  /**
  * Get the internal image data (pointer)
  * @return {Array} the original data, dont mess up with this one.
  * in case of doubt, use  getDataCopy()
  */
  getData(){
    return this._data;  // return the actual array, editable!
  }


  /**
  * Get a copy of the data
  * @return {Array} a deep copy of the data
  */
  getDataCopy(){
    return new this._data.constructor( this._data );
  }
  
  
  /**
  * Get the number of points in this linestring
  * @return {Number} nb of points
  */
  getNumberOfPoints(){
    if(!this._data){
      return 0;
    }
    
    return this._data.length / this.getMetadata("nod");
  }
  
  
  /**
  * Get a point of this LineString
  * @return {Array} a point, being [x, y] if 2D or [x, y, z] if 3D
  */
  getPoint( index ){
    if(index >=0 && index < getNumberOfPoints){
      var nod = this._metadata.nod;
      return this._data.slice(index*nod, index*nod + nod);
    }else{
      console.warn("Index of point is out of range.");
      return null;
    }
  }
  
  
  /**
  * Considere this LineString as closed, making it a polygon
  */
  close(){
    this.setMetadata("closed", true);
  }
  
  
  /**
  * Considere this LineString as open
  */
  open(){
    this.setMetadata("closed", false);
  }
  
  
  /**
  * Add a point at the end of the LineString. Keeps the polygon open.
  * @param {Array} position - [x, y] if 2D or [x, y, z] if 3D
  */
  addPoint( position ){
    if( position.length != this._metadata.nod ){
      console.warn("Cannot add the point becase it has a diferent number of dimensions.");
      return;
    }
    
    if( !this._data ){
      this._data = new Array();
    }
    
    for(var i=0; i<position.length; i++){
      this._data.push( position[i] );
    }
    
    // we keep it for easy access
    this._lastPoint = position;
  }
  
  
  /**
  * Get the last point but does not pop it out
  * @return {Array} the point as [x, y] or [x, y, z]
  */
  peekPoint(){
    if(!this._data){
      return null;
    }
    
    if(this._lastPoint){
      return this._lastPoint;
    }
    
    this._setLastPoint();
    return this._lastPoint;
  }
  
  
  /**
  * [PRIVATE]
  * define the last point
  */
  _setLastPoint(){
    this._lastPoint = this._data.slice(- this._metadata.nod);
    if(this._lastPoint.length == 0){
      this._lastPoint = null;
    }
  }
  
  
  /**
  * Get the last point and remove it from this LineString
  * @return {Array} like [x, y] or [x, y, z] or null if no more point
  */
  popPoint(){
    if(!this._data){
      console.warn("This LineString was not added any point.");
      return null;
    }
    
    if(!this._data.length){
      console.warn("No more point in this LineString.");
      return null;
    }

    var pointToReturn = new Array(this._lastPoint);
    this._lastPoint.length = this._lastPoint.length - this._metadata.nod;
    this._setLastPoint();
  }
  
  
  /**
  * Checks if a given point is part of this LineString
  * @param {Array} p - point coords like [x, y] for 2D or [x, y, z] for 3D
  * @return {Boolean} truee if the given point is in this LineString, false if not.
  */
  hasPoint( p ){
    var nod = this.getMetadata("nod");
    
    if(p.length != nod){
      console.warn("The given point does not have the same number of dimensions as the LineString.");
      return false;
    }
    
    for(var i=0; i<this._data.length-1; i+=2){
      if(this._data[i] == p[0] && this._data[i+1] == p[1]){
        return true;
      }
    }
    
    return false;
  }
  
  
} /* END of class LineString */

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
* If the input Image2D has values not in [0, 255], you can remap/stretch using  
* setMetadata("min", xxx ) default: 0  
* setMetadata("max", xxx ) default: 255  
* We can also use `setMetadata("reset", false)` so that we can add another canvas
* with a new image at update.  
*
* **Usage**
* - [examples/imageToCanvasFilter.html](../examples/imageToCanvasFilter.html)
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

    this.addInputValidator(0, Image2D);
    
    this.setMetadata("alpha", false);
    this.setMetadata("min", 0);
    this.setMetadata("max", 255);
    this.setMetadata("reset", true);


    // so that we can flush the content
    this._canvas = null;
    this._ctx = null;
  }


  /**
  * Get the canvas used to print the Image2D;
  * @return {Object} canvas
  */
  getCanvas(){
    return this._canvas;
  }
  

  /**
  * [PRIVATE]
  * Initialize a new canvas object
  */
  _init(){


    var parentElem = document.getElementById( this.getMetadata("parentDivID") );

    if(! parentElem ){
      return false;
    }

    // reset content
    if(this.getMetadata("reset")){
      while (parentElem.firstChild) {
          parentElem.removeChild(parentElem.firstChild);
      }
    }

    // creating a canvas element
    this._canvas = document.createElement("canvas");
    this._canvas.style = "image-rendering: pixelated;";
    this._ctx = this._canvas.getContext('2d');

    // not sure this is useful since the style is "pixelated"
    // (does not seem to well super well with Firefox)
    this._ctx.imageSmoothingEnabled = false;
    this._ctx.mozImageSmoothingEnabled = false;
    this._ctx.webkitImageSmoothingEnabled = false;
    this._ctx.ctxmsImageSmoothingEnabled = false;

    document.getElementById(this.getMetadata("parentDivID")).appendChild(this._canvas);

    return true;
  }


  /**
  * Overwrite the generic (empty) method.
  */
  _run(){
    var that = this;

    // abort if invalid input
    if(!this.hasValidInput() )
      return;

    var image = this._input[0];
    var ncppSrc = image.getComponentsPerPixel();

    // only Image2d with 1 or 4 bands can be displayed
    if( ncppSrc != 1 && ncppSrc != 3 && ncppSrc != 4){
      console.warn("Cannot write Image in canvas if contains other than 1, 3 or 4 bands.");
      return;
    }

    if(!this.getMetadata("parentDivID")){
      console.error("The parent DIV ID to place the canvas element was not specified. Unable to display anything.");
      return;
    }

    // build a new canvas
    if( !this._init() ){
      console.warn("The parent div was not specified or does not exist.");
      return;
    }
    var useAlphaBand = this.getMetadata("alpha");

    // resizing the canvas
    this._canvas.width = image.getWidth();
    this._canvas.height = image.getHeight();

    var canvasImageData = this._ctx.getImageData(0, 0, this._canvas.width, this._canvas.height);
    var canvasImageDataArray = canvasImageData.data;

    // getting Image object data
    var originalImageDataArray = image.getData();

    // input image is RGBA
    if(ncppSrc == 4){
      for(var i=0; i<originalImageDataArray.length; i++){
        if(!useAlphaBand && i%4 == 3){
          canvasImageDataArray[i] = 255;
        }else{
          canvasImageDataArray[i] = this._stretchMinMax( originalImageDataArray[ i ] );
        }
      }

    // input image is mono chanel
    }else if(ncppSrc == 1){

      for(var i=0; i<originalImageDataArray.length; i++){
        var index1D = i*4;
        var stretchedValue = this._stretchMinMax(originalImageDataArray[i]);
        canvasImageDataArray[index1D] = stretchedValue;
        canvasImageDataArray[index1D + 1] = stretchedValue;
        canvasImageDataArray[index1D + 2] = stretchedValue;
        canvasImageDataArray[index1D + 3] = 255;
      }

    // input image is RGB
    }else if(ncppSrc == 3){
      var counter = 0;

      for(var i=0; i<canvasImageDataArray.length; i++){
        if(i%4 == 3){
          canvasImageDataArray[i] = 255;
        }else{
          canvasImageDataArray[i] = this._stretchMinMax(originalImageDataArray[ counter ]);
          counter ++;
        }
      }
    }
    
    this._ctx.putImageData(canvasImageData, 0, 0);
  }


  /**
  * [PRIVATE]
  * remap the intensity between getMetadata("min") and getMetadata("max")
  * @param {Number} intensity - input pixel value
  * @return {Number} the adjusted number
  */
  _stretchMinMax( intensity ){
    var min = this._metadata.min;
    var max = this._metadata.max;

    if(min == 0 && max == 255){
      return intensity;
    }

    return ( (intensity - min) / (max - min) ) * 255;
  }

}

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

/**
* An instance of UrlImageReader takes an image URL to jpeg or png as input and
* returns an Image2D as output. Use the regular `addInput()` and `getOuput()`
* with no argument for that. For Tiff format, use TiffDecoder instead.
* Reading a file from URL takes an AJAX request, which is asynchronous. For this
* reason, what happens next, once the Image2D is created must take place in the
* callback defined by the event .on("ready", function(){ ... }).
* Usage: examples/urlToImage2D.html
*
* UrlImageReader can also load multiple images and call the "ready" event
* only when all of them are loaded.
*
* **Usage**
* - [examples/urlToImage2D_multiple.html](../examples/urlToImage2D_multiple.html)
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
        var dataArray = new Float32Array( imageData.data );
        var img2D = that.getOutput( inputCategory );
        img2D.setData( dataArray, img.width, img.height);

        that._loadedCounter ++;

        // call the loaded callback only when all images are loaded
        if(that._loadedCounter == that.getNumberOfInputs()){
          that.triggerEvent("ready");
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
* An instance of FileImageReader takes a HTML5 File object of a png or jpeg image 
* as input and returns an Image2D as output.  For Tiff format, use TiffDecoder instead.
* The point is mainly to use it with a file dialog.
* Use the regular `addInput()` and `getOuput()` with no argument for that.
* Reading a local file is an asynchronous process. For this
* reason, what happens next, once the Image2D is created must take place in the
* callback defined by the event .on("ready", function(){ ... }).
*
*
*
* **Usage**
* - [examples/fileToImage2D.html](../examples/fileToImage2D.html)
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
  }


  /**
  * Overload the default method because HTML5 File is not a Pixpipe type
  */
  hasValidInput(){
    var valid = false;
    var file = this._getInput();

    if (file && file.type.match( this._allowedTypes )) {
      valid = true;
    }else{
      console.error("The file must be an image (jpg/png). The type " + file.type + " is not compatible with FileImageReader.");
    }

    return valid;
  }


  /**
  * Run the reading
  */
  _run(){

    if(! this.hasValidInput() )
      return

    var that = this;
    var file = this._getInput();
		var reader = new FileReader();
    
    reader.onload = function(e) {
      var img = new Image();
    
      img.onload = function(){
        
        var tmpCanvas = document.createElement("canvas");
        tmpCanvas.width = img.width;
        tmpCanvas.height = img.height;
        var canvasContext = tmpCanvas.getContext('2d');
        canvasContext.drawImage(img, 0, 0);
        var imageData = canvasContext.getImageData(0, 0, img.width, img.height);
        var dataArray = imageData.data;

        var img2D = that._addOutput( Image2D, 0 );
        img2D.setData( dataArray, img.width, img.height);

        // the "ready" can now be called
        that.triggerEvent("ready");
      };

      img.src = reader.result;
    };
    
    
		reader.readAsDataURL( file );
  }



} /* END of class UrlImageReader */

var global$1 = typeof global !== "undefined" ? global :
            typeof self !== "undefined" ? self :
            typeof window !== "undefined" ? window : {};

// shim for using process in browser
// based off https://github.com/defunctzombie/node-process/blob/master/browser.js

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
var cachedSetTimeout = defaultSetTimout;
var cachedClearTimeout = defaultClearTimeout;
if (typeof global$1.setTimeout === 'function') {
    cachedSetTimeout = setTimeout;
}
if (typeof global$1.clearTimeout === 'function') {
    cachedClearTimeout = clearTimeout;
}

function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}
function nextTick(fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
}
// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
var title = 'browser';
var platform = 'browser';
var browser = true;
var env = {};
var argv = [];
var version = ''; // empty string to avoid regexp issues
var versions = {};
var release = {};
var config = {};

function noop() {}

var on = noop;
var addListener = noop;
var once = noop;
var off = noop;
var removeListener = noop;
var removeAllListeners = noop;
var emit = noop;

function binding(name) {
    throw new Error('process.binding is not supported');
}

function cwd () { return '/' }
function chdir (dir) {
    throw new Error('process.chdir is not supported');
}
function umask() { return 0; }

// from https://github.com/kumavis/browser-process-hrtime/blob/master/index.js
var performance$1 = global$1.performance || {};
var performanceNow =
  performance$1.now        ||
  performance$1.mozNow     ||
  performance$1.msNow      ||
  performance$1.oNow       ||
  performance$1.webkitNow  ||
  function(){ return (new Date()).getTime() };

// generate timestamp or delta
// see http://nodejs.org/api/process.html#process_process_hrtime
function hrtime(previousTimestamp){
  var clocktime = performanceNow.call(performance$1)*1e-3;
  var seconds = Math.floor(clocktime);
  var nanoseconds = Math.floor((clocktime%1)*1e9);
  if (previousTimestamp) {
    seconds = seconds - previousTimestamp[0];
    nanoseconds = nanoseconds - previousTimestamp[1];
    if (nanoseconds<0) {
      seconds--;
      nanoseconds += 1e9;
    }
  }
  return [seconds,nanoseconds]
}

var startTime = new Date();
function uptime() {
  var currentTime = new Date();
  var dif = currentTime - startTime;
  return dif / 1000;
}

var process = {
  nextTick: nextTick,
  title: title,
  browser: browser,
  env: env,
  argv: argv,
  version: version,
  versions: versions,
  on: on,
  addListener: addListener,
  once: once,
  off: off,
  removeListener: removeListener,
  removeAllListeners: removeAllListeners,
  emit: emit,
  binding: binding,
  cwd: cwd,
  chdir: chdir,
  umask: umask,
  hrtime: hrtime,
  platform: platform,
  release: release,
  config: config,
  uptime: uptime
};

var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function commonjsRequire () {
	throw new Error('Dynamic requires are not currently supported by rollup-plugin-commonjs');
}



function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var empty = {};


var empty$1 = Object.freeze({
	default: empty
});

var lookup = [];
var revLookup = [];
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;
var inited = false;
function init () {
  inited = true;
  var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  for (var i = 0, len = code.length; i < len; ++i) {
    lookup[i] = code[i];
    revLookup[code.charCodeAt(i)] = i;
  }

  revLookup['-'.charCodeAt(0)] = 62;
  revLookup['_'.charCodeAt(0)] = 63;
}

function toByteArray (b64) {
  if (!inited) {
    init();
  }
  var i, j, l, tmp, placeHolders, arr;
  var len = b64.length;

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  placeHolders = b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0;

  // base64 is 4/3 + up to two characters of the original data
  arr = new Arr(len * 3 / 4 - placeHolders);

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len;

  var L = 0;

  for (i = 0, j = 0; i < l; i += 4, j += 3) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)];
    arr[L++] = (tmp >> 16) & 0xFF;
    arr[L++] = (tmp >> 8) & 0xFF;
    arr[L++] = tmp & 0xFF;
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4);
    arr[L++] = tmp & 0xFF;
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2);
    arr[L++] = (tmp >> 8) & 0xFF;
    arr[L++] = tmp & 0xFF;
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp;
  var output = [];
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
    output.push(tripletToBase64(tmp));
  }
  return output.join('')
}

function fromByteArray (uint8) {
  if (!inited) {
    init();
  }
  var tmp;
  var len = uint8.length;
  var extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
  var output = '';
  var parts = [];
  var maxChunkLength = 16383; // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)));
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1];
    output += lookup[tmp >> 2];
    output += lookup[(tmp << 4) & 0x3F];
    output += '==';
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1]);
    output += lookup[tmp >> 10];
    output += lookup[(tmp >> 4) & 0x3F];
    output += lookup[(tmp << 2) & 0x3F];
    output += '=';
  }

  parts.push(output);

  return parts.join('')
}

function read (buffer, offset, isLE, mLen, nBytes) {
  var e, m;
  var eLen = nBytes * 8 - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var nBits = -7;
  var i = isLE ? (nBytes - 1) : 0;
  var d = isLE ? -1 : 1;
  var s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

function write (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c;
  var eLen = nBytes * 8 - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0);
  var i = isLE ? 0 : (nBytes - 1);
  var d = isLE ? 1 : -1;
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128;
}

var toString = {}.toString;

var isArray = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */


var INSPECT_MAX_BYTES = 50;

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global$1.TYPED_ARRAY_SUPPORT !== undefined
  ? global$1.TYPED_ARRAY_SUPPORT
  : true;

/*
 * Export kMaxLength after typed array support is determined.
 */
var _kMaxLength = kMaxLength();
function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

function createBuffer (that, length) {
  if (kMaxLength() < length) {
    throw new RangeError('Invalid typed array length')
  }
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(length);
    that.__proto__ = Buffer.prototype;
  } else {
    // Fallback: Return an object instance of the Buffer class
    if (that === null) {
      that = new Buffer(length);
    }
    that.length = length;
  }

  return that
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
    return new Buffer(arg, encodingOrOffset, length)
  }

  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(this, arg)
  }
  return from(this, arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192; // not used by this implementation

// TODO: Legacy, not needed anymore. Remove in next major version.
Buffer._augment = function (arr) {
  arr.__proto__ = Buffer.prototype;
  return arr
};

function from (that, value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    return fromArrayBuffer(that, value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(that, value, encodingOrOffset)
  }

  return fromObject(that, value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(null, value, encodingOrOffset, length)
};

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype;
  Buffer.__proto__ = Uint8Array;
  if (typeof Symbol !== 'undefined' && Symbol.species &&
      Buffer[Symbol.species] === Buffer) {
    // Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
    // Object.defineProperty(Buffer, Symbol.species, {
    //   value: null,
    //   configurable: true
    // })
  }
}

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (that, size, fill, encoding) {
  assertSize(size);
  if (size <= 0) {
    return createBuffer(that, size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(that, size).fill(fill, encoding)
      : createBuffer(that, size).fill(fill)
  }
  return createBuffer(that, size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(null, size, fill, encoding)
};

function allocUnsafe (that, size) {
  assertSize(size);
  that = createBuffer(that, size < 0 ? 0 : checked(size) | 0);
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < size; ++i) {
      that[i] = 0;
    }
  }
  return that
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(null, size)
};
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(null, size)
};

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8';
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0;
  that = createBuffer(that, length);

  var actual = that.write(string, encoding);

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    that = that.slice(0, actual);
  }

  return that
}

function fromArrayLike (that, array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0;
  that = createBuffer(that, length);
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255;
  }
  return that
}

function fromArrayBuffer (that, array, byteOffset, length) {
  array.byteLength; // this throws if `array` is not a valid ArrayBuffer

  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  if (byteOffset === undefined && length === undefined) {
    array = new Uint8Array(array);
  } else if (length === undefined) {
    array = new Uint8Array(array, byteOffset);
  } else {
    array = new Uint8Array(array, byteOffset, length);
  }

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = array;
    that.__proto__ = Buffer.prototype;
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromArrayLike(that, array);
  }
  return that
}

function fromObject (that, obj) {
  if (internalIsBuffer(obj)) {
    var len = checked(obj.length) | 0;
    that = createBuffer(that, len);

    if (that.length === 0) {
      return that
    }

    obj.copy(that, 0, 0, len);
    return that
  }

  if (obj) {
    if ((typeof ArrayBuffer !== 'undefined' &&
        obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
      if (typeof obj.length !== 'number' || isnan(obj.length)) {
        return createBuffer(that, 0)
      }
      return fromArrayLike(that, obj)
    }

    if (obj.type === 'Buffer' && isArray(obj.data)) {
      return fromArrayLike(that, obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < kMaxLength()` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0;
  }
  return Buffer.alloc(+length)
}
Buffer.isBuffer = isBuffer;
function internalIsBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!internalIsBuffer(a) || !internalIsBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length;
  var y = b.length;

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i];
      y = b[i];
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
};

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
};

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i;
  if (length === undefined) {
    length = 0;
    for (i = 0; i < list.length; ++i) {
      length += list[i].length;
    }
  }

  var buffer = Buffer.allocUnsafe(length);
  var pos = 0;
  for (i = 0; i < list.length; ++i) {
    var buf = list[i];
    if (!internalIsBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos);
    pos += buf.length;
  }
  return buffer
};

function byteLength (string, encoding) {
  if (internalIsBuffer(string)) {
    return string.length
  }
  if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
      (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string;
  }

  var len = string.length;
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false;
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase();
        loweredCase = true;
    }
  }
}
Buffer.byteLength = byteLength;

function slowToString (encoding, start, end) {
  var loweredCase = false;

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0;
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length;
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0;
  start >>>= 0;

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8';

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase();
        loweredCase = true;
    }
  }
}

// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
// Buffer instances.
Buffer.prototype._isBuffer = true;

function swap (b, n, m) {
  var i = b[n];
  b[n] = b[m];
  b[m] = i;
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length;
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1);
  }
  return this
};

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length;
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3);
    swap(this, i + 1, i + 2);
  }
  return this
};

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length;
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7);
    swap(this, i + 1, i + 6);
    swap(this, i + 2, i + 5);
    swap(this, i + 3, i + 4);
  }
  return this
};

Buffer.prototype.toString = function toString () {
  var length = this.length | 0;
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
};

Buffer.prototype.equals = function equals (b) {
  if (!internalIsBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
};

Buffer.prototype.inspect = function inspect () {
  var str = '';
  var max = INSPECT_MAX_BYTES;
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ');
    if (this.length > max) str += ' ... ';
  }
  return '<Buffer ' + str + '>'
};

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!internalIsBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0;
  }
  if (end === undefined) {
    end = target ? target.length : 0;
  }
  if (thisStart === undefined) {
    thisStart = 0;
  }
  if (thisEnd === undefined) {
    thisEnd = this.length;
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0;
  end >>>= 0;
  thisStart >>>= 0;
  thisEnd >>>= 0;

  if (this === target) return 0

  var x = thisEnd - thisStart;
  var y = end - start;
  var len = Math.min(x, y);

  var thisCopy = this.slice(thisStart, thisEnd);
  var targetCopy = target.slice(start, end);

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i];
      y = targetCopy[i];
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
};

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset;
    byteOffset = 0;
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff;
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000;
  }
  byteOffset = +byteOffset;  // Coerce to Number.
  if (isNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1);
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1;
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0;
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding);
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (internalIsBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF; // Search for a byte value [0-255]
    if (Buffer.TYPED_ARRAY_SUPPORT &&
        typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1;
  var arrLength = arr.length;
  var valLength = val.length;

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase();
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2;
      arrLength /= 2;
      valLength /= 2;
      byteOffset /= 2;
    }
  }

  function read$$1 (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i;
  if (dir) {
    var foundIndex = -1;
    for (i = byteOffset; i < arrLength; i++) {
      if (read$$1(arr, i) === read$$1(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i;
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex;
        foundIndex = -1;
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
    for (i = byteOffset; i >= 0; i--) {
      var found = true;
      for (var j = 0; j < valLength; j++) {
        if (read$$1(arr, i + j) !== read$$1(val, j)) {
          found = false;
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
};

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
};

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
};

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0;
  var remaining = buf.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = Number(length);
    if (length > remaining) {
      length = remaining;
    }
  }

  // must be an even number of digits
  var strLen = string.length;
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2;
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16);
    if (isNaN(parsed)) return i
    buf[offset + i] = parsed;
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write$$1 (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8';
    length = this.length;
    offset = 0;
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset;
    length = this.length;
    offset = 0;
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0;
    if (isFinite(length)) {
      length = length | 0;
      if (encoding === undefined) encoding = 'utf8';
    } else {
      encoding = length;
      length = undefined;
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset;
  if (length === undefined || length > remaining) length = remaining;

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8';

  var loweredCase = false;
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase();
        loweredCase = true;
    }
  }
};

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
};

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return fromByteArray(buf)
  } else {
    return fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end);
  var res = [];

  var i = start;
  while (i < end) {
    var firstByte = buf[i];
    var codePoint = null;
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1;

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint;

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte;
          }
          break
        case 2:
          secondByte = buf[i + 1];
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F);
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint;
            }
          }
          break
        case 3:
          secondByte = buf[i + 1];
          thirdByte = buf[i + 2];
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F);
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint;
            }
          }
          break
        case 4:
          secondByte = buf[i + 1];
          thirdByte = buf[i + 2];
          fourthByte = buf[i + 3];
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F);
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint;
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD;
      bytesPerSequence = 1;
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000;
      res.push(codePoint >>> 10 & 0x3FF | 0xD800);
      codePoint = 0xDC00 | codePoint & 0x3FF;
    }

    res.push(codePoint);
    i += bytesPerSequence;
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000;

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length;
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = '';
  var i = 0;
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    );
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = '';
  end = Math.min(buf.length, end);

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F);
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = '';
  end = Math.min(buf.length, end);

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i]);
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length;

  if (!start || start < 0) start = 0;
  if (!end || end < 0 || end > len) end = len;

  var out = '';
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i]);
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end);
  var res = '';
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length;
  start = ~~start;
  end = end === undefined ? len : ~~end;

  if (start < 0) {
    start += len;
    if (start < 0) start = 0;
  } else if (start > len) {
    start = len;
  }

  if (end < 0) {
    end += len;
    if (end < 0) end = 0;
  } else if (end > len) {
    end = len;
  }

  if (end < start) end = start;

  var newBuf;
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = this.subarray(start, end);
    newBuf.__proto__ = Buffer.prototype;
  } else {
    var sliceLen = end - start;
    newBuf = new Buffer(sliceLen, undefined);
    for (var i = 0; i < sliceLen; ++i) {
      newBuf[i] = this[i + start];
    }
  }

  return newBuf
};

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) checkOffset(offset, byteLength, this.length);

  var val = this[offset];
  var mul = 1;
  var i = 0;
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul;
  }

  return val
};

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length);
  }

  var val = this[offset + --byteLength];
  var mul = 1;
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul;
  }

  return val
};

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length);
  return this[offset]
};

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length);
  return this[offset] | (this[offset + 1] << 8)
};

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length);
  return (this[offset] << 8) | this[offset + 1]
};

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
};

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
};

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) checkOffset(offset, byteLength, this.length);

  var val = this[offset];
  var mul = 1;
  var i = 0;
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul;
  }
  mul *= 0x80;

  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

  return val
};

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) checkOffset(offset, byteLength, this.length);

  var i = byteLength;
  var mul = 1;
  var val = this[offset + --i];
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul;
  }
  mul *= 0x80;

  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

  return val
};

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length);
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
};

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length);
  var val = this[offset] | (this[offset + 1] << 8);
  return (val & 0x8000) ? val | 0xFFFF0000 : val
};

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length);
  var val = this[offset + 1] | (this[offset] << 8);
  return (val & 0x8000) ? val | 0xFFFF0000 : val
};

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
};

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
};

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);
  return read(this, offset, true, 23, 4)
};

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);
  return read(this, offset, false, 23, 4)
};

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length);
  return read(this, offset, true, 52, 8)
};

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length);
  return read(this, offset, false, 52, 8)
};

function checkInt (buf, value, offset, ext, max, min) {
  if (!internalIsBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1;
    checkInt(this, value, offset, byteLength, maxBytes, 0);
  }

  var mul = 1;
  var i = 0;
  this[offset] = value & 0xFF;
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF;
  }

  return offset + byteLength
};

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1;
    checkInt(this, value, offset, byteLength, maxBytes, 0);
  }

  var i = byteLength - 1;
  var mul = 1;
  this[offset + i] = value & 0xFF;
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF;
  }

  return offset + byteLength
};

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0);
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value);
  this[offset] = (value & 0xff);
  return offset + 1
};

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1;
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8;
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff);
    this[offset + 1] = (value >>> 8);
  } else {
    objectWriteUInt16(this, value, offset, true);
  }
  return offset + 2
};

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8);
    this[offset + 1] = (value & 0xff);
  } else {
    objectWriteUInt16(this, value, offset, false);
  }
  return offset + 2
};

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1;
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff;
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24);
    this[offset + 2] = (value >>> 16);
    this[offset + 1] = (value >>> 8);
    this[offset] = (value & 0xff);
  } else {
    objectWriteUInt32(this, value, offset, true);
  }
  return offset + 4
};

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24);
    this[offset + 1] = (value >>> 16);
    this[offset + 2] = (value >>> 8);
    this[offset + 3] = (value & 0xff);
  } else {
    objectWriteUInt32(this, value, offset, false);
  }
  return offset + 4
};

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1);

    checkInt(this, value, offset, byteLength, limit - 1, -limit);
  }

  var i = 0;
  var mul = 1;
  var sub = 0;
  this[offset] = value & 0xFF;
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1;
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
  }

  return offset + byteLength
};

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1);

    checkInt(this, value, offset, byteLength, limit - 1, -limit);
  }

  var i = byteLength - 1;
  var mul = 1;
  var sub = 0;
  this[offset + i] = value & 0xFF;
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1;
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
  }

  return offset + byteLength
};

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80);
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value);
  if (value < 0) value = 0xff + value + 1;
  this[offset] = (value & 0xff);
  return offset + 1
};

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff);
    this[offset + 1] = (value >>> 8);
  } else {
    objectWriteUInt16(this, value, offset, true);
  }
  return offset + 2
};

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8);
    this[offset + 1] = (value & 0xff);
  } else {
    objectWriteUInt16(this, value, offset, false);
  }
  return offset + 2
};

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff);
    this[offset + 1] = (value >>> 8);
    this[offset + 2] = (value >>> 16);
    this[offset + 3] = (value >>> 24);
  } else {
    objectWriteUInt32(this, value, offset, true);
  }
  return offset + 4
};

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
  if (value < 0) value = 0xffffffff + value + 1;
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24);
    this[offset + 1] = (value >>> 16);
    this[offset + 2] = (value >>> 8);
    this[offset + 3] = (value & 0xff);
  } else {
    objectWriteUInt32(this, value, offset, false);
  }
  return offset + 4
};

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38);
  }
  write(buf, value, offset, littleEndian, 23, 4);
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
};

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
};

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308);
  }
  write(buf, value, offset, littleEndian, 52, 8);
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
};

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
};

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0;
  if (!end && end !== 0) end = this.length;
  if (targetStart >= target.length) targetStart = target.length;
  if (!targetStart) targetStart = 0;
  if (end > 0 && end < start) end = start;

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length;
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start;
  }

  var len = end - start;
  var i;

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start];
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start];
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    );
  }

  return len
};

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start;
      start = 0;
      end = this.length;
    } else if (typeof end === 'string') {
      encoding = end;
      end = this.length;
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0);
      if (code < 256) {
        val = code;
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255;
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0;
  end = end === undefined ? this.length : end >>> 0;

  if (!val) val = 0;

  var i;
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val;
    }
  } else {
    var bytes = internalIsBuffer(val)
      ? val
      : utf8ToBytes(new Buffer(val, encoding).toString());
    var len = bytes.length;
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len];
    }
  }

  return this
};

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g;

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '');
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '=';
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity;
  var codePoint;
  var length = string.length;
  var leadSurrogate = null;
  var bytes = [];

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i);

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
          continue
        }

        // valid lead
        leadSurrogate = codePoint;

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
        leadSurrogate = codePoint;
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000;
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
    }

    leadSurrogate = null;

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint);
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      );
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      );
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      );
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = [];
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF);
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo;
  var byteArray = [];
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i);
    hi = c >> 8;
    lo = c % 256;
    byteArray.push(lo);
    byteArray.push(hi);
  }

  return byteArray
}


function base64ToBytes (str) {
  return toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i];
  }
  return i
}

function isnan (val) {
  return val !== val // eslint-disable-line no-self-compare
}


// the following is from is-buffer, also by Feross Aboukhadijeh and with same lisence
// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
function isBuffer(obj) {
  return obj != null && (!!obj._isBuffer || isFastBuffer(obj) || isSlowBuffer(obj))
}

function isFastBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isFastBuffer(obj.slice(0, 0))
}


var index = Object.freeze({
	INSPECT_MAX_BYTES: INSPECT_MAX_BYTES,
	kMaxLength: _kMaxLength,
	Buffer: Buffer,
	SlowBuffer: SlowBuffer,
	isBuffer: isBuffer
});

var require$$0 = ( empty$1 && empty ) || empty$1;

var require$$1 = ( index && undefined ) || index;

var md5 = createCommonjsModule(function (module) {
/**
 * [js-md5]{@link https://github.com/emn178/js-md5}
 *
 * @namespace md5
 * @version 0.4.2
 * @author Chen, Yi-Cyuan [emn178@gmail.com]
 * @copyright Chen, Yi-Cyuan 2014-2017
 * @license MIT
 */
(function () {
  'use strict';

  var root = typeof window === 'object' ? window : {};
  var NODE_JS = !root.JS_MD5_NO_NODE_JS && typeof process === 'object' && process.versions && process.versions.node;
  if (NODE_JS) {
    root = commonjsGlobal;
  }
  var COMMON_JS = !root.JS_MD5_NO_COMMON_JS && 'object' === 'object' && module.exports;
  var AMD = typeof undefined === 'function' && undefined.amd;
  var ARRAY_BUFFER = !root.JS_MD5_NO_ARRAY_BUFFER && typeof ArrayBuffer !== 'undefined';
  var HEX_CHARS = '0123456789abcdef'.split('');
  var EXTRA = [128, 32768, 8388608, -2147483648];
  var SHIFT = [0, 8, 16, 24];
  var OUTPUT_TYPES = ['hex', 'array', 'digest', 'buffer', 'arrayBuffer'];

  var blocks = [], buffer8;
  if (ARRAY_BUFFER) {
    var buffer = new ArrayBuffer(68);
    buffer8 = new Uint8Array(buffer);
    blocks = new Uint32Array(buffer);
  }

  /**
   * @method hex
   * @memberof md5
   * @description Output hash as hex string
   * @param {String|Array|Uint8Array|ArrayBuffer} message message to hash
   * @returns {String} Hex string
   * @example
   * md5.hex('The quick brown fox jumps over the lazy dog');
   * // equal to
   * md5('The quick brown fox jumps over the lazy dog');
   */
  /**
   * @method digest
   * @memberof md5
   * @description Output hash as bytes array
   * @param {String|Array|Uint8Array|ArrayBuffer} message message to hash
   * @returns {Array} Bytes array
   * @example
   * md5.digest('The quick brown fox jumps over the lazy dog');
   */
  /**
   * @method array
   * @memberof md5
   * @description Output hash as bytes array
   * @param {String|Array|Uint8Array|ArrayBuffer} message message to hash
   * @returns {Array} Bytes array
   * @example
   * md5.array('The quick brown fox jumps over the lazy dog');
   */
  /**
   * @method arrayBuffer
   * @memberof md5
   * @description Output hash as ArrayBuffer
   * @param {String|Array|Uint8Array|ArrayBuffer} message message to hash
   * @returns {ArrayBuffer} ArrayBuffer
   * @example
   * md5.arrayBuffer('The quick brown fox jumps over the lazy dog');
   */
  /**
   * @method buffer
   * @deprecated This maybe confuse with Buffer in node.js. Please use arrayBuffer instead.
   * @memberof md5
   * @description Output hash as ArrayBuffer
   * @param {String|Array|Uint8Array|ArrayBuffer} message message to hash
   * @returns {ArrayBuffer} ArrayBuffer
   * @example
   * md5.buffer('The quick brown fox jumps over the lazy dog');
   */
  var createOutputMethod = function (outputType) {
    return function (message) {
      return new Md5(true).update(message)[outputType]();
    };
  };

  /**
   * @method create
   * @memberof md5
   * @description Create Md5 object
   * @returns {Md5} Md5 object.
   * @example
   * var hash = md5.create();
   */
  /**
   * @method update
   * @memberof md5
   * @description Create and update Md5 object
   * @param {String|Array|Uint8Array|ArrayBuffer} message message to hash
   * @returns {Md5} Md5 object.
   * @example
   * var hash = md5.update('The quick brown fox jumps over the lazy dog');
   * // equal to
   * var hash = md5.create();
   * hash.update('The quick brown fox jumps over the lazy dog');
   */
  var createMethod = function () {
    var method = createOutputMethod('hex');
    if (NODE_JS) {
      method = nodeWrap(method);
    }
    method.create = function () {
      return new Md5();
    };
    method.update = function (message) {
      return method.create().update(message);
    };
    for (var i = 0; i < OUTPUT_TYPES.length; ++i) {
      var type = OUTPUT_TYPES[i];
      method[type] = createOutputMethod(type);
    }
    return method;
  };

  var nodeWrap = function (method) {
    var crypto = require$$0;
    var Buffer = require$$1.Buffer;
    var nodeMethod = function (message) {
      if (typeof message === 'string') {
        return crypto.createHash('md5').update(message, 'utf8').digest('hex');
      } else if (message.constructor === ArrayBuffer) {
        message = new Uint8Array(message);
      } else if (message.length === undefined) {
        return method(message);
      }
      return crypto.createHash('md5').update(new Buffer(message)).digest('hex');
    };
    return nodeMethod;
  };

  /**
   * Md5 class
   * @class Md5
   * @description This is internal class.
   * @see {@link md5.create}
   */
  function Md5(sharedMemory) {
    if (sharedMemory) {
      blocks[0] = blocks[16] = blocks[1] = blocks[2] = blocks[3] =
      blocks[4] = blocks[5] = blocks[6] = blocks[7] =
      blocks[8] = blocks[9] = blocks[10] = blocks[11] =
      blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
      this.blocks = blocks;
      this.buffer8 = buffer8;
    } else {
      if (ARRAY_BUFFER) {
        var buffer = new ArrayBuffer(68);
        this.buffer8 = new Uint8Array(buffer);
        this.blocks = new Uint32Array(buffer);
      } else {
        this.blocks = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      }
    }
    this.h0 = this.h1 = this.h2 = this.h3 = this.start = this.bytes = 0;
    this.finalized = this.hashed = false;
    this.first = true;
  }

  /**
   * @method update
   * @memberof Md5
   * @instance
   * @description Update hash
   * @param {String|Array|Uint8Array|ArrayBuffer} message message to hash
   * @returns {Md5} Md5 object.
   * @see {@link md5.update}
   */
  Md5.prototype.update = function (message) {
    if (this.finalized) {
      return;
    }
    var notString = typeof(message) != 'string';
    if (notString && message.constructor == root.ArrayBuffer) {
      message = new Uint8Array(message);
    }
    var code, index = 0, i, length = message.length || 0, blocks = this.blocks;
    var buffer8 = this.buffer8;

    while (index < length) {
      if (this.hashed) {
        this.hashed = false;
        blocks[0] = blocks[16];
        blocks[16] = blocks[1] = blocks[2] = blocks[3] =
        blocks[4] = blocks[5] = blocks[6] = blocks[7] =
        blocks[8] = blocks[9] = blocks[10] = blocks[11] =
        blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
      }

      if (notString) {
        if (ARRAY_BUFFER) {
          for (i = this.start; index < length && i < 64; ++index) {
            buffer8[i++] = message[index];
          }
        } else {
          for (i = this.start; index < length && i < 64; ++index) {
            blocks[i >> 2] |= message[index] << SHIFT[i++ & 3];
          }
        }
      } else {
        if (ARRAY_BUFFER) {
          for (i = this.start; index < length && i < 64; ++index) {
            code = message.charCodeAt(index);
            if (code < 0x80) {
              buffer8[i++] = code;
            } else if (code < 0x800) {
              buffer8[i++] = 0xc0 | (code >> 6);
              buffer8[i++] = 0x80 | (code & 0x3f);
            } else if (code < 0xd800 || code >= 0xe000) {
              buffer8[i++] = 0xe0 | (code >> 12);
              buffer8[i++] = 0x80 | ((code >> 6) & 0x3f);
              buffer8[i++] = 0x80 | (code & 0x3f);
            } else {
              code = 0x10000 + (((code & 0x3ff) << 10) | (message.charCodeAt(++index) & 0x3ff));
              buffer8[i++] = 0xf0 | (code >> 18);
              buffer8[i++] = 0x80 | ((code >> 12) & 0x3f);
              buffer8[i++] = 0x80 | ((code >> 6) & 0x3f);
              buffer8[i++] = 0x80 | (code & 0x3f);
            }
          }
        } else {
          for (i = this.start; index < length && i < 64; ++index) {
            code = message.charCodeAt(index);
            if (code < 0x80) {
              blocks[i >> 2] |= code << SHIFT[i++ & 3];
            } else if (code < 0x800) {
              blocks[i >> 2] |= (0xc0 | (code >> 6)) << SHIFT[i++ & 3];
              blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
            } else if (code < 0xd800 || code >= 0xe000) {
              blocks[i >> 2] |= (0xe0 | (code >> 12)) << SHIFT[i++ & 3];
              blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
              blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
            } else {
              code = 0x10000 + (((code & 0x3ff) << 10) | (message.charCodeAt(++index) & 0x3ff));
              blocks[i >> 2] |= (0xf0 | (code >> 18)) << SHIFT[i++ & 3];
              blocks[i >> 2] |= (0x80 | ((code >> 12) & 0x3f)) << SHIFT[i++ & 3];
              blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
              blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
            }
          }
        }
      }
      this.lastByteIndex = i;
      this.bytes += i - this.start;
      if (i >= 64) {
        this.start = i - 64;
        this.hash();
        this.hashed = true;
      } else {
        this.start = i;
      }
    }
    return this;
  };

  Md5.prototype.finalize = function () {
    if (this.finalized) {
      return;
    }
    this.finalized = true;
    var blocks = this.blocks, i = this.lastByteIndex;
    blocks[i >> 2] |= EXTRA[i & 3];
    if (i >= 56) {
      if (!this.hashed) {
        this.hash();
      }
      blocks[0] = blocks[16];
      blocks[16] = blocks[1] = blocks[2] = blocks[3] =
      blocks[4] = blocks[5] = blocks[6] = blocks[7] =
      blocks[8] = blocks[9] = blocks[10] = blocks[11] =
      blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
    }
    blocks[14] = this.bytes << 3;
    this.hash();
  };

  Md5.prototype.hash = function () {
    var a, b, c, d, bc, da, blocks = this.blocks;

    if (this.first) {
      a = blocks[0] - 680876937;
      a = (a << 7 | a >>> 25) - 271733879 << 0;
      d = (-1732584194 ^ a & 2004318071) + blocks[1] - 117830708;
      d = (d << 12 | d >>> 20) + a << 0;
      c = (-271733879 ^ (d & (a ^ -271733879))) + blocks[2] - 1126478375;
      c = (c << 17 | c >>> 15) + d << 0;
      b = (a ^ (c & (d ^ a))) + blocks[3] - 1316259209;
      b = (b << 22 | b >>> 10) + c << 0;
    } else {
      a = this.h0;
      b = this.h1;
      c = this.h2;
      d = this.h3;
      a += (d ^ (b & (c ^ d))) + blocks[0] - 680876936;
      a = (a << 7 | a >>> 25) + b << 0;
      d += (c ^ (a & (b ^ c))) + blocks[1] - 389564586;
      d = (d << 12 | d >>> 20) + a << 0;
      c += (b ^ (d & (a ^ b))) + blocks[2] + 606105819;
      c = (c << 17 | c >>> 15) + d << 0;
      b += (a ^ (c & (d ^ a))) + blocks[3] - 1044525330;
      b = (b << 22 | b >>> 10) + c << 0;
    }

    a += (d ^ (b & (c ^ d))) + blocks[4] - 176418897;
    a = (a << 7 | a >>> 25) + b << 0;
    d += (c ^ (a & (b ^ c))) + blocks[5] + 1200080426;
    d = (d << 12 | d >>> 20) + a << 0;
    c += (b ^ (d & (a ^ b))) + blocks[6] - 1473231341;
    c = (c << 17 | c >>> 15) + d << 0;
    b += (a ^ (c & (d ^ a))) + blocks[7] - 45705983;
    b = (b << 22 | b >>> 10) + c << 0;
    a += (d ^ (b & (c ^ d))) + blocks[8] + 1770035416;
    a = (a << 7 | a >>> 25) + b << 0;
    d += (c ^ (a & (b ^ c))) + blocks[9] - 1958414417;
    d = (d << 12 | d >>> 20) + a << 0;
    c += (b ^ (d & (a ^ b))) + blocks[10] - 42063;
    c = (c << 17 | c >>> 15) + d << 0;
    b += (a ^ (c & (d ^ a))) + blocks[11] - 1990404162;
    b = (b << 22 | b >>> 10) + c << 0;
    a += (d ^ (b & (c ^ d))) + blocks[12] + 1804603682;
    a = (a << 7 | a >>> 25) + b << 0;
    d += (c ^ (a & (b ^ c))) + blocks[13] - 40341101;
    d = (d << 12 | d >>> 20) + a << 0;
    c += (b ^ (d & (a ^ b))) + blocks[14] - 1502002290;
    c = (c << 17 | c >>> 15) + d << 0;
    b += (a ^ (c & (d ^ a))) + blocks[15] + 1236535329;
    b = (b << 22 | b >>> 10) + c << 0;
    a += (c ^ (d & (b ^ c))) + blocks[1] - 165796510;
    a = (a << 5 | a >>> 27) + b << 0;
    d += (b ^ (c & (a ^ b))) + blocks[6] - 1069501632;
    d = (d << 9 | d >>> 23) + a << 0;
    c += (a ^ (b & (d ^ a))) + blocks[11] + 643717713;
    c = (c << 14 | c >>> 18) + d << 0;
    b += (d ^ (a & (c ^ d))) + blocks[0] - 373897302;
    b = (b << 20 | b >>> 12) + c << 0;
    a += (c ^ (d & (b ^ c))) + blocks[5] - 701558691;
    a = (a << 5 | a >>> 27) + b << 0;
    d += (b ^ (c & (a ^ b))) + blocks[10] + 38016083;
    d = (d << 9 | d >>> 23) + a << 0;
    c += (a ^ (b & (d ^ a))) + blocks[15] - 660478335;
    c = (c << 14 | c >>> 18) + d << 0;
    b += (d ^ (a & (c ^ d))) + blocks[4] - 405537848;
    b = (b << 20 | b >>> 12) + c << 0;
    a += (c ^ (d & (b ^ c))) + blocks[9] + 568446438;
    a = (a << 5 | a >>> 27) + b << 0;
    d += (b ^ (c & (a ^ b))) + blocks[14] - 1019803690;
    d = (d << 9 | d >>> 23) + a << 0;
    c += (a ^ (b & (d ^ a))) + blocks[3] - 187363961;
    c = (c << 14 | c >>> 18) + d << 0;
    b += (d ^ (a & (c ^ d))) + blocks[8] + 1163531501;
    b = (b << 20 | b >>> 12) + c << 0;
    a += (c ^ (d & (b ^ c))) + blocks[13] - 1444681467;
    a = (a << 5 | a >>> 27) + b << 0;
    d += (b ^ (c & (a ^ b))) + blocks[2] - 51403784;
    d = (d << 9 | d >>> 23) + a << 0;
    c += (a ^ (b & (d ^ a))) + blocks[7] + 1735328473;
    c = (c << 14 | c >>> 18) + d << 0;
    b += (d ^ (a & (c ^ d))) + blocks[12] - 1926607734;
    b = (b << 20 | b >>> 12) + c << 0;
    bc = b ^ c;
    a += (bc ^ d) + blocks[5] - 378558;
    a = (a << 4 | a >>> 28) + b << 0;
    d += (bc ^ a) + blocks[8] - 2022574463;
    d = (d << 11 | d >>> 21) + a << 0;
    da = d ^ a;
    c += (da ^ b) + blocks[11] + 1839030562;
    c = (c << 16 | c >>> 16) + d << 0;
    b += (da ^ c) + blocks[14] - 35309556;
    b = (b << 23 | b >>> 9) + c << 0;
    bc = b ^ c;
    a += (bc ^ d) + blocks[1] - 1530992060;
    a = (a << 4 | a >>> 28) + b << 0;
    d += (bc ^ a) + blocks[4] + 1272893353;
    d = (d << 11 | d >>> 21) + a << 0;
    da = d ^ a;
    c += (da ^ b) + blocks[7] - 155497632;
    c = (c << 16 | c >>> 16) + d << 0;
    b += (da ^ c) + blocks[10] - 1094730640;
    b = (b << 23 | b >>> 9) + c << 0;
    bc = b ^ c;
    a += (bc ^ d) + blocks[13] + 681279174;
    a = (a << 4 | a >>> 28) + b << 0;
    d += (bc ^ a) + blocks[0] - 358537222;
    d = (d << 11 | d >>> 21) + a << 0;
    da = d ^ a;
    c += (da ^ b) + blocks[3] - 722521979;
    c = (c << 16 | c >>> 16) + d << 0;
    b += (da ^ c) + blocks[6] + 76029189;
    b = (b << 23 | b >>> 9) + c << 0;
    bc = b ^ c;
    a += (bc ^ d) + blocks[9] - 640364487;
    a = (a << 4 | a >>> 28) + b << 0;
    d += (bc ^ a) + blocks[12] - 421815835;
    d = (d << 11 | d >>> 21) + a << 0;
    da = d ^ a;
    c += (da ^ b) + blocks[15] + 530742520;
    c = (c << 16 | c >>> 16) + d << 0;
    b += (da ^ c) + blocks[2] - 995338651;
    b = (b << 23 | b >>> 9) + c << 0;
    a += (c ^ (b | ~d)) + blocks[0] - 198630844;
    a = (a << 6 | a >>> 26) + b << 0;
    d += (b ^ (a | ~c)) + blocks[7] + 1126891415;
    d = (d << 10 | d >>> 22) + a << 0;
    c += (a ^ (d | ~b)) + blocks[14] - 1416354905;
    c = (c << 15 | c >>> 17) + d << 0;
    b += (d ^ (c | ~a)) + blocks[5] - 57434055;
    b = (b << 21 | b >>> 11) + c << 0;
    a += (c ^ (b | ~d)) + blocks[12] + 1700485571;
    a = (a << 6 | a >>> 26) + b << 0;
    d += (b ^ (a | ~c)) + blocks[3] - 1894986606;
    d = (d << 10 | d >>> 22) + a << 0;
    c += (a ^ (d | ~b)) + blocks[10] - 1051523;
    c = (c << 15 | c >>> 17) + d << 0;
    b += (d ^ (c | ~a)) + blocks[1] - 2054922799;
    b = (b << 21 | b >>> 11) + c << 0;
    a += (c ^ (b | ~d)) + blocks[8] + 1873313359;
    a = (a << 6 | a >>> 26) + b << 0;
    d += (b ^ (a | ~c)) + blocks[15] - 30611744;
    d = (d << 10 | d >>> 22) + a << 0;
    c += (a ^ (d | ~b)) + blocks[6] - 1560198380;
    c = (c << 15 | c >>> 17) + d << 0;
    b += (d ^ (c | ~a)) + blocks[13] + 1309151649;
    b = (b << 21 | b >>> 11) + c << 0;
    a += (c ^ (b | ~d)) + blocks[4] - 145523070;
    a = (a << 6 | a >>> 26) + b << 0;
    d += (b ^ (a | ~c)) + blocks[11] - 1120210379;
    d = (d << 10 | d >>> 22) + a << 0;
    c += (a ^ (d | ~b)) + blocks[2] + 718787259;
    c = (c << 15 | c >>> 17) + d << 0;
    b += (d ^ (c | ~a)) + blocks[9] - 343485551;
    b = (b << 21 | b >>> 11) + c << 0;

    if (this.first) {
      this.h0 = a + 1732584193 << 0;
      this.h1 = b - 271733879 << 0;
      this.h2 = c - 1732584194 << 0;
      this.h3 = d + 271733878 << 0;
      this.first = false;
    } else {
      this.h0 = this.h0 + a << 0;
      this.h1 = this.h1 + b << 0;
      this.h2 = this.h2 + c << 0;
      this.h3 = this.h3 + d << 0;
    }
  };

  /**
   * @method hex
   * @memberof Md5
   * @instance
   * @description Output hash as hex string
   * @returns {String} Hex string
   * @see {@link md5.hex}
   * @example
   * hash.hex();
   */
  Md5.prototype.hex = function () {
    this.finalize();

    var h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3;

    return HEX_CHARS[(h0 >> 4) & 0x0F] + HEX_CHARS[h0 & 0x0F] +
       HEX_CHARS[(h0 >> 12) & 0x0F] + HEX_CHARS[(h0 >> 8) & 0x0F] +
       HEX_CHARS[(h0 >> 20) & 0x0F] + HEX_CHARS[(h0 >> 16) & 0x0F] +
       HEX_CHARS[(h0 >> 28) & 0x0F] + HEX_CHARS[(h0 >> 24) & 0x0F] +
       HEX_CHARS[(h1 >> 4) & 0x0F] + HEX_CHARS[h1 & 0x0F] +
       HEX_CHARS[(h1 >> 12) & 0x0F] + HEX_CHARS[(h1 >> 8) & 0x0F] +
       HEX_CHARS[(h1 >> 20) & 0x0F] + HEX_CHARS[(h1 >> 16) & 0x0F] +
       HEX_CHARS[(h1 >> 28) & 0x0F] + HEX_CHARS[(h1 >> 24) & 0x0F] +
       HEX_CHARS[(h2 >> 4) & 0x0F] + HEX_CHARS[h2 & 0x0F] +
       HEX_CHARS[(h2 >> 12) & 0x0F] + HEX_CHARS[(h2 >> 8) & 0x0F] +
       HEX_CHARS[(h2 >> 20) & 0x0F] + HEX_CHARS[(h2 >> 16) & 0x0F] +
       HEX_CHARS[(h2 >> 28) & 0x0F] + HEX_CHARS[(h2 >> 24) & 0x0F] +
       HEX_CHARS[(h3 >> 4) & 0x0F] + HEX_CHARS[h3 & 0x0F] +
       HEX_CHARS[(h3 >> 12) & 0x0F] + HEX_CHARS[(h3 >> 8) & 0x0F] +
       HEX_CHARS[(h3 >> 20) & 0x0F] + HEX_CHARS[(h3 >> 16) & 0x0F] +
       HEX_CHARS[(h3 >> 28) & 0x0F] + HEX_CHARS[(h3 >> 24) & 0x0F];
  };

  /**
   * @method toString
   * @memberof Md5
   * @instance
   * @description Output hash as hex string
   * @returns {String} Hex string
   * @see {@link md5.hex}
   * @example
   * hash.toString();
   */
  Md5.prototype.toString = Md5.prototype.hex;

  /**
   * @method digest
   * @memberof Md5
   * @instance
   * @description Output hash as bytes array
   * @returns {Array} Bytes array
   * @see {@link md5.digest}
   * @example
   * hash.digest();
   */
  Md5.prototype.digest = function () {
    this.finalize();

    var h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3;
    return [
      h0 & 0xFF, (h0 >> 8) & 0xFF, (h0 >> 16) & 0xFF, (h0 >> 24) & 0xFF,
      h1 & 0xFF, (h1 >> 8) & 0xFF, (h1 >> 16) & 0xFF, (h1 >> 24) & 0xFF,
      h2 & 0xFF, (h2 >> 8) & 0xFF, (h2 >> 16) & 0xFF, (h2 >> 24) & 0xFF,
      h3 & 0xFF, (h3 >> 8) & 0xFF, (h3 >> 16) & 0xFF, (h3 >> 24) & 0xFF
    ];
  };

  /**
   * @method array
   * @memberof Md5
   * @instance
   * @description Output hash as bytes array
   * @returns {Array} Bytes array
   * @see {@link md5.array}
   * @example
   * hash.array();
   */
  Md5.prototype.array = Md5.prototype.digest;

  /**
   * @method arrayBuffer
   * @memberof Md5
   * @instance
   * @description Output hash as ArrayBuffer
   * @returns {ArrayBuffer} ArrayBuffer
   * @see {@link md5.arrayBuffer}
   * @example
   * hash.arrayBuffer();
   */
  Md5.prototype.arrayBuffer = function () {
    this.finalize();

    var buffer = new ArrayBuffer(16);
    var blocks = new Uint32Array(buffer);
    blocks[0] = this.h0;
    blocks[1] = this.h1;
    blocks[2] = this.h2;
    blocks[3] = this.h3;
    return buffer;
  };

  /**
   * @method buffer
   * @deprecated This maybe confuse with Buffer in node.js. Please use arrayBuffer instead.
   * @memberof Md5
   * @instance
   * @description Output hash as ArrayBuffer
   * @returns {ArrayBuffer} ArrayBuffer
   * @see {@link md5.buffer}
   * @example
   * hash.buffer();
   */
  Md5.prototype.buffer = Md5.prototype.arrayBuffer;

  var exports = createMethod();

  if (COMMON_JS) {
    module.exports = exports;
  } else {
    /**
     * @method md5
     * @description Md5 hash function, export to global in browsers.
     * @param {String|Array|Uint8Array|ArrayBuffer} message message to hash
     * @returns {String} md5 hashes
     * @example
     * md5(''); // d41d8cd98f00b204e9800998ecf8427e
     * md5('The quick brown fox jumps over the lazy dog'); // 9e107d9d372bb6826bd81d3542a419d6
     * md5('The quick brown fox jumps over the lazy dog.'); // e4d909c290d0fb1ca068ffaddf22cbd0
     *
     * // It also supports UTF-8 encoding
     * md5('中文'); // a7bac2239fcdcb3a067903d8077c4a07
     *
     * // It also supports byte `Array`, `Uint8Array`, `ArrayBuffer`
     * md5([]); // d41d8cd98f00b204e9800998ecf8427e
     * md5(new Uint8Array([])); // d41d8cd98f00b204e9800998ecf8427e
     */
    root.md5 = exports;
    if (AMD) {
      undefined(function () {
        return exports;
      });
    }
  }
})();
});

var common = createCommonjsModule(function (module, exports) {
'use strict';


var TYPED_OK =  (typeof Uint8Array !== 'undefined') &&
                (typeof Uint16Array !== 'undefined') &&
                (typeof Int32Array !== 'undefined');


exports.assign = function (obj /*from1, from2, from3, ...*/) {
  var sources = Array.prototype.slice.call(arguments, 1);
  while (sources.length) {
    var source = sources.shift();
    if (!source) { continue; }

    if (typeof source !== 'object') {
      throw new TypeError(source + 'must be non-object');
    }

    for (var p in source) {
      if (source.hasOwnProperty(p)) {
        obj[p] = source[p];
      }
    }
  }

  return obj;
};


// reduce buffer size, avoiding mem copy
exports.shrinkBuf = function (buf, size) {
  if (buf.length === size) { return buf; }
  if (buf.subarray) { return buf.subarray(0, size); }
  buf.length = size;
  return buf;
};


var fnTyped = {
  arraySet: function (dest, src, src_offs, len, dest_offs) {
    if (src.subarray && dest.subarray) {
      dest.set(src.subarray(src_offs, src_offs + len), dest_offs);
      return;
    }
    // Fallback to ordinary array
    for (var i = 0; i < len; i++) {
      dest[dest_offs + i] = src[src_offs + i];
    }
  },
  // Join array of chunks to single array.
  flattenChunks: function (chunks) {
    var i, l, len, pos, chunk, result;

    // calculate data length
    len = 0;
    for (i = 0, l = chunks.length; i < l; i++) {
      len += chunks[i].length;
    }

    // join chunks
    result = new Uint8Array(len);
    pos = 0;
    for (i = 0, l = chunks.length; i < l; i++) {
      chunk = chunks[i];
      result.set(chunk, pos);
      pos += chunk.length;
    }

    return result;
  }
};

var fnUntyped = {
  arraySet: function (dest, src, src_offs, len, dest_offs) {
    for (var i = 0; i < len; i++) {
      dest[dest_offs + i] = src[src_offs + i];
    }
  },
  // Join array of chunks to single array.
  flattenChunks: function (chunks) {
    return [].concat.apply([], chunks);
  }
};


// Enable/Disable typed arrays use, for testing
//
exports.setTyped = function (on) {
  if (on) {
    exports.Buf8  = Uint8Array;
    exports.Buf16 = Uint16Array;
    exports.Buf32 = Int32Array;
    exports.assign(exports, fnTyped);
  } else {
    exports.Buf8  = Array;
    exports.Buf16 = Array;
    exports.Buf32 = Array;
    exports.assign(exports, fnUntyped);
  }
};

exports.setTyped(TYPED_OK);
});

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.



/* Public constants ==========================================================*/
/* ===========================================================================*/


//var Z_FILTERED          = 1;
//var Z_HUFFMAN_ONLY      = 2;
//var Z_RLE               = 3;
var Z_FIXED$1               = 4;
//var Z_DEFAULT_STRATEGY  = 0;

/* Possible values of the data_type field (though see inflate()) */
var Z_BINARY              = 0;
var Z_TEXT                = 1;
//var Z_ASCII             = 1; // = Z_TEXT
var Z_UNKNOWN$1             = 2;

/*============================================================================*/


function zero$1(buf) { var len = buf.length; while (--len >= 0) { buf[len] = 0; } }

// From zutil.h

var STORED_BLOCK = 0;
var STATIC_TREES = 1;
var DYN_TREES    = 2;
/* The three kinds of block type */

var MIN_MATCH$1    = 3;
var MAX_MATCH$1    = 258;
/* The minimum and maximum match lengths */

// From deflate.h
/* ===========================================================================
 * Internal compression state.
 */

var LENGTH_CODES$1  = 29;
/* number of length codes, not counting the special END_BLOCK code */

var LITERALS$1      = 256;
/* number of literal bytes 0..255 */

var L_CODES$1       = LITERALS$1 + 1 + LENGTH_CODES$1;
/* number of Literal or Length codes, including the END_BLOCK code */

var D_CODES$1       = 30;
/* number of distance codes */

var BL_CODES$1      = 19;
/* number of codes used to transfer the bit lengths */

var HEAP_SIZE$1     = 2 * L_CODES$1 + 1;
/* maximum heap size */

var MAX_BITS$1      = 15;
/* All codes must not exceed MAX_BITS bits */

var Buf_size      = 16;
/* size of bit buffer in bi_buf */


/* ===========================================================================
 * Constants
 */

var MAX_BL_BITS = 7;
/* Bit length codes must not exceed MAX_BL_BITS bits */

var END_BLOCK   = 256;
/* end of block literal code */

var REP_3_6     = 16;
/* repeat previous bit length 3-6 times (2 bits of repeat count) */

var REPZ_3_10   = 17;
/* repeat a zero length 3-10 times  (3 bits of repeat count) */

var REPZ_11_138 = 18;
/* repeat a zero length 11-138 times  (7 bits of repeat count) */

/* eslint-disable comma-spacing,array-bracket-spacing */
var extra_lbits =   /* extra bits for each length code */
  [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];

var extra_dbits =   /* extra bits for each distance code */
  [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];

var extra_blbits =  /* extra bits for each bit length code */
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7];

var bl_order =
  [16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];
/* eslint-enable comma-spacing,array-bracket-spacing */

/* The lengths of the bit length codes are sent in order of decreasing
 * probability, to avoid transmitting the lengths for unused bit length codes.
 */

/* ===========================================================================
 * Local data. These are initialized only once.
 */

// We pre-fill arrays with 0 to avoid uninitialized gaps

var DIST_CODE_LEN = 512; /* see definition of array dist_code below */

// !!!! Use flat array insdead of structure, Freq = i*2, Len = i*2+1
var static_ltree  = new Array((L_CODES$1 + 2) * 2);
zero$1(static_ltree);
/* The static literal tree. Since the bit lengths are imposed, there is no
 * need for the L_CODES extra codes used during heap construction. However
 * The codes 286 and 287 are needed to build a canonical tree (see _tr_init
 * below).
 */

var static_dtree  = new Array(D_CODES$1 * 2);
zero$1(static_dtree);
/* The static distance tree. (Actually a trivial tree since all codes use
 * 5 bits.)
 */

var _dist_code    = new Array(DIST_CODE_LEN);
zero$1(_dist_code);
/* Distance codes. The first 256 values correspond to the distances
 * 3 .. 258, the last 256 values correspond to the top 8 bits of
 * the 15 bit distances.
 */

var _length_code  = new Array(MAX_MATCH$1 - MIN_MATCH$1 + 1);
zero$1(_length_code);
/* length code for each normalized match length (0 == MIN_MATCH) */

var base_length   = new Array(LENGTH_CODES$1);
zero$1(base_length);
/* First normalized length for each code (0 = MIN_MATCH) */

var base_dist     = new Array(D_CODES$1);
zero$1(base_dist);
/* First normalized distance for each code (0 = distance of 1) */


function StaticTreeDesc(static_tree, extra_bits, extra_base, elems, max_length) {

  this.static_tree  = static_tree;  /* static tree or NULL */
  this.extra_bits   = extra_bits;   /* extra bits for each code or NULL */
  this.extra_base   = extra_base;   /* base index for extra_bits */
  this.elems        = elems;        /* max number of elements in the tree */
  this.max_length   = max_length;   /* max bit length for the codes */

  // show if `static_tree` has data or dummy - needed for monomorphic objects
  this.has_stree    = static_tree && static_tree.length;
}


var static_l_desc;
var static_d_desc;
var static_bl_desc;


function TreeDesc(dyn_tree, stat_desc) {
  this.dyn_tree = dyn_tree;     /* the dynamic tree */
  this.max_code = 0;            /* largest code with non zero frequency */
  this.stat_desc = stat_desc;   /* the corresponding static tree */
}



function d_code(dist) {
  return dist < 256 ? _dist_code[dist] : _dist_code[256 + (dist >>> 7)];
}


/* ===========================================================================
 * Output a short LSB first on the stream.
 * IN assertion: there is enough room in pendingBuf.
 */
function put_short(s, w) {
//    put_byte(s, (uch)((w) & 0xff));
//    put_byte(s, (uch)((ush)(w) >> 8));
  s.pending_buf[s.pending++] = (w) & 0xff;
  s.pending_buf[s.pending++] = (w >>> 8) & 0xff;
}


/* ===========================================================================
 * Send a value on a given number of bits.
 * IN assertion: length <= 16 and value fits in length bits.
 */
function send_bits(s, value, length) {
  if (s.bi_valid > (Buf_size - length)) {
    s.bi_buf |= (value << s.bi_valid) & 0xffff;
    put_short(s, s.bi_buf);
    s.bi_buf = value >> (Buf_size - s.bi_valid);
    s.bi_valid += length - Buf_size;
  } else {
    s.bi_buf |= (value << s.bi_valid) & 0xffff;
    s.bi_valid += length;
  }
}


function send_code(s, c, tree) {
  send_bits(s, tree[c * 2]/*.Code*/, tree[c * 2 + 1]/*.Len*/);
}


/* ===========================================================================
 * Reverse the first len bits of a code, using straightforward code (a faster
 * method would use a table)
 * IN assertion: 1 <= len <= 15
 */
function bi_reverse(code, len) {
  var res = 0;
  do {
    res |= code & 1;
    code >>>= 1;
    res <<= 1;
  } while (--len > 0);
  return res >>> 1;
}


/* ===========================================================================
 * Flush the bit buffer, keeping at most 7 bits in it.
 */
function bi_flush(s) {
  if (s.bi_valid === 16) {
    put_short(s, s.bi_buf);
    s.bi_buf = 0;
    s.bi_valid = 0;

  } else if (s.bi_valid >= 8) {
    s.pending_buf[s.pending++] = s.bi_buf & 0xff;
    s.bi_buf >>= 8;
    s.bi_valid -= 8;
  }
}


/* ===========================================================================
 * Compute the optimal bit lengths for a tree and update the total bit length
 * for the current block.
 * IN assertion: the fields freq and dad are set, heap[heap_max] and
 *    above are the tree nodes sorted by increasing frequency.
 * OUT assertions: the field len is set to the optimal bit length, the
 *     array bl_count contains the frequencies for each bit length.
 *     The length opt_len is updated; static_len is also updated if stree is
 *     not null.
 */
function gen_bitlen(s, desc)
//    deflate_state *s;
//    tree_desc *desc;    /* the tree descriptor */
{
  var tree            = desc.dyn_tree;
  var max_code        = desc.max_code;
  var stree           = desc.stat_desc.static_tree;
  var has_stree       = desc.stat_desc.has_stree;
  var extra           = desc.stat_desc.extra_bits;
  var base            = desc.stat_desc.extra_base;
  var max_length      = desc.stat_desc.max_length;
  var h;              /* heap index */
  var n, m;           /* iterate over the tree elements */
  var bits;           /* bit length */
  var xbits;          /* extra bits */
  var f;              /* frequency */
  var overflow = 0;   /* number of elements with bit length too large */

  for (bits = 0; bits <= MAX_BITS$1; bits++) {
    s.bl_count[bits] = 0;
  }

  /* In a first pass, compute the optimal bit lengths (which may
   * overflow in the case of the bit length tree).
   */
  tree[s.heap[s.heap_max] * 2 + 1]/*.Len*/ = 0; /* root of the heap */

  for (h = s.heap_max + 1; h < HEAP_SIZE$1; h++) {
    n = s.heap[h];
    bits = tree[tree[n * 2 + 1]/*.Dad*/ * 2 + 1]/*.Len*/ + 1;
    if (bits > max_length) {
      bits = max_length;
      overflow++;
    }
    tree[n * 2 + 1]/*.Len*/ = bits;
    /* We overwrite tree[n].Dad which is no longer needed */

    if (n > max_code) { continue; } /* not a leaf node */

    s.bl_count[bits]++;
    xbits = 0;
    if (n >= base) {
      xbits = extra[n - base];
    }
    f = tree[n * 2]/*.Freq*/;
    s.opt_len += f * (bits + xbits);
    if (has_stree) {
      s.static_len += f * (stree[n * 2 + 1]/*.Len*/ + xbits);
    }
  }
  if (overflow === 0) { return; }

  // Trace((stderr,"\nbit length overflow\n"));
  /* This happens for example on obj2 and pic of the Calgary corpus */

  /* Find the first bit length which could increase: */
  do {
    bits = max_length - 1;
    while (s.bl_count[bits] === 0) { bits--; }
    s.bl_count[bits]--;      /* move one leaf down the tree */
    s.bl_count[bits + 1] += 2; /* move one overflow item as its brother */
    s.bl_count[max_length]--;
    /* The brother of the overflow item also moves one step up,
     * but this does not affect bl_count[max_length]
     */
    overflow -= 2;
  } while (overflow > 0);

  /* Now recompute all bit lengths, scanning in increasing frequency.
   * h is still equal to HEAP_SIZE. (It is simpler to reconstruct all
   * lengths instead of fixing only the wrong ones. This idea is taken
   * from 'ar' written by Haruhiko Okumura.)
   */
  for (bits = max_length; bits !== 0; bits--) {
    n = s.bl_count[bits];
    while (n !== 0) {
      m = s.heap[--h];
      if (m > max_code) { continue; }
      if (tree[m * 2 + 1]/*.Len*/ !== bits) {
        // Trace((stderr,"code %d bits %d->%d\n", m, tree[m].Len, bits));
        s.opt_len += (bits - tree[m * 2 + 1]/*.Len*/) * tree[m * 2]/*.Freq*/;
        tree[m * 2 + 1]/*.Len*/ = bits;
      }
      n--;
    }
  }
}


/* ===========================================================================
 * Generate the codes for a given tree and bit counts (which need not be
 * optimal).
 * IN assertion: the array bl_count contains the bit length statistics for
 * the given tree and the field len is set for all tree elements.
 * OUT assertion: the field code is set for all tree elements of non
 *     zero code length.
 */
function gen_codes(tree, max_code, bl_count)
//    ct_data *tree;             /* the tree to decorate */
//    int max_code;              /* largest code with non zero frequency */
//    ushf *bl_count;            /* number of codes at each bit length */
{
  var next_code = new Array(MAX_BITS$1 + 1); /* next code value for each bit length */
  var code = 0;              /* running code value */
  var bits;                  /* bit index */
  var n;                     /* code index */

  /* The distribution counts are first used to generate the code values
   * without bit reversal.
   */
  for (bits = 1; bits <= MAX_BITS$1; bits++) {
    next_code[bits] = code = (code + bl_count[bits - 1]) << 1;
  }
  /* Check that the bit counts in bl_count are consistent. The last code
   * must be all ones.
   */
  //Assert (code + bl_count[MAX_BITS]-1 == (1<<MAX_BITS)-1,
  //        "inconsistent bit counts");
  //Tracev((stderr,"\ngen_codes: max_code %d ", max_code));

  for (n = 0;  n <= max_code; n++) {
    var len = tree[n * 2 + 1];
    if (len === 0) { continue; }
    /* Now reverse the bits */
    tree[n * 2]/*.Code*/ = bi_reverse(next_code[len]++, len);

    //Tracecv(tree != static_ltree, (stderr,"\nn %3d %c l %2d c %4x (%x) ",
    //     n, (isgraph(n) ? n : ' '), len, tree[n].Code, next_code[len]-1));
  }
}


/* ===========================================================================
 * Initialize the various 'constant' tables.
 */
function tr_static_init() {
  var n;        /* iterates over tree elements */
  var bits;     /* bit counter */
  var length;   /* length value */
  var code;     /* code value */
  var dist;     /* distance index */
  var bl_count = new Array(MAX_BITS$1 + 1);
  /* number of codes at each bit length for an optimal tree */

  // do check in _tr_init()
  //if (static_init_done) return;

  /* For some embedded targets, global variables are not initialized: */
/*#ifdef NO_INIT_GLOBAL_POINTERS
  static_l_desc.static_tree = static_ltree;
  static_l_desc.extra_bits = extra_lbits;
  static_d_desc.static_tree = static_dtree;
  static_d_desc.extra_bits = extra_dbits;
  static_bl_desc.extra_bits = extra_blbits;
#endif*/

  /* Initialize the mapping length (0..255) -> length code (0..28) */
  length = 0;
  for (code = 0; code < LENGTH_CODES$1 - 1; code++) {
    base_length[code] = length;
    for (n = 0; n < (1 << extra_lbits[code]); n++) {
      _length_code[length++] = code;
    }
  }
  //Assert (length == 256, "tr_static_init: length != 256");
  /* Note that the length 255 (match length 258) can be represented
   * in two different ways: code 284 + 5 bits or code 285, so we
   * overwrite length_code[255] to use the best encoding:
   */
  _length_code[length - 1] = code;

  /* Initialize the mapping dist (0..32K) -> dist code (0..29) */
  dist = 0;
  for (code = 0; code < 16; code++) {
    base_dist[code] = dist;
    for (n = 0; n < (1 << extra_dbits[code]); n++) {
      _dist_code[dist++] = code;
    }
  }
  //Assert (dist == 256, "tr_static_init: dist != 256");
  dist >>= 7; /* from now on, all distances are divided by 128 */
  for (; code < D_CODES$1; code++) {
    base_dist[code] = dist << 7;
    for (n = 0; n < (1 << (extra_dbits[code] - 7)); n++) {
      _dist_code[256 + dist++] = code;
    }
  }
  //Assert (dist == 256, "tr_static_init: 256+dist != 512");

  /* Construct the codes of the static literal tree */
  for (bits = 0; bits <= MAX_BITS$1; bits++) {
    bl_count[bits] = 0;
  }

  n = 0;
  while (n <= 143) {
    static_ltree[n * 2 + 1]/*.Len*/ = 8;
    n++;
    bl_count[8]++;
  }
  while (n <= 255) {
    static_ltree[n * 2 + 1]/*.Len*/ = 9;
    n++;
    bl_count[9]++;
  }
  while (n <= 279) {
    static_ltree[n * 2 + 1]/*.Len*/ = 7;
    n++;
    bl_count[7]++;
  }
  while (n <= 287) {
    static_ltree[n * 2 + 1]/*.Len*/ = 8;
    n++;
    bl_count[8]++;
  }
  /* Codes 286 and 287 do not exist, but we must include them in the
   * tree construction to get a canonical Huffman tree (longest code
   * all ones)
   */
  gen_codes(static_ltree, L_CODES$1 + 1, bl_count);

  /* The static distance tree is trivial: */
  for (n = 0; n < D_CODES$1; n++) {
    static_dtree[n * 2 + 1]/*.Len*/ = 5;
    static_dtree[n * 2]/*.Code*/ = bi_reverse(n, 5);
  }

  // Now data ready and we can init static trees
  static_l_desc = new StaticTreeDesc(static_ltree, extra_lbits, LITERALS$1 + 1, L_CODES$1, MAX_BITS$1);
  static_d_desc = new StaticTreeDesc(static_dtree, extra_dbits, 0,          D_CODES$1, MAX_BITS$1);
  static_bl_desc = new StaticTreeDesc(new Array(0), extra_blbits, 0,         BL_CODES$1, MAX_BL_BITS);

  //static_init_done = true;
}


/* ===========================================================================
 * Initialize a new block.
 */
function init_block(s) {
  var n; /* iterates over tree elements */

  /* Initialize the trees. */
  for (n = 0; n < L_CODES$1;  n++) { s.dyn_ltree[n * 2]/*.Freq*/ = 0; }
  for (n = 0; n < D_CODES$1;  n++) { s.dyn_dtree[n * 2]/*.Freq*/ = 0; }
  for (n = 0; n < BL_CODES$1; n++) { s.bl_tree[n * 2]/*.Freq*/ = 0; }

  s.dyn_ltree[END_BLOCK * 2]/*.Freq*/ = 1;
  s.opt_len = s.static_len = 0;
  s.last_lit = s.matches = 0;
}


/* ===========================================================================
 * Flush the bit buffer and align the output on a byte boundary
 */
function bi_windup(s)
{
  if (s.bi_valid > 8) {
    put_short(s, s.bi_buf);
  } else if (s.bi_valid > 0) {
    //put_byte(s, (Byte)s->bi_buf);
    s.pending_buf[s.pending++] = s.bi_buf;
  }
  s.bi_buf = 0;
  s.bi_valid = 0;
}

/* ===========================================================================
 * Copy a stored block, storing first the length and its
 * one's complement if requested.
 */
function copy_block(s, buf, len, header)
//DeflateState *s;
//charf    *buf;    /* the input data */
//unsigned len;     /* its length */
//int      header;  /* true if block header must be written */
{
  bi_windup(s);        /* align on byte boundary */

  if (header) {
    put_short(s, len);
    put_short(s, ~len);
  }
//  while (len--) {
//    put_byte(s, *buf++);
//  }
  common.arraySet(s.pending_buf, s.window, buf, len, s.pending);
  s.pending += len;
}

/* ===========================================================================
 * Compares to subtrees, using the tree depth as tie breaker when
 * the subtrees have equal frequency. This minimizes the worst case length.
 */
function smaller(tree, n, m, depth) {
  var _n2 = n * 2;
  var _m2 = m * 2;
  return (tree[_n2]/*.Freq*/ < tree[_m2]/*.Freq*/ ||
         (tree[_n2]/*.Freq*/ === tree[_m2]/*.Freq*/ && depth[n] <= depth[m]));
}

/* ===========================================================================
 * Restore the heap property by moving down the tree starting at node k,
 * exchanging a node with the smallest of its two sons if necessary, stopping
 * when the heap property is re-established (each father smaller than its
 * two sons).
 */
function pqdownheap(s, tree, k)
//    deflate_state *s;
//    ct_data *tree;  /* the tree to restore */
//    int k;               /* node to move down */
{
  var v = s.heap[k];
  var j = k << 1;  /* left son of k */
  while (j <= s.heap_len) {
    /* Set j to the smallest of the two sons: */
    if (j < s.heap_len &&
      smaller(tree, s.heap[j + 1], s.heap[j], s.depth)) {
      j++;
    }
    /* Exit if v is smaller than both sons */
    if (smaller(tree, v, s.heap[j], s.depth)) { break; }

    /* Exchange v with the smallest son */
    s.heap[k] = s.heap[j];
    k = j;

    /* And continue down the tree, setting j to the left son of k */
    j <<= 1;
  }
  s.heap[k] = v;
}


// inlined manually
// var SMALLEST = 1;

/* ===========================================================================
 * Send the block data compressed using the given Huffman trees
 */
function compress_block(s, ltree, dtree)
//    deflate_state *s;
//    const ct_data *ltree; /* literal tree */
//    const ct_data *dtree; /* distance tree */
{
  var dist;           /* distance of matched string */
  var lc;             /* match length or unmatched char (if dist == 0) */
  var lx = 0;         /* running index in l_buf */
  var code;           /* the code to send */
  var extra;          /* number of extra bits to send */

  if (s.last_lit !== 0) {
    do {
      dist = (s.pending_buf[s.d_buf + lx * 2] << 8) | (s.pending_buf[s.d_buf + lx * 2 + 1]);
      lc = s.pending_buf[s.l_buf + lx];
      lx++;

      if (dist === 0) {
        send_code(s, lc, ltree); /* send a literal byte */
        //Tracecv(isgraph(lc), (stderr," '%c' ", lc));
      } else {
        /* Here, lc is the match length - MIN_MATCH */
        code = _length_code[lc];
        send_code(s, code + LITERALS$1 + 1, ltree); /* send the length code */
        extra = extra_lbits[code];
        if (extra !== 0) {
          lc -= base_length[code];
          send_bits(s, lc, extra);       /* send the extra length bits */
        }
        dist--; /* dist is now the match distance - 1 */
        code = d_code(dist);
        //Assert (code < D_CODES, "bad d_code");

        send_code(s, code, dtree);       /* send the distance code */
        extra = extra_dbits[code];
        if (extra !== 0) {
          dist -= base_dist[code];
          send_bits(s, dist, extra);   /* send the extra distance bits */
        }
      } /* literal or match pair ? */

      /* Check that the overlay between pending_buf and d_buf+l_buf is ok: */
      //Assert((uInt)(s->pending) < s->lit_bufsize + 2*lx,
      //       "pendingBuf overflow");

    } while (lx < s.last_lit);
  }

  send_code(s, END_BLOCK, ltree);
}


/* ===========================================================================
 * Construct one Huffman tree and assigns the code bit strings and lengths.
 * Update the total bit length for the current block.
 * IN assertion: the field freq is set for all tree elements.
 * OUT assertions: the fields len and code are set to the optimal bit length
 *     and corresponding code. The length opt_len is updated; static_len is
 *     also updated if stree is not null. The field max_code is set.
 */
function build_tree(s, desc)
//    deflate_state *s;
//    tree_desc *desc; /* the tree descriptor */
{
  var tree     = desc.dyn_tree;
  var stree    = desc.stat_desc.static_tree;
  var has_stree = desc.stat_desc.has_stree;
  var elems    = desc.stat_desc.elems;
  var n, m;          /* iterate over heap elements */
  var max_code = -1; /* largest code with non zero frequency */
  var node;          /* new node being created */

  /* Construct the initial heap, with least frequent element in
   * heap[SMALLEST]. The sons of heap[n] are heap[2*n] and heap[2*n+1].
   * heap[0] is not used.
   */
  s.heap_len = 0;
  s.heap_max = HEAP_SIZE$1;

  for (n = 0; n < elems; n++) {
    if (tree[n * 2]/*.Freq*/ !== 0) {
      s.heap[++s.heap_len] = max_code = n;
      s.depth[n] = 0;

    } else {
      tree[n * 2 + 1]/*.Len*/ = 0;
    }
  }

  /* The pkzip format requires that at least one distance code exists,
   * and that at least one bit should be sent even if there is only one
   * possible code. So to avoid special checks later on we force at least
   * two codes of non zero frequency.
   */
  while (s.heap_len < 2) {
    node = s.heap[++s.heap_len] = (max_code < 2 ? ++max_code : 0);
    tree[node * 2]/*.Freq*/ = 1;
    s.depth[node] = 0;
    s.opt_len--;

    if (has_stree) {
      s.static_len -= stree[node * 2 + 1]/*.Len*/;
    }
    /* node is 0 or 1 so it does not have extra bits */
  }
  desc.max_code = max_code;

  /* The elements heap[heap_len/2+1 .. heap_len] are leaves of the tree,
   * establish sub-heaps of increasing lengths:
   */
  for (n = (s.heap_len >> 1/*int /2*/); n >= 1; n--) { pqdownheap(s, tree, n); }

  /* Construct the Huffman tree by repeatedly combining the least two
   * frequent nodes.
   */
  node = elems;              /* next internal node of the tree */
  do {
    //pqremove(s, tree, n);  /* n = node of least frequency */
    /*** pqremove ***/
    n = s.heap[1/*SMALLEST*/];
    s.heap[1/*SMALLEST*/] = s.heap[s.heap_len--];
    pqdownheap(s, tree, 1/*SMALLEST*/);
    /***/

    m = s.heap[1/*SMALLEST*/]; /* m = node of next least frequency */

    s.heap[--s.heap_max] = n; /* keep the nodes sorted by frequency */
    s.heap[--s.heap_max] = m;

    /* Create a new node father of n and m */
    tree[node * 2]/*.Freq*/ = tree[n * 2]/*.Freq*/ + tree[m * 2]/*.Freq*/;
    s.depth[node] = (s.depth[n] >= s.depth[m] ? s.depth[n] : s.depth[m]) + 1;
    tree[n * 2 + 1]/*.Dad*/ = tree[m * 2 + 1]/*.Dad*/ = node;

    /* and insert the new node in the heap */
    s.heap[1/*SMALLEST*/] = node++;
    pqdownheap(s, tree, 1/*SMALLEST*/);

  } while (s.heap_len >= 2);

  s.heap[--s.heap_max] = s.heap[1/*SMALLEST*/];

  /* At this point, the fields freq and dad are set. We can now
   * generate the bit lengths.
   */
  gen_bitlen(s, desc);

  /* The field len is now set, we can generate the bit codes */
  gen_codes(tree, max_code, s.bl_count);
}


/* ===========================================================================
 * Scan a literal or distance tree to determine the frequencies of the codes
 * in the bit length tree.
 */
function scan_tree(s, tree, max_code)
//    deflate_state *s;
//    ct_data *tree;   /* the tree to be scanned */
//    int max_code;    /* and its largest code of non zero frequency */
{
  var n;                     /* iterates over all tree elements */
  var prevlen = -1;          /* last emitted length */
  var curlen;                /* length of current code */

  var nextlen = tree[0 * 2 + 1]; /* length of next code */

  var count = 0;             /* repeat count of the current code */
  var max_count = 7;         /* max repeat count */
  var min_count = 4;         /* min repeat count */

  if (nextlen === 0) {
    max_count = 138;
    min_count = 3;
  }
  tree[(max_code + 1) * 2 + 1]/*.Len*/ = 0xffff; /* guard */

  for (n = 0; n <= max_code; n++) {
    curlen = nextlen;
    nextlen = tree[(n + 1) * 2 + 1]/*.Len*/;

    if (++count < max_count && curlen === nextlen) {
      continue;

    } else if (count < min_count) {
      s.bl_tree[curlen * 2]/*.Freq*/ += count;

    } else if (curlen !== 0) {

      if (curlen !== prevlen) { s.bl_tree[curlen * 2]/*.Freq*/++; }
      s.bl_tree[REP_3_6 * 2]/*.Freq*/++;

    } else if (count <= 10) {
      s.bl_tree[REPZ_3_10 * 2]/*.Freq*/++;

    } else {
      s.bl_tree[REPZ_11_138 * 2]/*.Freq*/++;
    }

    count = 0;
    prevlen = curlen;

    if (nextlen === 0) {
      max_count = 138;
      min_count = 3;

    } else if (curlen === nextlen) {
      max_count = 6;
      min_count = 3;

    } else {
      max_count = 7;
      min_count = 4;
    }
  }
}


/* ===========================================================================
 * Send a literal or distance tree in compressed form, using the codes in
 * bl_tree.
 */
function send_tree(s, tree, max_code)
//    deflate_state *s;
//    ct_data *tree; /* the tree to be scanned */
//    int max_code;       /* and its largest code of non zero frequency */
{
  var n;                     /* iterates over all tree elements */
  var prevlen = -1;          /* last emitted length */
  var curlen;                /* length of current code */

  var nextlen = tree[0 * 2 + 1]; /* length of next code */

  var count = 0;             /* repeat count of the current code */
  var max_count = 7;         /* max repeat count */
  var min_count = 4;         /* min repeat count */

  /* tree[max_code+1].Len = -1; */  /* guard already set */
  if (nextlen === 0) {
    max_count = 138;
    min_count = 3;
  }

  for (n = 0; n <= max_code; n++) {
    curlen = nextlen;
    nextlen = tree[(n + 1) * 2 + 1]/*.Len*/;

    if (++count < max_count && curlen === nextlen) {
      continue;

    } else if (count < min_count) {
      do { send_code(s, curlen, s.bl_tree); } while (--count !== 0);

    } else if (curlen !== 0) {
      if (curlen !== prevlen) {
        send_code(s, curlen, s.bl_tree);
        count--;
      }
      //Assert(count >= 3 && count <= 6, " 3_6?");
      send_code(s, REP_3_6, s.bl_tree);
      send_bits(s, count - 3, 2);

    } else if (count <= 10) {
      send_code(s, REPZ_3_10, s.bl_tree);
      send_bits(s, count - 3, 3);

    } else {
      send_code(s, REPZ_11_138, s.bl_tree);
      send_bits(s, count - 11, 7);
    }

    count = 0;
    prevlen = curlen;
    if (nextlen === 0) {
      max_count = 138;
      min_count = 3;

    } else if (curlen === nextlen) {
      max_count = 6;
      min_count = 3;

    } else {
      max_count = 7;
      min_count = 4;
    }
  }
}


/* ===========================================================================
 * Construct the Huffman tree for the bit lengths and return the index in
 * bl_order of the last bit length code to send.
 */
function build_bl_tree(s) {
  var max_blindex;  /* index of last bit length code of non zero freq */

  /* Determine the bit length frequencies for literal and distance trees */
  scan_tree(s, s.dyn_ltree, s.l_desc.max_code);
  scan_tree(s, s.dyn_dtree, s.d_desc.max_code);

  /* Build the bit length tree: */
  build_tree(s, s.bl_desc);
  /* opt_len now includes the length of the tree representations, except
   * the lengths of the bit lengths codes and the 5+5+4 bits for the counts.
   */

  /* Determine the number of bit length codes to send. The pkzip format
   * requires that at least 4 bit length codes be sent. (appnote.txt says
   * 3 but the actual value used is 4.)
   */
  for (max_blindex = BL_CODES$1 - 1; max_blindex >= 3; max_blindex--) {
    if (s.bl_tree[bl_order[max_blindex] * 2 + 1]/*.Len*/ !== 0) {
      break;
    }
  }
  /* Update opt_len to include the bit length tree and counts */
  s.opt_len += 3 * (max_blindex + 1) + 5 + 5 + 4;
  //Tracev((stderr, "\ndyn trees: dyn %ld, stat %ld",
  //        s->opt_len, s->static_len));

  return max_blindex;
}


/* ===========================================================================
 * Send the header for a block using dynamic Huffman trees: the counts, the
 * lengths of the bit length codes, the literal tree and the distance tree.
 * IN assertion: lcodes >= 257, dcodes >= 1, blcodes >= 4.
 */
function send_all_trees(s, lcodes, dcodes, blcodes)
//    deflate_state *s;
//    int lcodes, dcodes, blcodes; /* number of codes for each tree */
{
  var rank;                    /* index in bl_order */

  //Assert (lcodes >= 257 && dcodes >= 1 && blcodes >= 4, "not enough codes");
  //Assert (lcodes <= L_CODES && dcodes <= D_CODES && blcodes <= BL_CODES,
  //        "too many codes");
  //Tracev((stderr, "\nbl counts: "));
  send_bits(s, lcodes - 257, 5); /* not +255 as stated in appnote.txt */
  send_bits(s, dcodes - 1,   5);
  send_bits(s, blcodes - 4,  4); /* not -3 as stated in appnote.txt */
  for (rank = 0; rank < blcodes; rank++) {
    //Tracev((stderr, "\nbl code %2d ", bl_order[rank]));
    send_bits(s, s.bl_tree[bl_order[rank] * 2 + 1]/*.Len*/, 3);
  }
  //Tracev((stderr, "\nbl tree: sent %ld", s->bits_sent));

  send_tree(s, s.dyn_ltree, lcodes - 1); /* literal tree */
  //Tracev((stderr, "\nlit tree: sent %ld", s->bits_sent));

  send_tree(s, s.dyn_dtree, dcodes - 1); /* distance tree */
  //Tracev((stderr, "\ndist tree: sent %ld", s->bits_sent));
}


/* ===========================================================================
 * Check if the data type is TEXT or BINARY, using the following algorithm:
 * - TEXT if the two conditions below are satisfied:
 *    a) There are no non-portable control characters belonging to the
 *       "black list" (0..6, 14..25, 28..31).
 *    b) There is at least one printable character belonging to the
 *       "white list" (9 {TAB}, 10 {LF}, 13 {CR}, 32..255).
 * - BINARY otherwise.
 * - The following partially-portable control characters form a
 *   "gray list" that is ignored in this detection algorithm:
 *   (7 {BEL}, 8 {BS}, 11 {VT}, 12 {FF}, 26 {SUB}, 27 {ESC}).
 * IN assertion: the fields Freq of dyn_ltree are set.
 */
function detect_data_type(s) {
  /* black_mask is the bit mask of black-listed bytes
   * set bits 0..6, 14..25, and 28..31
   * 0xf3ffc07f = binary 11110011111111111100000001111111
   */
  var black_mask = 0xf3ffc07f;
  var n;

  /* Check for non-textual ("black-listed") bytes. */
  for (n = 0; n <= 31; n++, black_mask >>>= 1) {
    if ((black_mask & 1) && (s.dyn_ltree[n * 2]/*.Freq*/ !== 0)) {
      return Z_BINARY;
    }
  }

  /* Check for textual ("white-listed") bytes. */
  if (s.dyn_ltree[9 * 2]/*.Freq*/ !== 0 || s.dyn_ltree[10 * 2]/*.Freq*/ !== 0 ||
      s.dyn_ltree[13 * 2]/*.Freq*/ !== 0) {
    return Z_TEXT;
  }
  for (n = 32; n < LITERALS$1; n++) {
    if (s.dyn_ltree[n * 2]/*.Freq*/ !== 0) {
      return Z_TEXT;
    }
  }

  /* There are no "black-listed" or "white-listed" bytes:
   * this stream either is empty or has tolerated ("gray-listed") bytes only.
   */
  return Z_BINARY;
}


var static_init_done = false;

/* ===========================================================================
 * Initialize the tree data structures for a new zlib stream.
 */
function _tr_init(s)
{

  if (!static_init_done) {
    tr_static_init();
    static_init_done = true;
  }

  s.l_desc  = new TreeDesc(s.dyn_ltree, static_l_desc);
  s.d_desc  = new TreeDesc(s.dyn_dtree, static_d_desc);
  s.bl_desc = new TreeDesc(s.bl_tree, static_bl_desc);

  s.bi_buf = 0;
  s.bi_valid = 0;

  /* Initialize the first block of the first file: */
  init_block(s);
}


/* ===========================================================================
 * Send a stored block
 */
function _tr_stored_block(s, buf, stored_len, last)
//DeflateState *s;
//charf *buf;       /* input block */
//ulg stored_len;   /* length of input block */
//int last;         /* one if this is the last block for a file */
{
  send_bits(s, (STORED_BLOCK << 1) + (last ? 1 : 0), 3);    /* send block type */
  copy_block(s, buf, stored_len, true); /* with header */
}


/* ===========================================================================
 * Send one empty static block to give enough lookahead for inflate.
 * This takes 10 bits, of which 7 may remain in the bit buffer.
 */
function _tr_align(s) {
  send_bits(s, STATIC_TREES << 1, 3);
  send_code(s, END_BLOCK, static_ltree);
  bi_flush(s);
}


/* ===========================================================================
 * Determine the best encoding for the current block: dynamic trees, static
 * trees or store, and output the encoded block to the zip file.
 */
function _tr_flush_block(s, buf, stored_len, last)
//DeflateState *s;
//charf *buf;       /* input block, or NULL if too old */
//ulg stored_len;   /* length of input block */
//int last;         /* one if this is the last block for a file */
{
  var opt_lenb, static_lenb;  /* opt_len and static_len in bytes */
  var max_blindex = 0;        /* index of last bit length code of non zero freq */

  /* Build the Huffman trees unless a stored block is forced */
  if (s.level > 0) {

    /* Check if the file is binary or text */
    if (s.strm.data_type === Z_UNKNOWN$1) {
      s.strm.data_type = detect_data_type(s);
    }

    /* Construct the literal and distance trees */
    build_tree(s, s.l_desc);
    // Tracev((stderr, "\nlit data: dyn %ld, stat %ld", s->opt_len,
    //        s->static_len));

    build_tree(s, s.d_desc);
    // Tracev((stderr, "\ndist data: dyn %ld, stat %ld", s->opt_len,
    //        s->static_len));
    /* At this point, opt_len and static_len are the total bit lengths of
     * the compressed block data, excluding the tree representations.
     */

    /* Build the bit length tree for the above two trees, and get the index
     * in bl_order of the last bit length code to send.
     */
    max_blindex = build_bl_tree(s);

    /* Determine the best encoding. Compute the block lengths in bytes. */
    opt_lenb = (s.opt_len + 3 + 7) >>> 3;
    static_lenb = (s.static_len + 3 + 7) >>> 3;

    // Tracev((stderr, "\nopt %lu(%lu) stat %lu(%lu) stored %lu lit %u ",
    //        opt_lenb, s->opt_len, static_lenb, s->static_len, stored_len,
    //        s->last_lit));

    if (static_lenb <= opt_lenb) { opt_lenb = static_lenb; }

  } else {
    // Assert(buf != (char*)0, "lost buf");
    opt_lenb = static_lenb = stored_len + 5; /* force a stored block */
  }

  if ((stored_len + 4 <= opt_lenb) && (buf !== -1)) {
    /* 4: two words for the lengths */

    /* The test buf != NULL is only necessary if LIT_BUFSIZE > WSIZE.
     * Otherwise we can't have processed more than WSIZE input bytes since
     * the last block flush, because compression would have been
     * successful. If LIT_BUFSIZE <= WSIZE, it is never too late to
     * transform a block into a stored block.
     */
    _tr_stored_block(s, buf, stored_len, last);

  } else if (s.strategy === Z_FIXED$1 || static_lenb === opt_lenb) {

    send_bits(s, (STATIC_TREES << 1) + (last ? 1 : 0), 3);
    compress_block(s, static_ltree, static_dtree);

  } else {
    send_bits(s, (DYN_TREES << 1) + (last ? 1 : 0), 3);
    send_all_trees(s, s.l_desc.max_code + 1, s.d_desc.max_code + 1, max_blindex + 1);
    compress_block(s, s.dyn_ltree, s.dyn_dtree);
  }
  // Assert (s->compressed_len == s->bits_sent, "bad compressed size");
  /* The above check is made mod 2^32, for files larger than 512 MB
   * and uLong implemented on 32 bits.
   */
  init_block(s);

  if (last) {
    bi_windup(s);
  }
  // Tracev((stderr,"\ncomprlen %lu(%lu) ", s->compressed_len>>3,
  //       s->compressed_len-7*last));
}

/* ===========================================================================
 * Save the match info and tally the frequency counts. Return true if
 * the current block must be flushed.
 */
function _tr_tally(s, dist, lc)
//    deflate_state *s;
//    unsigned dist;  /* distance of matched string */
//    unsigned lc;    /* match length-MIN_MATCH or unmatched char (if dist==0) */
{
  //var out_length, in_length, dcode;

  s.pending_buf[s.d_buf + s.last_lit * 2]     = (dist >>> 8) & 0xff;
  s.pending_buf[s.d_buf + s.last_lit * 2 + 1] = dist & 0xff;

  s.pending_buf[s.l_buf + s.last_lit] = lc & 0xff;
  s.last_lit++;

  if (dist === 0) {
    /* lc is the unmatched char */
    s.dyn_ltree[lc * 2]/*.Freq*/++;
  } else {
    s.matches++;
    /* Here, lc is the match length - MIN_MATCH */
    dist--;             /* dist = match distance - 1 */
    //Assert((ush)dist < (ush)MAX_DIST(s) &&
    //       (ush)lc <= (ush)(MAX_MATCH-MIN_MATCH) &&
    //       (ush)d_code(dist) < (ush)D_CODES,  "_tr_tally: bad match");

    s.dyn_ltree[(_length_code[lc] + LITERALS$1 + 1) * 2]/*.Freq*/++;
    s.dyn_dtree[d_code(dist) * 2]/*.Freq*/++;
  }

// (!) This block is disabled in zlib defailts,
// don't enable it for binary compatibility

//#ifdef TRUNCATE_BLOCK
//  /* Try to guess if it is profitable to stop the current block here */
//  if ((s.last_lit & 0x1fff) === 0 && s.level > 2) {
//    /* Compute an upper bound for the compressed length */
//    out_length = s.last_lit*8;
//    in_length = s.strstart - s.block_start;
//
//    for (dcode = 0; dcode < D_CODES; dcode++) {
//      out_length += s.dyn_dtree[dcode*2]/*.Freq*/ * (5 + extra_dbits[dcode]);
//    }
//    out_length >>>= 3;
//    //Tracev((stderr,"\nlast_lit %u, in %ld, out ~%ld(%ld%%) ",
//    //       s->last_lit, in_length, out_length,
//    //       100L - out_length*100L/in_length));
//    if (s.matches < (s.last_lit>>1)/*int /2*/ && out_length < (in_length>>1)/*int /2*/) {
//      return true;
//    }
//  }
//#endif

  return (s.last_lit === s.lit_bufsize - 1);
  /* We avoid equality with lit_bufsize because of wraparound at 64K
   * on 16 bit machines and because stored blocks are restricted to
   * 64K-1 bytes.
   */
}

var _tr_init_1  = _tr_init;
var _tr_stored_block_1 = _tr_stored_block;
var _tr_flush_block_1  = _tr_flush_block;
var _tr_tally_1 = _tr_tally;
var _tr_align_1 = _tr_align;

var trees = {
	_tr_init: _tr_init_1,
	_tr_stored_block: _tr_stored_block_1,
	_tr_flush_block: _tr_flush_block_1,
	_tr_tally: _tr_tally_1,
	_tr_align: _tr_align_1
};

// Note: adler32 takes 12% for level 0 and 2% for level 6.
// It doesn't worth to make additional optimizationa as in original.
// Small size is preferable.

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

function adler32(adler, buf, len, pos) {
  var s1 = (adler & 0xffff) |0,
      s2 = ((adler >>> 16) & 0xffff) |0,
      n = 0;

  while (len !== 0) {
    // Set limit ~ twice less than 5552, to keep
    // s2 in 31-bits, because we force signed ints.
    // in other case %= will fail.
    n = len > 2000 ? 2000 : len;
    len -= n;

    do {
      s1 = (s1 + buf[pos++]) |0;
      s2 = (s2 + s1) |0;
    } while (--n);

    s1 %= 65521;
    s2 %= 65521;
  }

  return (s1 | (s2 << 16)) |0;
}


var adler32_1 = adler32;

// Note: we can't get significant speed boost here.
// So write code to minimize size - no pregenerated tables
// and array tools dependencies.

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

// Use ordinary array, since untyped makes no boost here
function makeTable() {
  var c, table = [];

  for (var n = 0; n < 256; n++) {
    c = n;
    for (var k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[n] = c;
  }

  return table;
}

// Create table on load. Just 255 signed longs. Not a problem.
var crcTable = makeTable();


function crc32(crc, buf, len, pos) {
  var t = crcTable,
      end = pos + len;

  crc ^= -1;

  for (var i = pos; i < end; i++) {
    crc = (crc >>> 8) ^ t[(crc ^ buf[i]) & 0xFF];
  }

  return (crc ^ (-1)); // >>> 0;
}


var crc32_1 = crc32;

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

var messages = {
  2:      'need dictionary',     /* Z_NEED_DICT       2  */
  1:      'stream end',          /* Z_STREAM_END      1  */
  0:      '',                    /* Z_OK              0  */
  '-1':   'file error',          /* Z_ERRNO         (-1) */
  '-2':   'stream error',        /* Z_STREAM_ERROR  (-2) */
  '-3':   'data error',          /* Z_DATA_ERROR    (-3) */
  '-4':   'insufficient memory', /* Z_MEM_ERROR     (-4) */
  '-5':   'buffer error',        /* Z_BUF_ERROR     (-5) */
  '-6':   'incompatible version' /* Z_VERSION_ERROR (-6) */
};

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.







/* Public constants ==========================================================*/
/* ===========================================================================*/


/* Allowed flush values; see deflate() and inflate() below for details */
var Z_NO_FLUSH$1      = 0;
var Z_PARTIAL_FLUSH = 1;
//var Z_SYNC_FLUSH    = 2;
var Z_FULL_FLUSH    = 3;
var Z_FINISH$1        = 4;
var Z_BLOCK         = 5;
//var Z_TREES         = 6;


/* Return codes for the compression/decompression functions. Negative values
 * are errors, positive values are used for special but normal events.
 */
var Z_OK$1            = 0;
var Z_STREAM_END$1    = 1;
//var Z_NEED_DICT     = 2;
//var Z_ERRNO         = -1;
var Z_STREAM_ERROR  = -2;
var Z_DATA_ERROR    = -3;
//var Z_MEM_ERROR     = -4;
var Z_BUF_ERROR     = -5;
//var Z_VERSION_ERROR = -6;


/* compression levels */
//var Z_NO_COMPRESSION      = 0;
//var Z_BEST_SPEED          = 1;
//var Z_BEST_COMPRESSION    = 9;
var Z_DEFAULT_COMPRESSION$1 = -1;


var Z_FILTERED            = 1;
var Z_HUFFMAN_ONLY        = 2;
var Z_RLE                 = 3;
var Z_FIXED               = 4;
var Z_DEFAULT_STRATEGY$1    = 0;

/* Possible values of the data_type field (though see inflate()) */
//var Z_BINARY              = 0;
//var Z_TEXT                = 1;
//var Z_ASCII               = 1; // = Z_TEXT
var Z_UNKNOWN             = 2;


/* The deflate compression method */
var Z_DEFLATED$1  = 8;

/*============================================================================*/


var MAX_MEM_LEVEL = 9;
/* Maximum value for memLevel in deflateInit2 */
var MAX_WBITS = 15;
/* 32K LZ77 window */
var DEF_MEM_LEVEL = 8;


var LENGTH_CODES  = 29;
/* number of length codes, not counting the special END_BLOCK code */
var LITERALS      = 256;
/* number of literal bytes 0..255 */
var L_CODES       = LITERALS + 1 + LENGTH_CODES;
/* number of Literal or Length codes, including the END_BLOCK code */
var D_CODES       = 30;
/* number of distance codes */
var BL_CODES      = 19;
/* number of codes used to transfer the bit lengths */
var HEAP_SIZE     = 2 * L_CODES + 1;
/* maximum heap size */
var MAX_BITS  = 15;
/* All codes must not exceed MAX_BITS bits */

var MIN_MATCH = 3;
var MAX_MATCH = 258;
var MIN_LOOKAHEAD = (MAX_MATCH + MIN_MATCH + 1);

var PRESET_DICT = 0x20;

var INIT_STATE = 42;
var EXTRA_STATE = 69;
var NAME_STATE = 73;
var COMMENT_STATE = 91;
var HCRC_STATE = 103;
var BUSY_STATE = 113;
var FINISH_STATE = 666;

var BS_NEED_MORE      = 1; /* block not completed, need more input or more output */
var BS_BLOCK_DONE     = 2; /* block flush performed */
var BS_FINISH_STARTED = 3; /* finish started, need only more output at next deflate */
var BS_FINISH_DONE    = 4; /* finish done, accept no more input or output */

var OS_CODE = 0x03; // Unix :) . Don't detect, use this default.

function err$1(strm, errorCode) {
  strm.msg = messages[errorCode];
  return errorCode;
}

function rank(f) {
  return ((f) << 1) - ((f) > 4 ? 9 : 0);
}

function zero(buf) { var len = buf.length; while (--len >= 0) { buf[len] = 0; } }


/* =========================================================================
 * Flush as much pending output as possible. All deflate() output goes
 * through this function so some applications may wish to modify it
 * to avoid allocating a large strm->output buffer and copying into it.
 * (See also read_buf()).
 */
function flush_pending(strm) {
  var s = strm.state;

  //_tr_flush_bits(s);
  var len = s.pending;
  if (len > strm.avail_out) {
    len = strm.avail_out;
  }
  if (len === 0) { return; }

  common.arraySet(strm.output, s.pending_buf, s.pending_out, len, strm.next_out);
  strm.next_out += len;
  s.pending_out += len;
  strm.total_out += len;
  strm.avail_out -= len;
  s.pending -= len;
  if (s.pending === 0) {
    s.pending_out = 0;
  }
}


function flush_block_only(s, last) {
  trees._tr_flush_block(s, (s.block_start >= 0 ? s.block_start : -1), s.strstart - s.block_start, last);
  s.block_start = s.strstart;
  flush_pending(s.strm);
}


function put_byte(s, b) {
  s.pending_buf[s.pending++] = b;
}


/* =========================================================================
 * Put a short in the pending buffer. The 16-bit value is put in MSB order.
 * IN assertion: the stream state is correct and there is enough room in
 * pending_buf.
 */
function putShortMSB(s, b) {
//  put_byte(s, (Byte)(b >> 8));
//  put_byte(s, (Byte)(b & 0xff));
  s.pending_buf[s.pending++] = (b >>> 8) & 0xff;
  s.pending_buf[s.pending++] = b & 0xff;
}


/* ===========================================================================
 * Read a new buffer from the current input stream, update the adler32
 * and total number of bytes read.  All deflate() input goes through
 * this function so some applications may wish to modify it to avoid
 * allocating a large strm->input buffer and copying from it.
 * (See also flush_pending()).
 */
function read_buf(strm, buf, start, size) {
  var len = strm.avail_in;

  if (len > size) { len = size; }
  if (len === 0) { return 0; }

  strm.avail_in -= len;

  // zmemcpy(buf, strm->next_in, len);
  common.arraySet(buf, strm.input, strm.next_in, len, start);
  if (strm.state.wrap === 1) {
    strm.adler = adler32_1(strm.adler, buf, len, start);
  }

  else if (strm.state.wrap === 2) {
    strm.adler = crc32_1(strm.adler, buf, len, start);
  }

  strm.next_in += len;
  strm.total_in += len;

  return len;
}


/* ===========================================================================
 * Set match_start to the longest match starting at the given string and
 * return its length. Matches shorter or equal to prev_length are discarded,
 * in which case the result is equal to prev_length and match_start is
 * garbage.
 * IN assertions: cur_match is the head of the hash chain for the current
 *   string (strstart) and its distance is <= MAX_DIST, and prev_length >= 1
 * OUT assertion: the match length is not greater than s->lookahead.
 */
function longest_match(s, cur_match) {
  var chain_length = s.max_chain_length;      /* max hash chain length */
  var scan = s.strstart; /* current string */
  var match;                       /* matched string */
  var len;                           /* length of current match */
  var best_len = s.prev_length;              /* best match length so far */
  var nice_match = s.nice_match;             /* stop if match long enough */
  var limit = (s.strstart > (s.w_size - MIN_LOOKAHEAD)) ?
      s.strstart - (s.w_size - MIN_LOOKAHEAD) : 0;

  var _win = s.window; // shortcut

  var wmask = s.w_mask;
  var prev  = s.prev;

  /* Stop when cur_match becomes <= limit. To simplify the code,
   * we prevent matches with the string of window index 0.
   */

  var strend = s.strstart + MAX_MATCH;
  var scan_end1  = _win[scan + best_len - 1];
  var scan_end   = _win[scan + best_len];

  /* The code is optimized for HASH_BITS >= 8 and MAX_MATCH-2 multiple of 16.
   * It is easy to get rid of this optimization if necessary.
   */
  // Assert(s->hash_bits >= 8 && MAX_MATCH == 258, "Code too clever");

  /* Do not waste too much time if we already have a good match: */
  if (s.prev_length >= s.good_match) {
    chain_length >>= 2;
  }
  /* Do not look for matches beyond the end of the input. This is necessary
   * to make deflate deterministic.
   */
  if (nice_match > s.lookahead) { nice_match = s.lookahead; }

  // Assert((ulg)s->strstart <= s->window_size-MIN_LOOKAHEAD, "need lookahead");

  do {
    // Assert(cur_match < s->strstart, "no future");
    match = cur_match;

    /* Skip to next match if the match length cannot increase
     * or if the match length is less than 2.  Note that the checks below
     * for insufficient lookahead only occur occasionally for performance
     * reasons.  Therefore uninitialized memory will be accessed, and
     * conditional jumps will be made that depend on those values.
     * However the length of the match is limited to the lookahead, so
     * the output of deflate is not affected by the uninitialized values.
     */

    if (_win[match + best_len]     !== scan_end  ||
        _win[match + best_len - 1] !== scan_end1 ||
        _win[match]                !== _win[scan] ||
        _win[++match]              !== _win[scan + 1]) {
      continue;
    }

    /* The check at best_len-1 can be removed because it will be made
     * again later. (This heuristic is not always a win.)
     * It is not necessary to compare scan[2] and match[2] since they
     * are always equal when the other bytes match, given that
     * the hash keys are equal and that HASH_BITS >= 8.
     */
    scan += 2;
    match++;
    // Assert(*scan == *match, "match[2]?");

    /* We check for insufficient lookahead only every 8th comparison;
     * the 256th check will be made at strstart+258.
     */
    do {
      /*jshint noempty:false*/
    } while (_win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
             _win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
             _win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
             _win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
             scan < strend);

    // Assert(scan <= s->window+(unsigned)(s->window_size-1), "wild scan");

    len = MAX_MATCH - (strend - scan);
    scan = strend - MAX_MATCH;

    if (len > best_len) {
      s.match_start = cur_match;
      best_len = len;
      if (len >= nice_match) {
        break;
      }
      scan_end1  = _win[scan + best_len - 1];
      scan_end   = _win[scan + best_len];
    }
  } while ((cur_match = prev[cur_match & wmask]) > limit && --chain_length !== 0);

  if (best_len <= s.lookahead) {
    return best_len;
  }
  return s.lookahead;
}


/* ===========================================================================
 * Fill the window when the lookahead becomes insufficient.
 * Updates strstart and lookahead.
 *
 * IN assertion: lookahead < MIN_LOOKAHEAD
 * OUT assertions: strstart <= window_size-MIN_LOOKAHEAD
 *    At least one byte has been read, or avail_in == 0; reads are
 *    performed for at least two bytes (required for the zip translate_eol
 *    option -- not supported here).
 */
function fill_window(s) {
  var _w_size = s.w_size;
  var p, n, m, more, str;

  //Assert(s->lookahead < MIN_LOOKAHEAD, "already enough lookahead");

  do {
    more = s.window_size - s.lookahead - s.strstart;

    // JS ints have 32 bit, block below not needed
    /* Deal with !@#$% 64K limit: */
    //if (sizeof(int) <= 2) {
    //    if (more == 0 && s->strstart == 0 && s->lookahead == 0) {
    //        more = wsize;
    //
    //  } else if (more == (unsigned)(-1)) {
    //        /* Very unlikely, but possible on 16 bit machine if
    //         * strstart == 0 && lookahead == 1 (input done a byte at time)
    //         */
    //        more--;
    //    }
    //}


    /* If the window is almost full and there is insufficient lookahead,
     * move the upper half to the lower one to make room in the upper half.
     */
    if (s.strstart >= _w_size + (_w_size - MIN_LOOKAHEAD)) {

      common.arraySet(s.window, s.window, _w_size, _w_size, 0);
      s.match_start -= _w_size;
      s.strstart -= _w_size;
      /* we now have strstart >= MAX_DIST */
      s.block_start -= _w_size;

      /* Slide the hash table (could be avoided with 32 bit values
       at the expense of memory usage). We slide even when level == 0
       to keep the hash table consistent if we switch back to level > 0
       later. (Using level 0 permanently is not an optimal usage of
       zlib, so we don't care about this pathological case.)
       */

      n = s.hash_size;
      p = n;
      do {
        m = s.head[--p];
        s.head[p] = (m >= _w_size ? m - _w_size : 0);
      } while (--n);

      n = _w_size;
      p = n;
      do {
        m = s.prev[--p];
        s.prev[p] = (m >= _w_size ? m - _w_size : 0);
        /* If n is not on any hash chain, prev[n] is garbage but
         * its value will never be used.
         */
      } while (--n);

      more += _w_size;
    }
    if (s.strm.avail_in === 0) {
      break;
    }

    /* If there was no sliding:
     *    strstart <= WSIZE+MAX_DIST-1 && lookahead <= MIN_LOOKAHEAD - 1 &&
     *    more == window_size - lookahead - strstart
     * => more >= window_size - (MIN_LOOKAHEAD-1 + WSIZE + MAX_DIST-1)
     * => more >= window_size - 2*WSIZE + 2
     * In the BIG_MEM or MMAP case (not yet supported),
     *   window_size == input_size + MIN_LOOKAHEAD  &&
     *   strstart + s->lookahead <= input_size => more >= MIN_LOOKAHEAD.
     * Otherwise, window_size == 2*WSIZE so more >= 2.
     * If there was sliding, more >= WSIZE. So in all cases, more >= 2.
     */
    //Assert(more >= 2, "more < 2");
    n = read_buf(s.strm, s.window, s.strstart + s.lookahead, more);
    s.lookahead += n;

    /* Initialize the hash value now that we have some input: */
    if (s.lookahead + s.insert >= MIN_MATCH) {
      str = s.strstart - s.insert;
      s.ins_h = s.window[str];

      /* UPDATE_HASH(s, s->ins_h, s->window[str + 1]); */
      s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[str + 1]) & s.hash_mask;
//#if MIN_MATCH != 3
//        Call update_hash() MIN_MATCH-3 more times
//#endif
      while (s.insert) {
        /* UPDATE_HASH(s, s->ins_h, s->window[str + MIN_MATCH-1]); */
        s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[str + MIN_MATCH - 1]) & s.hash_mask;

        s.prev[str & s.w_mask] = s.head[s.ins_h];
        s.head[s.ins_h] = str;
        str++;
        s.insert--;
        if (s.lookahead + s.insert < MIN_MATCH) {
          break;
        }
      }
    }
    /* If the whole input has less than MIN_MATCH bytes, ins_h is garbage,
     * but this is not important since only literal bytes will be emitted.
     */

  } while (s.lookahead < MIN_LOOKAHEAD && s.strm.avail_in !== 0);

  /* If the WIN_INIT bytes after the end of the current data have never been
   * written, then zero those bytes in order to avoid memory check reports of
   * the use of uninitialized (or uninitialised as Julian writes) bytes by
   * the longest match routines.  Update the high water mark for the next
   * time through here.  WIN_INIT is set to MAX_MATCH since the longest match
   * routines allow scanning to strstart + MAX_MATCH, ignoring lookahead.
   */
//  if (s.high_water < s.window_size) {
//    var curr = s.strstart + s.lookahead;
//    var init = 0;
//
//    if (s.high_water < curr) {
//      /* Previous high water mark below current data -- zero WIN_INIT
//       * bytes or up to end of window, whichever is less.
//       */
//      init = s.window_size - curr;
//      if (init > WIN_INIT)
//        init = WIN_INIT;
//      zmemzero(s->window + curr, (unsigned)init);
//      s->high_water = curr + init;
//    }
//    else if (s->high_water < (ulg)curr + WIN_INIT) {
//      /* High water mark at or above current data, but below current data
//       * plus WIN_INIT -- zero out to current data plus WIN_INIT, or up
//       * to end of window, whichever is less.
//       */
//      init = (ulg)curr + WIN_INIT - s->high_water;
//      if (init > s->window_size - s->high_water)
//        init = s->window_size - s->high_water;
//      zmemzero(s->window + s->high_water, (unsigned)init);
//      s->high_water += init;
//    }
//  }
//
//  Assert((ulg)s->strstart <= s->window_size - MIN_LOOKAHEAD,
//    "not enough room for search");
}

/* ===========================================================================
 * Copy without compression as much as possible from the input stream, return
 * the current block state.
 * This function does not insert new strings in the dictionary since
 * uncompressible data is probably not useful. This function is used
 * only for the level=0 compression option.
 * NOTE: this function should be optimized to avoid extra copying from
 * window to pending_buf.
 */
function deflate_stored(s, flush) {
  /* Stored blocks are limited to 0xffff bytes, pending_buf is limited
   * to pending_buf_size, and each stored block has a 5 byte header:
   */
  var max_block_size = 0xffff;

  if (max_block_size > s.pending_buf_size - 5) {
    max_block_size = s.pending_buf_size - 5;
  }

  /* Copy as much as possible from input to output: */
  for (;;) {
    /* Fill the window as much as possible: */
    if (s.lookahead <= 1) {

      //Assert(s->strstart < s->w_size+MAX_DIST(s) ||
      //  s->block_start >= (long)s->w_size, "slide too late");
//      if (!(s.strstart < s.w_size + (s.w_size - MIN_LOOKAHEAD) ||
//        s.block_start >= s.w_size)) {
//        throw  new Error("slide too late");
//      }

      fill_window(s);
      if (s.lookahead === 0 && flush === Z_NO_FLUSH$1) {
        return BS_NEED_MORE;
      }

      if (s.lookahead === 0) {
        break;
      }
      /* flush the current block */
    }
    //Assert(s->block_start >= 0L, "block gone");
//    if (s.block_start < 0) throw new Error("block gone");

    s.strstart += s.lookahead;
    s.lookahead = 0;

    /* Emit a stored block if pending_buf will be full: */
    var max_start = s.block_start + max_block_size;

    if (s.strstart === 0 || s.strstart >= max_start) {
      /* strstart == 0 is possible when wraparound on 16-bit machine */
      s.lookahead = s.strstart - max_start;
      s.strstart = max_start;
      /*** FLUSH_BLOCK(s, 0); ***/
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
      /***/


    }
    /* Flush if we may have to slide, otherwise block_start may become
     * negative and the data will be gone:
     */
    if (s.strstart - s.block_start >= (s.w_size - MIN_LOOKAHEAD)) {
      /*** FLUSH_BLOCK(s, 0); ***/
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
      /***/
    }
  }

  s.insert = 0;

  if (flush === Z_FINISH$1) {
    /*** FLUSH_BLOCK(s, 1); ***/
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    /***/
    return BS_FINISH_DONE;
  }

  if (s.strstart > s.block_start) {
    /*** FLUSH_BLOCK(s, 0); ***/
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
    /***/
  }

  return BS_NEED_MORE;
}

/* ===========================================================================
 * Compress as much as possible from the input stream, return the current
 * block state.
 * This function does not perform lazy evaluation of matches and inserts
 * new strings in the dictionary only for unmatched strings or for short
 * matches. It is used only for the fast compression options.
 */
function deflate_fast(s, flush) {
  var hash_head;        /* head of the hash chain */
  var bflush;           /* set if current block must be flushed */

  for (;;) {
    /* Make sure that we always have enough lookahead, except
     * at the end of the input file. We need MAX_MATCH bytes
     * for the next match, plus MIN_MATCH bytes to insert the
     * string following the next match.
     */
    if (s.lookahead < MIN_LOOKAHEAD) {
      fill_window(s);
      if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH$1) {
        return BS_NEED_MORE;
      }
      if (s.lookahead === 0) {
        break; /* flush the current block */
      }
    }

    /* Insert the string window[strstart .. strstart+2] in the
     * dictionary, and set hash_head to the head of the hash chain:
     */
    hash_head = 0/*NIL*/;
    if (s.lookahead >= MIN_MATCH) {
      /*** INSERT_STRING(s, s.strstart, hash_head); ***/
      s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
      hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
      s.head[s.ins_h] = s.strstart;
      /***/
    }

    /* Find the longest match, discarding those <= prev_length.
     * At this point we have always match_length < MIN_MATCH
     */
    if (hash_head !== 0/*NIL*/ && ((s.strstart - hash_head) <= (s.w_size - MIN_LOOKAHEAD))) {
      /* To simplify the code, we prevent matches with the string
       * of window index 0 (in particular we have to avoid a match
       * of the string with itself at the start of the input file).
       */
      s.match_length = longest_match(s, hash_head);
      /* longest_match() sets match_start */
    }
    if (s.match_length >= MIN_MATCH) {
      // check_match(s, s.strstart, s.match_start, s.match_length); // for debug only

      /*** _tr_tally_dist(s, s.strstart - s.match_start,
                     s.match_length - MIN_MATCH, bflush); ***/
      bflush = trees._tr_tally(s, s.strstart - s.match_start, s.match_length - MIN_MATCH);

      s.lookahead -= s.match_length;

      /* Insert new strings in the hash table only if the match length
       * is not too large. This saves time but degrades compression.
       */
      if (s.match_length <= s.max_lazy_match/*max_insert_length*/ && s.lookahead >= MIN_MATCH) {
        s.match_length--; /* string at strstart already in table */
        do {
          s.strstart++;
          /*** INSERT_STRING(s, s.strstart, hash_head); ***/
          s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = s.strstart;
          /***/
          /* strstart never exceeds WSIZE-MAX_MATCH, so there are
           * always MIN_MATCH bytes ahead.
           */
        } while (--s.match_length !== 0);
        s.strstart++;
      } else
      {
        s.strstart += s.match_length;
        s.match_length = 0;
        s.ins_h = s.window[s.strstart];
        /* UPDATE_HASH(s, s.ins_h, s.window[s.strstart+1]); */
        s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + 1]) & s.hash_mask;

//#if MIN_MATCH != 3
//                Call UPDATE_HASH() MIN_MATCH-3 more times
//#endif
        /* If lookahead < MIN_MATCH, ins_h is garbage, but it does not
         * matter since it will be recomputed at next deflate call.
         */
      }
    } else {
      /* No match, output a literal byte */
      //Tracevv((stderr,"%c", s.window[s.strstart]));
      /*** _tr_tally_lit(s, s.window[s.strstart], bflush); ***/
      bflush = trees._tr_tally(s, 0, s.window[s.strstart]);

      s.lookahead--;
      s.strstart++;
    }
    if (bflush) {
      /*** FLUSH_BLOCK(s, 0); ***/
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
      /***/
    }
  }
  s.insert = ((s.strstart < (MIN_MATCH - 1)) ? s.strstart : MIN_MATCH - 1);
  if (flush === Z_FINISH$1) {
    /*** FLUSH_BLOCK(s, 1); ***/
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    /***/
    return BS_FINISH_DONE;
  }
  if (s.last_lit) {
    /*** FLUSH_BLOCK(s, 0); ***/
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
    /***/
  }
  return BS_BLOCK_DONE;
}

/* ===========================================================================
 * Same as above, but achieves better compression. We use a lazy
 * evaluation for matches: a match is finally adopted only if there is
 * no better match at the next window position.
 */
function deflate_slow(s, flush) {
  var hash_head;          /* head of hash chain */
  var bflush;              /* set if current block must be flushed */

  var max_insert;

  /* Process the input block. */
  for (;;) {
    /* Make sure that we always have enough lookahead, except
     * at the end of the input file. We need MAX_MATCH bytes
     * for the next match, plus MIN_MATCH bytes to insert the
     * string following the next match.
     */
    if (s.lookahead < MIN_LOOKAHEAD) {
      fill_window(s);
      if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH$1) {
        return BS_NEED_MORE;
      }
      if (s.lookahead === 0) { break; } /* flush the current block */
    }

    /* Insert the string window[strstart .. strstart+2] in the
     * dictionary, and set hash_head to the head of the hash chain:
     */
    hash_head = 0/*NIL*/;
    if (s.lookahead >= MIN_MATCH) {
      /*** INSERT_STRING(s, s.strstart, hash_head); ***/
      s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
      hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
      s.head[s.ins_h] = s.strstart;
      /***/
    }

    /* Find the longest match, discarding those <= prev_length.
     */
    s.prev_length = s.match_length;
    s.prev_match = s.match_start;
    s.match_length = MIN_MATCH - 1;

    if (hash_head !== 0/*NIL*/ && s.prev_length < s.max_lazy_match &&
        s.strstart - hash_head <= (s.w_size - MIN_LOOKAHEAD)/*MAX_DIST(s)*/) {
      /* To simplify the code, we prevent matches with the string
       * of window index 0 (in particular we have to avoid a match
       * of the string with itself at the start of the input file).
       */
      s.match_length = longest_match(s, hash_head);
      /* longest_match() sets match_start */

      if (s.match_length <= 5 &&
         (s.strategy === Z_FILTERED || (s.match_length === MIN_MATCH && s.strstart - s.match_start > 4096/*TOO_FAR*/))) {

        /* If prev_match is also MIN_MATCH, match_start is garbage
         * but we will ignore the current match anyway.
         */
        s.match_length = MIN_MATCH - 1;
      }
    }
    /* If there was a match at the previous step and the current
     * match is not better, output the previous match:
     */
    if (s.prev_length >= MIN_MATCH && s.match_length <= s.prev_length) {
      max_insert = s.strstart + s.lookahead - MIN_MATCH;
      /* Do not insert strings in hash table beyond this. */

      //check_match(s, s.strstart-1, s.prev_match, s.prev_length);

      /***_tr_tally_dist(s, s.strstart - 1 - s.prev_match,
                     s.prev_length - MIN_MATCH, bflush);***/
      bflush = trees._tr_tally(s, s.strstart - 1 - s.prev_match, s.prev_length - MIN_MATCH);
      /* Insert in hash table all strings up to the end of the match.
       * strstart-1 and strstart are already inserted. If there is not
       * enough lookahead, the last two strings are not inserted in
       * the hash table.
       */
      s.lookahead -= s.prev_length - 1;
      s.prev_length -= 2;
      do {
        if (++s.strstart <= max_insert) {
          /*** INSERT_STRING(s, s.strstart, hash_head); ***/
          s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = s.strstart;
          /***/
        }
      } while (--s.prev_length !== 0);
      s.match_available = 0;
      s.match_length = MIN_MATCH - 1;
      s.strstart++;

      if (bflush) {
        /*** FLUSH_BLOCK(s, 0); ***/
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
        /***/
      }

    } else if (s.match_available) {
      /* If there was no match at the previous position, output a
       * single literal. If there was a match but the current match
       * is longer, truncate the previous match to a single literal.
       */
      //Tracevv((stderr,"%c", s->window[s->strstart-1]));
      /*** _tr_tally_lit(s, s.window[s.strstart-1], bflush); ***/
      bflush = trees._tr_tally(s, 0, s.window[s.strstart - 1]);

      if (bflush) {
        /*** FLUSH_BLOCK_ONLY(s, 0) ***/
        flush_block_only(s, false);
        /***/
      }
      s.strstart++;
      s.lookahead--;
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
    } else {
      /* There is no previous match to compare with, wait for
       * the next step to decide.
       */
      s.match_available = 1;
      s.strstart++;
      s.lookahead--;
    }
  }
  //Assert (flush != Z_NO_FLUSH, "no flush?");
  if (s.match_available) {
    //Tracevv((stderr,"%c", s->window[s->strstart-1]));
    /*** _tr_tally_lit(s, s.window[s.strstart-1], bflush); ***/
    bflush = trees._tr_tally(s, 0, s.window[s.strstart - 1]);

    s.match_available = 0;
  }
  s.insert = s.strstart < MIN_MATCH - 1 ? s.strstart : MIN_MATCH - 1;
  if (flush === Z_FINISH$1) {
    /*** FLUSH_BLOCK(s, 1); ***/
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    /***/
    return BS_FINISH_DONE;
  }
  if (s.last_lit) {
    /*** FLUSH_BLOCK(s, 0); ***/
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
    /***/
  }

  return BS_BLOCK_DONE;
}


/* ===========================================================================
 * For Z_RLE, simply look for runs of bytes, generate matches only of distance
 * one.  Do not maintain a hash table.  (It will be regenerated if this run of
 * deflate switches away from Z_RLE.)
 */
function deflate_rle(s, flush) {
  var bflush;            /* set if current block must be flushed */
  var prev;              /* byte at distance one to match */
  var scan, strend;      /* scan goes up to strend for length of run */

  var _win = s.window;

  for (;;) {
    /* Make sure that we always have enough lookahead, except
     * at the end of the input file. We need MAX_MATCH bytes
     * for the longest run, plus one for the unrolled loop.
     */
    if (s.lookahead <= MAX_MATCH) {
      fill_window(s);
      if (s.lookahead <= MAX_MATCH && flush === Z_NO_FLUSH$1) {
        return BS_NEED_MORE;
      }
      if (s.lookahead === 0) { break; } /* flush the current block */
    }

    /* See how many times the previous byte repeats */
    s.match_length = 0;
    if (s.lookahead >= MIN_MATCH && s.strstart > 0) {
      scan = s.strstart - 1;
      prev = _win[scan];
      if (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan]) {
        strend = s.strstart + MAX_MATCH;
        do {
          /*jshint noempty:false*/
        } while (prev === _win[++scan] && prev === _win[++scan] &&
                 prev === _win[++scan] && prev === _win[++scan] &&
                 prev === _win[++scan] && prev === _win[++scan] &&
                 prev === _win[++scan] && prev === _win[++scan] &&
                 scan < strend);
        s.match_length = MAX_MATCH - (strend - scan);
        if (s.match_length > s.lookahead) {
          s.match_length = s.lookahead;
        }
      }
      //Assert(scan <= s->window+(uInt)(s->window_size-1), "wild scan");
    }

    /* Emit match if have run of MIN_MATCH or longer, else emit literal */
    if (s.match_length >= MIN_MATCH) {
      //check_match(s, s.strstart, s.strstart - 1, s.match_length);

      /*** _tr_tally_dist(s, 1, s.match_length - MIN_MATCH, bflush); ***/
      bflush = trees._tr_tally(s, 1, s.match_length - MIN_MATCH);

      s.lookahead -= s.match_length;
      s.strstart += s.match_length;
      s.match_length = 0;
    } else {
      /* No match, output a literal byte */
      //Tracevv((stderr,"%c", s->window[s->strstart]));
      /*** _tr_tally_lit(s, s.window[s.strstart], bflush); ***/
      bflush = trees._tr_tally(s, 0, s.window[s.strstart]);

      s.lookahead--;
      s.strstart++;
    }
    if (bflush) {
      /*** FLUSH_BLOCK(s, 0); ***/
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
      /***/
    }
  }
  s.insert = 0;
  if (flush === Z_FINISH$1) {
    /*** FLUSH_BLOCK(s, 1); ***/
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    /***/
    return BS_FINISH_DONE;
  }
  if (s.last_lit) {
    /*** FLUSH_BLOCK(s, 0); ***/
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
    /***/
  }
  return BS_BLOCK_DONE;
}

/* ===========================================================================
 * For Z_HUFFMAN_ONLY, do not look for matches.  Do not maintain a hash table.
 * (It will be regenerated if this run of deflate switches away from Huffman.)
 */
function deflate_huff(s, flush) {
  var bflush;             /* set if current block must be flushed */

  for (;;) {
    /* Make sure that we have a literal to write. */
    if (s.lookahead === 0) {
      fill_window(s);
      if (s.lookahead === 0) {
        if (flush === Z_NO_FLUSH$1) {
          return BS_NEED_MORE;
        }
        break;      /* flush the current block */
      }
    }

    /* Output a literal byte */
    s.match_length = 0;
    //Tracevv((stderr,"%c", s->window[s->strstart]));
    /*** _tr_tally_lit(s, s.window[s.strstart], bflush); ***/
    bflush = trees._tr_tally(s, 0, s.window[s.strstart]);
    s.lookahead--;
    s.strstart++;
    if (bflush) {
      /*** FLUSH_BLOCK(s, 0); ***/
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
      /***/
    }
  }
  s.insert = 0;
  if (flush === Z_FINISH$1) {
    /*** FLUSH_BLOCK(s, 1); ***/
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    /***/
    return BS_FINISH_DONE;
  }
  if (s.last_lit) {
    /*** FLUSH_BLOCK(s, 0); ***/
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
    /***/
  }
  return BS_BLOCK_DONE;
}

/* Values for max_lazy_match, good_match and max_chain_length, depending on
 * the desired pack level (0..9). The values given below have been tuned to
 * exclude worst case performance for pathological files. Better values may be
 * found for specific files.
 */
function Config(good_length, max_lazy, nice_length, max_chain, func) {
  this.good_length = good_length;
  this.max_lazy = max_lazy;
  this.nice_length = nice_length;
  this.max_chain = max_chain;
  this.func = func;
}

var configuration_table;

configuration_table = [
  /*      good lazy nice chain */
  new Config(0, 0, 0, 0, deflate_stored),          /* 0 store only */
  new Config(4, 4, 8, 4, deflate_fast),            /* 1 max speed, no lazy matches */
  new Config(4, 5, 16, 8, deflate_fast),           /* 2 */
  new Config(4, 6, 32, 32, deflate_fast),          /* 3 */

  new Config(4, 4, 16, 16, deflate_slow),          /* 4 lazy matches */
  new Config(8, 16, 32, 32, deflate_slow),         /* 5 */
  new Config(8, 16, 128, 128, deflate_slow),       /* 6 */
  new Config(8, 32, 128, 256, deflate_slow),       /* 7 */
  new Config(32, 128, 258, 1024, deflate_slow),    /* 8 */
  new Config(32, 258, 258, 4096, deflate_slow)     /* 9 max compression */
];


/* ===========================================================================
 * Initialize the "longest match" routines for a new zlib stream
 */
function lm_init(s) {
  s.window_size = 2 * s.w_size;

  /*** CLEAR_HASH(s); ***/
  zero(s.head); // Fill with NIL (= 0);

  /* Set the default configuration parameters:
   */
  s.max_lazy_match = configuration_table[s.level].max_lazy;
  s.good_match = configuration_table[s.level].good_length;
  s.nice_match = configuration_table[s.level].nice_length;
  s.max_chain_length = configuration_table[s.level].max_chain;

  s.strstart = 0;
  s.block_start = 0;
  s.lookahead = 0;
  s.insert = 0;
  s.match_length = s.prev_length = MIN_MATCH - 1;
  s.match_available = 0;
  s.ins_h = 0;
}


function DeflateState() {
  this.strm = null;            /* pointer back to this zlib stream */
  this.status = 0;            /* as the name implies */
  this.pending_buf = null;      /* output still pending */
  this.pending_buf_size = 0;  /* size of pending_buf */
  this.pending_out = 0;       /* next pending byte to output to the stream */
  this.pending = 0;           /* nb of bytes in the pending buffer */
  this.wrap = 0;              /* bit 0 true for zlib, bit 1 true for gzip */
  this.gzhead = null;         /* gzip header information to write */
  this.gzindex = 0;           /* where in extra, name, or comment */
  this.method = Z_DEFLATED$1; /* can only be DEFLATED */
  this.last_flush = -1;   /* value of flush param for previous deflate call */

  this.w_size = 0;  /* LZ77 window size (32K by default) */
  this.w_bits = 0;  /* log2(w_size)  (8..16) */
  this.w_mask = 0;  /* w_size - 1 */

  this.window = null;
  /* Sliding window. Input bytes are read into the second half of the window,
   * and move to the first half later to keep a dictionary of at least wSize
   * bytes. With this organization, matches are limited to a distance of
   * wSize-MAX_MATCH bytes, but this ensures that IO is always
   * performed with a length multiple of the block size.
   */

  this.window_size = 0;
  /* Actual size of window: 2*wSize, except when the user input buffer
   * is directly used as sliding window.
   */

  this.prev = null;
  /* Link to older string with same hash index. To limit the size of this
   * array to 64K, this link is maintained only for the last 32K strings.
   * An index in this array is thus a window index modulo 32K.
   */

  this.head = null;   /* Heads of the hash chains or NIL. */

  this.ins_h = 0;       /* hash index of string to be inserted */
  this.hash_size = 0;   /* number of elements in hash table */
  this.hash_bits = 0;   /* log2(hash_size) */
  this.hash_mask = 0;   /* hash_size-1 */

  this.hash_shift = 0;
  /* Number of bits by which ins_h must be shifted at each input
   * step. It must be such that after MIN_MATCH steps, the oldest
   * byte no longer takes part in the hash key, that is:
   *   hash_shift * MIN_MATCH >= hash_bits
   */

  this.block_start = 0;
  /* Window position at the beginning of the current output block. Gets
   * negative when the window is moved backwards.
   */

  this.match_length = 0;      /* length of best match */
  this.prev_match = 0;        /* previous match */
  this.match_available = 0;   /* set if previous match exists */
  this.strstart = 0;          /* start of string to insert */
  this.match_start = 0;       /* start of matching string */
  this.lookahead = 0;         /* number of valid bytes ahead in window */

  this.prev_length = 0;
  /* Length of the best match at previous step. Matches not greater than this
   * are discarded. This is used in the lazy match evaluation.
   */

  this.max_chain_length = 0;
  /* To speed up deflation, hash chains are never searched beyond this
   * length.  A higher limit improves compression ratio but degrades the
   * speed.
   */

  this.max_lazy_match = 0;
  /* Attempt to find a better match only when the current match is strictly
   * smaller than this value. This mechanism is used only for compression
   * levels >= 4.
   */
  // That's alias to max_lazy_match, don't use directly
  //this.max_insert_length = 0;
  /* Insert new strings in the hash table only if the match length is not
   * greater than this length. This saves time but degrades compression.
   * max_insert_length is used only for compression levels <= 3.
   */

  this.level = 0;     /* compression level (1..9) */
  this.strategy = 0;  /* favor or force Huffman coding*/

  this.good_match = 0;
  /* Use a faster search when the previous match is longer than this */

  this.nice_match = 0; /* Stop searching when current match exceeds this */

              /* used by trees.c: */

  /* Didn't use ct_data typedef below to suppress compiler warning */

  // struct ct_data_s dyn_ltree[HEAP_SIZE];   /* literal and length tree */
  // struct ct_data_s dyn_dtree[2*D_CODES+1]; /* distance tree */
  // struct ct_data_s bl_tree[2*BL_CODES+1];  /* Huffman tree for bit lengths */

  // Use flat array of DOUBLE size, with interleaved fata,
  // because JS does not support effective
  this.dyn_ltree  = new common.Buf16(HEAP_SIZE * 2);
  this.dyn_dtree  = new common.Buf16((2 * D_CODES + 1) * 2);
  this.bl_tree    = new common.Buf16((2 * BL_CODES + 1) * 2);
  zero(this.dyn_ltree);
  zero(this.dyn_dtree);
  zero(this.bl_tree);

  this.l_desc   = null;         /* desc. for literal tree */
  this.d_desc   = null;         /* desc. for distance tree */
  this.bl_desc  = null;         /* desc. for bit length tree */

  //ush bl_count[MAX_BITS+1];
  this.bl_count = new common.Buf16(MAX_BITS + 1);
  /* number of codes at each bit length for an optimal tree */

  //int heap[2*L_CODES+1];      /* heap used to build the Huffman trees */
  this.heap = new common.Buf16(2 * L_CODES + 1);  /* heap used to build the Huffman trees */
  zero(this.heap);

  this.heap_len = 0;               /* number of elements in the heap */
  this.heap_max = 0;               /* element of largest frequency */
  /* The sons of heap[n] are heap[2*n] and heap[2*n+1]. heap[0] is not used.
   * The same heap array is used to build all trees.
   */

  this.depth = new common.Buf16(2 * L_CODES + 1); //uch depth[2*L_CODES+1];
  zero(this.depth);
  /* Depth of each subtree used as tie breaker for trees of equal frequency
   */

  this.l_buf = 0;          /* buffer index for literals or lengths */

  this.lit_bufsize = 0;
  /* Size of match buffer for literals/lengths.  There are 4 reasons for
   * limiting lit_bufsize to 64K:
   *   - frequencies can be kept in 16 bit counters
   *   - if compression is not successful for the first block, all input
   *     data is still in the window so we can still emit a stored block even
   *     when input comes from standard input.  (This can also be done for
   *     all blocks if lit_bufsize is not greater than 32K.)
   *   - if compression is not successful for a file smaller than 64K, we can
   *     even emit a stored file instead of a stored block (saving 5 bytes).
   *     This is applicable only for zip (not gzip or zlib).
   *   - creating new Huffman trees less frequently may not provide fast
   *     adaptation to changes in the input data statistics. (Take for
   *     example a binary file with poorly compressible code followed by
   *     a highly compressible string table.) Smaller buffer sizes give
   *     fast adaptation but have of course the overhead of transmitting
   *     trees more frequently.
   *   - I can't count above 4
   */

  this.last_lit = 0;      /* running index in l_buf */

  this.d_buf = 0;
  /* Buffer index for distances. To simplify the code, d_buf and l_buf have
   * the same number of elements. To use different lengths, an extra flag
   * array would be necessary.
   */

  this.opt_len = 0;       /* bit length of current block with optimal trees */
  this.static_len = 0;    /* bit length of current block with static trees */
  this.matches = 0;       /* number of string matches in current block */
  this.insert = 0;        /* bytes at end of window left to insert */


  this.bi_buf = 0;
  /* Output buffer. bits are inserted starting at the bottom (least
   * significant bits).
   */
  this.bi_valid = 0;
  /* Number of valid bits in bi_buf.  All bits above the last valid bit
   * are always zero.
   */

  // Used for window memory init. We safely ignore it for JS. That makes
  // sense only for pointers and memory check tools.
  //this.high_water = 0;
  /* High water mark offset in window for initialized bytes -- bytes above
   * this are set to zero in order to avoid memory check warnings when
   * longest match routines access bytes past the input.  This is then
   * updated to the new high water mark.
   */
}


function deflateResetKeep(strm) {
  var s;

  if (!strm || !strm.state) {
    return err$1(strm, Z_STREAM_ERROR);
  }

  strm.total_in = strm.total_out = 0;
  strm.data_type = Z_UNKNOWN;

  s = strm.state;
  s.pending = 0;
  s.pending_out = 0;

  if (s.wrap < 0) {
    s.wrap = -s.wrap;
    /* was made negative by deflate(..., Z_FINISH); */
  }
  s.status = (s.wrap ? INIT_STATE : BUSY_STATE);
  strm.adler = (s.wrap === 2) ?
    0  // crc32(0, Z_NULL, 0)
  :
    1; // adler32(0, Z_NULL, 0)
  s.last_flush = Z_NO_FLUSH$1;
  trees._tr_init(s);
  return Z_OK$1;
}


function deflateReset(strm) {
  var ret = deflateResetKeep(strm);
  if (ret === Z_OK$1) {
    lm_init(strm.state);
  }
  return ret;
}


function deflateSetHeader(strm, head) {
  if (!strm || !strm.state) { return Z_STREAM_ERROR; }
  if (strm.state.wrap !== 2) { return Z_STREAM_ERROR; }
  strm.state.gzhead = head;
  return Z_OK$1;
}


function deflateInit2(strm, level, method, windowBits, memLevel, strategy) {
  if (!strm) { // === Z_NULL
    return Z_STREAM_ERROR;
  }
  var wrap = 1;

  if (level === Z_DEFAULT_COMPRESSION$1) {
    level = 6;
  }

  if (windowBits < 0) { /* suppress zlib wrapper */
    wrap = 0;
    windowBits = -windowBits;
  }

  else if (windowBits > 15) {
    wrap = 2;           /* write gzip wrapper instead */
    windowBits -= 16;
  }


  if (memLevel < 1 || memLevel > MAX_MEM_LEVEL || method !== Z_DEFLATED$1 ||
    windowBits < 8 || windowBits > 15 || level < 0 || level > 9 ||
    strategy < 0 || strategy > Z_FIXED) {
    return err$1(strm, Z_STREAM_ERROR);
  }


  if (windowBits === 8) {
    windowBits = 9;
  }
  /* until 256-byte window bug fixed */

  var s = new DeflateState();

  strm.state = s;
  s.strm = strm;

  s.wrap = wrap;
  s.gzhead = null;
  s.w_bits = windowBits;
  s.w_size = 1 << s.w_bits;
  s.w_mask = s.w_size - 1;

  s.hash_bits = memLevel + 7;
  s.hash_size = 1 << s.hash_bits;
  s.hash_mask = s.hash_size - 1;
  s.hash_shift = ~~((s.hash_bits + MIN_MATCH - 1) / MIN_MATCH);

  s.window = new common.Buf8(s.w_size * 2);
  s.head = new common.Buf16(s.hash_size);
  s.prev = new common.Buf16(s.w_size);

  // Don't need mem init magic for JS.
  //s.high_water = 0;  /* nothing written to s->window yet */

  s.lit_bufsize = 1 << (memLevel + 6); /* 16K elements by default */

  s.pending_buf_size = s.lit_bufsize * 4;

  //overlay = (ushf *) ZALLOC(strm, s->lit_bufsize, sizeof(ush)+2);
  //s->pending_buf = (uchf *) overlay;
  s.pending_buf = new common.Buf8(s.pending_buf_size);

  // It is offset from `s.pending_buf` (size is `s.lit_bufsize * 2`)
  //s->d_buf = overlay + s->lit_bufsize/sizeof(ush);
  s.d_buf = 1 * s.lit_bufsize;

  //s->l_buf = s->pending_buf + (1+sizeof(ush))*s->lit_bufsize;
  s.l_buf = (1 + 2) * s.lit_bufsize;

  s.level = level;
  s.strategy = strategy;
  s.method = method;

  return deflateReset(strm);
}

function deflateInit(strm, level) {
  return deflateInit2(strm, level, Z_DEFLATED$1, MAX_WBITS, DEF_MEM_LEVEL, Z_DEFAULT_STRATEGY$1);
}


function deflate$1(strm, flush) {
  var old_flush, s;
  var beg, val; // for gzip header write only

  if (!strm || !strm.state ||
    flush > Z_BLOCK || flush < 0) {
    return strm ? err$1(strm, Z_STREAM_ERROR) : Z_STREAM_ERROR;
  }

  s = strm.state;

  if (!strm.output ||
      (!strm.input && strm.avail_in !== 0) ||
      (s.status === FINISH_STATE && flush !== Z_FINISH$1)) {
    return err$1(strm, (strm.avail_out === 0) ? Z_BUF_ERROR : Z_STREAM_ERROR);
  }

  s.strm = strm; /* just in case */
  old_flush = s.last_flush;
  s.last_flush = flush;

  /* Write the header */
  if (s.status === INIT_STATE) {

    if (s.wrap === 2) { // GZIP header
      strm.adler = 0;  //crc32(0L, Z_NULL, 0);
      put_byte(s, 31);
      put_byte(s, 139);
      put_byte(s, 8);
      if (!s.gzhead) { // s->gzhead == Z_NULL
        put_byte(s, 0);
        put_byte(s, 0);
        put_byte(s, 0);
        put_byte(s, 0);
        put_byte(s, 0);
        put_byte(s, s.level === 9 ? 2 :
                    (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ?
                     4 : 0));
        put_byte(s, OS_CODE);
        s.status = BUSY_STATE;
      }
      else {
        put_byte(s, (s.gzhead.text ? 1 : 0) +
                    (s.gzhead.hcrc ? 2 : 0) +
                    (!s.gzhead.extra ? 0 : 4) +
                    (!s.gzhead.name ? 0 : 8) +
                    (!s.gzhead.comment ? 0 : 16)
                );
        put_byte(s, s.gzhead.time & 0xff);
        put_byte(s, (s.gzhead.time >> 8) & 0xff);
        put_byte(s, (s.gzhead.time >> 16) & 0xff);
        put_byte(s, (s.gzhead.time >> 24) & 0xff);
        put_byte(s, s.level === 9 ? 2 :
                    (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ?
                     4 : 0));
        put_byte(s, s.gzhead.os & 0xff);
        if (s.gzhead.extra && s.gzhead.extra.length) {
          put_byte(s, s.gzhead.extra.length & 0xff);
          put_byte(s, (s.gzhead.extra.length >> 8) & 0xff);
        }
        if (s.gzhead.hcrc) {
          strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending, 0);
        }
        s.gzindex = 0;
        s.status = EXTRA_STATE;
      }
    }
    else // DEFLATE header
    {
      var header = (Z_DEFLATED$1 + ((s.w_bits - 8) << 4)) << 8;
      var level_flags = -1;

      if (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2) {
        level_flags = 0;
      } else if (s.level < 6) {
        level_flags = 1;
      } else if (s.level === 6) {
        level_flags = 2;
      } else {
        level_flags = 3;
      }
      header |= (level_flags << 6);
      if (s.strstart !== 0) { header |= PRESET_DICT; }
      header += 31 - (header % 31);

      s.status = BUSY_STATE;
      putShortMSB(s, header);

      /* Save the adler32 of the preset dictionary: */
      if (s.strstart !== 0) {
        putShortMSB(s, strm.adler >>> 16);
        putShortMSB(s, strm.adler & 0xffff);
      }
      strm.adler = 1; // adler32(0L, Z_NULL, 0);
    }
  }

//#ifdef GZIP
  if (s.status === EXTRA_STATE) {
    if (s.gzhead.extra/* != Z_NULL*/) {
      beg = s.pending;  /* start of bytes to update crc */

      while (s.gzindex < (s.gzhead.extra.length & 0xffff)) {
        if (s.pending === s.pending_buf_size) {
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          flush_pending(strm);
          beg = s.pending;
          if (s.pending === s.pending_buf_size) {
            break;
          }
        }
        put_byte(s, s.gzhead.extra[s.gzindex] & 0xff);
        s.gzindex++;
      }
      if (s.gzhead.hcrc && s.pending > beg) {
        strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
      }
      if (s.gzindex === s.gzhead.extra.length) {
        s.gzindex = 0;
        s.status = NAME_STATE;
      }
    }
    else {
      s.status = NAME_STATE;
    }
  }
  if (s.status === NAME_STATE) {
    if (s.gzhead.name/* != Z_NULL*/) {
      beg = s.pending;  /* start of bytes to update crc */
      //int val;

      do {
        if (s.pending === s.pending_buf_size) {
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          flush_pending(strm);
          beg = s.pending;
          if (s.pending === s.pending_buf_size) {
            val = 1;
            break;
          }
        }
        // JS specific: little magic to add zero terminator to end of string
        if (s.gzindex < s.gzhead.name.length) {
          val = s.gzhead.name.charCodeAt(s.gzindex++) & 0xff;
        } else {
          val = 0;
        }
        put_byte(s, val);
      } while (val !== 0);

      if (s.gzhead.hcrc && s.pending > beg) {
        strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
      }
      if (val === 0) {
        s.gzindex = 0;
        s.status = COMMENT_STATE;
      }
    }
    else {
      s.status = COMMENT_STATE;
    }
  }
  if (s.status === COMMENT_STATE) {
    if (s.gzhead.comment/* != Z_NULL*/) {
      beg = s.pending;  /* start of bytes to update crc */
      //int val;

      do {
        if (s.pending === s.pending_buf_size) {
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          flush_pending(strm);
          beg = s.pending;
          if (s.pending === s.pending_buf_size) {
            val = 1;
            break;
          }
        }
        // JS specific: little magic to add zero terminator to end of string
        if (s.gzindex < s.gzhead.comment.length) {
          val = s.gzhead.comment.charCodeAt(s.gzindex++) & 0xff;
        } else {
          val = 0;
        }
        put_byte(s, val);
      } while (val !== 0);

      if (s.gzhead.hcrc && s.pending > beg) {
        strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
      }
      if (val === 0) {
        s.status = HCRC_STATE;
      }
    }
    else {
      s.status = HCRC_STATE;
    }
  }
  if (s.status === HCRC_STATE) {
    if (s.gzhead.hcrc) {
      if (s.pending + 2 > s.pending_buf_size) {
        flush_pending(strm);
      }
      if (s.pending + 2 <= s.pending_buf_size) {
        put_byte(s, strm.adler & 0xff);
        put_byte(s, (strm.adler >> 8) & 0xff);
        strm.adler = 0; //crc32(0L, Z_NULL, 0);
        s.status = BUSY_STATE;
      }
    }
    else {
      s.status = BUSY_STATE;
    }
  }
//#endif

  /* Flush as much pending output as possible */
  if (s.pending !== 0) {
    flush_pending(strm);
    if (strm.avail_out === 0) {
      /* Since avail_out is 0, deflate will be called again with
       * more output space, but possibly with both pending and
       * avail_in equal to zero. There won't be anything to do,
       * but this is not an error situation so make sure we
       * return OK instead of BUF_ERROR at next call of deflate:
       */
      s.last_flush = -1;
      return Z_OK$1;
    }

    /* Make sure there is something to do and avoid duplicate consecutive
     * flushes. For repeated and useless calls with Z_FINISH, we keep
     * returning Z_STREAM_END instead of Z_BUF_ERROR.
     */
  } else if (strm.avail_in === 0 && rank(flush) <= rank(old_flush) &&
    flush !== Z_FINISH$1) {
    return err$1(strm, Z_BUF_ERROR);
  }

  /* User must not provide more input after the first FINISH: */
  if (s.status === FINISH_STATE && strm.avail_in !== 0) {
    return err$1(strm, Z_BUF_ERROR);
  }

  /* Start a new block or continue the current one.
   */
  if (strm.avail_in !== 0 || s.lookahead !== 0 ||
    (flush !== Z_NO_FLUSH$1 && s.status !== FINISH_STATE)) {
    var bstate = (s.strategy === Z_HUFFMAN_ONLY) ? deflate_huff(s, flush) :
      (s.strategy === Z_RLE ? deflate_rle(s, flush) :
        configuration_table[s.level].func(s, flush));

    if (bstate === BS_FINISH_STARTED || bstate === BS_FINISH_DONE) {
      s.status = FINISH_STATE;
    }
    if (bstate === BS_NEED_MORE || bstate === BS_FINISH_STARTED) {
      if (strm.avail_out === 0) {
        s.last_flush = -1;
        /* avoid BUF_ERROR next call, see above */
      }
      return Z_OK$1;
      /* If flush != Z_NO_FLUSH && avail_out == 0, the next call
       * of deflate should use the same flush parameter to make sure
       * that the flush is complete. So we don't have to output an
       * empty block here, this will be done at next call. This also
       * ensures that for a very small output buffer, we emit at most
       * one empty block.
       */
    }
    if (bstate === BS_BLOCK_DONE) {
      if (flush === Z_PARTIAL_FLUSH) {
        trees._tr_align(s);
      }
      else if (flush !== Z_BLOCK) { /* FULL_FLUSH or SYNC_FLUSH */

        trees._tr_stored_block(s, 0, 0, false);
        /* For a full flush, this empty block will be recognized
         * as a special marker by inflate_sync().
         */
        if (flush === Z_FULL_FLUSH) {
          /*** CLEAR_HASH(s); ***/             /* forget history */
          zero(s.head); // Fill with NIL (= 0);

          if (s.lookahead === 0) {
            s.strstart = 0;
            s.block_start = 0;
            s.insert = 0;
          }
        }
      }
      flush_pending(strm);
      if (strm.avail_out === 0) {
        s.last_flush = -1; /* avoid BUF_ERROR at next call, see above */
        return Z_OK$1;
      }
    }
  }
  //Assert(strm->avail_out > 0, "bug2");
  //if (strm.avail_out <= 0) { throw new Error("bug2");}

  if (flush !== Z_FINISH$1) { return Z_OK$1; }
  if (s.wrap <= 0) { return Z_STREAM_END$1; }

  /* Write the trailer */
  if (s.wrap === 2) {
    put_byte(s, strm.adler & 0xff);
    put_byte(s, (strm.adler >> 8) & 0xff);
    put_byte(s, (strm.adler >> 16) & 0xff);
    put_byte(s, (strm.adler >> 24) & 0xff);
    put_byte(s, strm.total_in & 0xff);
    put_byte(s, (strm.total_in >> 8) & 0xff);
    put_byte(s, (strm.total_in >> 16) & 0xff);
    put_byte(s, (strm.total_in >> 24) & 0xff);
  }
  else
  {
    putShortMSB(s, strm.adler >>> 16);
    putShortMSB(s, strm.adler & 0xffff);
  }

  flush_pending(strm);
  /* If avail_out is zero, the application will call deflate again
   * to flush the rest.
   */
  if (s.wrap > 0) { s.wrap = -s.wrap; }
  /* write the trailer only once! */
  return s.pending !== 0 ? Z_OK$1 : Z_STREAM_END$1;
}

function deflateEnd(strm) {
  var status;

  if (!strm/*== Z_NULL*/ || !strm.state/*== Z_NULL*/) {
    return Z_STREAM_ERROR;
  }

  status = strm.state.status;
  if (status !== INIT_STATE &&
    status !== EXTRA_STATE &&
    status !== NAME_STATE &&
    status !== COMMENT_STATE &&
    status !== HCRC_STATE &&
    status !== BUSY_STATE &&
    status !== FINISH_STATE
  ) {
    return err$1(strm, Z_STREAM_ERROR);
  }

  strm.state = null;

  return status === BUSY_STATE ? err$1(strm, Z_DATA_ERROR) : Z_OK$1;
}


/* =========================================================================
 * Initializes the compression dictionary from the given byte
 * sequence without producing any compressed output.
 */
function deflateSetDictionary(strm, dictionary) {
  var dictLength = dictionary.length;

  var s;
  var str, n;
  var wrap;
  var avail;
  var next;
  var input;
  var tmpDict;

  if (!strm/*== Z_NULL*/ || !strm.state/*== Z_NULL*/) {
    return Z_STREAM_ERROR;
  }

  s = strm.state;
  wrap = s.wrap;

  if (wrap === 2 || (wrap === 1 && s.status !== INIT_STATE) || s.lookahead) {
    return Z_STREAM_ERROR;
  }

  /* when using zlib wrappers, compute Adler-32 for provided dictionary */
  if (wrap === 1) {
    /* adler32(strm->adler, dictionary, dictLength); */
    strm.adler = adler32_1(strm.adler, dictionary, dictLength, 0);
  }

  s.wrap = 0;   /* avoid computing Adler-32 in read_buf */

  /* if dictionary would fill window, just replace the history */
  if (dictLength >= s.w_size) {
    if (wrap === 0) {            /* already empty otherwise */
      /*** CLEAR_HASH(s); ***/
      zero(s.head); // Fill with NIL (= 0);
      s.strstart = 0;
      s.block_start = 0;
      s.insert = 0;
    }
    /* use the tail */
    // dictionary = dictionary.slice(dictLength - s.w_size);
    tmpDict = new common.Buf8(s.w_size);
    common.arraySet(tmpDict, dictionary, dictLength - s.w_size, s.w_size, 0);
    dictionary = tmpDict;
    dictLength = s.w_size;
  }
  /* insert dictionary into window and hash */
  avail = strm.avail_in;
  next = strm.next_in;
  input = strm.input;
  strm.avail_in = dictLength;
  strm.next_in = 0;
  strm.input = dictionary;
  fill_window(s);
  while (s.lookahead >= MIN_MATCH) {
    str = s.strstart;
    n = s.lookahead - (MIN_MATCH - 1);
    do {
      /* UPDATE_HASH(s, s->ins_h, s->window[str + MIN_MATCH-1]); */
      s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[str + MIN_MATCH - 1]) & s.hash_mask;

      s.prev[str & s.w_mask] = s.head[s.ins_h];

      s.head[s.ins_h] = str;
      str++;
    } while (--n);
    s.strstart = str;
    s.lookahead = MIN_MATCH - 1;
    fill_window(s);
  }
  s.strstart += s.lookahead;
  s.block_start = s.strstart;
  s.insert = s.lookahead;
  s.lookahead = 0;
  s.match_length = s.prev_length = MIN_MATCH - 1;
  s.match_available = 0;
  strm.next_in = next;
  strm.input = input;
  strm.avail_in = avail;
  s.wrap = wrap;
  return Z_OK$1;
}


var deflateInit_1 = deflateInit;
var deflateInit2_1 = deflateInit2;
var deflateReset_1 = deflateReset;
var deflateResetKeep_1 = deflateResetKeep;
var deflateSetHeader_1 = deflateSetHeader;
var deflate_2$1 = deflate$1;
var deflateEnd_1 = deflateEnd;
var deflateSetDictionary_1 = deflateSetDictionary;
var deflateInfo = 'pako deflate (from Nodeca project)';

/* Not implemented
exports.deflateBound = deflateBound;
exports.deflateCopy = deflateCopy;
exports.deflateParams = deflateParams;
exports.deflatePending = deflatePending;
exports.deflatePrime = deflatePrime;
exports.deflateTune = deflateTune;
*/

var deflate_1$2 = {
	deflateInit: deflateInit_1,
	deflateInit2: deflateInit2_1,
	deflateReset: deflateReset_1,
	deflateResetKeep: deflateResetKeep_1,
	deflateSetHeader: deflateSetHeader_1,
	deflate: deflate_2$1,
	deflateEnd: deflateEnd_1,
	deflateSetDictionary: deflateSetDictionary_1,
	deflateInfo: deflateInfo
};

// Quick check if we can use fast array to bin string conversion
//
// - apply(Array) can fail on Android 2.2
// - apply(Uint8Array) can fail on iOS 5.1 Safary
//
var STR_APPLY_OK = true;
var STR_APPLY_UIA_OK = true;

try { String.fromCharCode.apply(null, [ 0 ]); } catch (__) { STR_APPLY_OK = false; }
try { String.fromCharCode.apply(null, new Uint8Array(1)); } catch (__) { STR_APPLY_UIA_OK = false; }


// Table with utf8 lengths (calculated by first byte of sequence)
// Note, that 5 & 6-byte values and some 4-byte values can not be represented in JS,
// because max possible codepoint is 0x10ffff
var _utf8len = new common.Buf8(256);
for (var q = 0; q < 256; q++) {
  _utf8len[q] = (q >= 252 ? 6 : q >= 248 ? 5 : q >= 240 ? 4 : q >= 224 ? 3 : q >= 192 ? 2 : 1);
}
_utf8len[254] = _utf8len[254] = 1; // Invalid sequence start


// convert string to array (typed, when possible)
var string2buf = function (str) {
  var buf, c, c2, m_pos, i, str_len = str.length, buf_len = 0;

  // count binary size
  for (m_pos = 0; m_pos < str_len; m_pos++) {
    c = str.charCodeAt(m_pos);
    if ((c & 0xfc00) === 0xd800 && (m_pos + 1 < str_len)) {
      c2 = str.charCodeAt(m_pos + 1);
      if ((c2 & 0xfc00) === 0xdc00) {
        c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
        m_pos++;
      }
    }
    buf_len += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
  }

  // allocate buffer
  buf = new common.Buf8(buf_len);

  // convert
  for (i = 0, m_pos = 0; i < buf_len; m_pos++) {
    c = str.charCodeAt(m_pos);
    if ((c & 0xfc00) === 0xd800 && (m_pos + 1 < str_len)) {
      c2 = str.charCodeAt(m_pos + 1);
      if ((c2 & 0xfc00) === 0xdc00) {
        c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
        m_pos++;
      }
    }
    if (c < 0x80) {
      /* one byte */
      buf[i++] = c;
    } else if (c < 0x800) {
      /* two bytes */
      buf[i++] = 0xC0 | (c >>> 6);
      buf[i++] = 0x80 | (c & 0x3f);
    } else if (c < 0x10000) {
      /* three bytes */
      buf[i++] = 0xE0 | (c >>> 12);
      buf[i++] = 0x80 | (c >>> 6 & 0x3f);
      buf[i++] = 0x80 | (c & 0x3f);
    } else {
      /* four bytes */
      buf[i++] = 0xf0 | (c >>> 18);
      buf[i++] = 0x80 | (c >>> 12 & 0x3f);
      buf[i++] = 0x80 | (c >>> 6 & 0x3f);
      buf[i++] = 0x80 | (c & 0x3f);
    }
  }

  return buf;
};

// Helper (used in 2 places)
function buf2binstring(buf, len) {
  // use fallback for big arrays to avoid stack overflow
  if (len < 65537) {
    if ((buf.subarray && STR_APPLY_UIA_OK) || (!buf.subarray && STR_APPLY_OK)) {
      return String.fromCharCode.apply(null, common.shrinkBuf(buf, len));
    }
  }

  var result = '';
  for (var i = 0; i < len; i++) {
    result += String.fromCharCode(buf[i]);
  }
  return result;
}


// Convert byte array to binary string
var buf2binstring_1 = function (buf) {
  return buf2binstring(buf, buf.length);
};


// Convert binary string (typed, when possible)
var binstring2buf = function (str) {
  var buf = new common.Buf8(str.length);
  for (var i = 0, len = buf.length; i < len; i++) {
    buf[i] = str.charCodeAt(i);
  }
  return buf;
};


// convert array to string
var buf2string = function (buf, max) {
  var i, out, c, c_len;
  var len = max || buf.length;

  // Reserve max possible length (2 words per char)
  // NB: by unknown reasons, Array is significantly faster for
  //     String.fromCharCode.apply than Uint16Array.
  var utf16buf = new Array(len * 2);

  for (out = 0, i = 0; i < len;) {
    c = buf[i++];
    // quick process ascii
    if (c < 0x80) { utf16buf[out++] = c; continue; }

    c_len = _utf8len[c];
    // skip 5 & 6 byte codes
    if (c_len > 4) { utf16buf[out++] = 0xfffd; i += c_len - 1; continue; }

    // apply mask on first byte
    c &= c_len === 2 ? 0x1f : c_len === 3 ? 0x0f : 0x07;
    // join the rest
    while (c_len > 1 && i < len) {
      c = (c << 6) | (buf[i++] & 0x3f);
      c_len--;
    }

    // terminated by end of string?
    if (c_len > 1) { utf16buf[out++] = 0xfffd; continue; }

    if (c < 0x10000) {
      utf16buf[out++] = c;
    } else {
      c -= 0x10000;
      utf16buf[out++] = 0xd800 | ((c >> 10) & 0x3ff);
      utf16buf[out++] = 0xdc00 | (c & 0x3ff);
    }
  }

  return buf2binstring(utf16buf, out);
};


// Calculate max possible position in utf8 buffer,
// that will not break sequence. If that's not possible
// - (very small limits) return max size as is.
//
// buf[] - utf8 bytes array
// max   - length limit (mandatory);
var utf8border = function (buf, max) {
  var pos;

  max = max || buf.length;
  if (max > buf.length) { max = buf.length; }

  // go back from last position, until start of sequence found
  pos = max - 1;
  while (pos >= 0 && (buf[pos] & 0xC0) === 0x80) { pos--; }

  // Fuckup - very small and broken sequence,
  // return max, because we should return something anyway.
  if (pos < 0) { return max; }

  // If we came to start of buffer - that means vuffer is too small,
  // return max too.
  if (pos === 0) { return max; }

  return (pos + _utf8len[buf[pos]] > max) ? pos : max;
};

var strings = {
	string2buf: string2buf,
	buf2binstring: buf2binstring_1,
	binstring2buf: binstring2buf,
	buf2string: buf2string,
	utf8border: utf8border
};

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

function ZStream() {
  /* next input byte */
  this.input = null; // JS specific, because we have no pointers
  this.next_in = 0;
  /* number of bytes available at input */
  this.avail_in = 0;
  /* total number of input bytes read so far */
  this.total_in = 0;
  /* next output byte should be put there */
  this.output = null; // JS specific, because we have no pointers
  this.next_out = 0;
  /* remaining free space at output */
  this.avail_out = 0;
  /* total number of bytes output so far */
  this.total_out = 0;
  /* last error message, NULL if no error */
  this.msg = ''/*Z_NULL*/;
  /* not visible by applications */
  this.state = null;
  /* best guess about the data type: binary or text */
  this.data_type = 2/*Z_UNKNOWN*/;
  /* adler32 value of the uncompressed data */
  this.adler = 0;
}

var zstream = ZStream;

var toString$1 = Object.prototype.toString;

/* Public constants ==========================================================*/
/* ===========================================================================*/

var Z_NO_FLUSH      = 0;
var Z_FINISH        = 4;

var Z_OK            = 0;
var Z_STREAM_END    = 1;
var Z_SYNC_FLUSH    = 2;

var Z_DEFAULT_COMPRESSION = -1;

var Z_DEFAULT_STRATEGY    = 0;

var Z_DEFLATED  = 8;

/* ===========================================================================*/


/**
 * class Deflate
 *
 * Generic JS-style wrapper for zlib calls. If you don't need
 * streaming behaviour - use more simple functions: [[deflate]],
 * [[deflateRaw]] and [[gzip]].
 **/

/* internal
 * Deflate.chunks -> Array
 *
 * Chunks of output data, if [[Deflate#onData]] not overriden.
 **/

/**
 * Deflate.result -> Uint8Array|Array
 *
 * Compressed result, generated by default [[Deflate#onData]]
 * and [[Deflate#onEnd]] handlers. Filled after you push last chunk
 * (call [[Deflate#push]] with `Z_FINISH` / `true` param)  or if you
 * push a chunk with explicit flush (call [[Deflate#push]] with
 * `Z_SYNC_FLUSH` param).
 **/

/**
 * Deflate.err -> Number
 *
 * Error code after deflate finished. 0 (Z_OK) on success.
 * You will not need it in real life, because deflate errors
 * are possible only on wrong options or bad `onData` / `onEnd`
 * custom handlers.
 **/

/**
 * Deflate.msg -> String
 *
 * Error message, if [[Deflate.err]] != 0
 **/


/**
 * new Deflate(options)
 * - options (Object): zlib deflate options.
 *
 * Creates new deflator instance with specified params. Throws exception
 * on bad params. Supported options:
 *
 * - `level`
 * - `windowBits`
 * - `memLevel`
 * - `strategy`
 * - `dictionary`
 *
 * [http://zlib.net/manual.html#Advanced](http://zlib.net/manual.html#Advanced)
 * for more information on these.
 *
 * Additional options, for internal needs:
 *
 * - `chunkSize` - size of generated data chunks (16K by default)
 * - `raw` (Boolean) - do raw deflate
 * - `gzip` (Boolean) - create gzip wrapper
 * - `to` (String) - if equal to 'string', then result will be "binary string"
 *    (each char code [0..255])
 * - `header` (Object) - custom header for gzip
 *   - `text` (Boolean) - true if compressed data believed to be text
 *   - `time` (Number) - modification time, unix timestamp
 *   - `os` (Number) - operation system code
 *   - `extra` (Array) - array of bytes with extra data (max 65536)
 *   - `name` (String) - file name (binary string)
 *   - `comment` (String) - comment (binary string)
 *   - `hcrc` (Boolean) - true if header crc should be added
 *
 * ##### Example:
 *
 * ```javascript
 * var pako = require('pako')
 *   , chunk1 = Uint8Array([1,2,3,4,5,6,7,8,9])
 *   , chunk2 = Uint8Array([10,11,12,13,14,15,16,17,18,19]);
 *
 * var deflate = new pako.Deflate({ level: 3});
 *
 * deflate.push(chunk1, false);
 * deflate.push(chunk2, true);  // true -> last chunk
 *
 * if (deflate.err) { throw new Error(deflate.err); }
 *
 * console.log(deflate.result);
 * ```
 **/
function Deflate(options) {
  if (!(this instanceof Deflate)) return new Deflate(options);

  this.options = common.assign({
    level: Z_DEFAULT_COMPRESSION,
    method: Z_DEFLATED,
    chunkSize: 16384,
    windowBits: 15,
    memLevel: 8,
    strategy: Z_DEFAULT_STRATEGY,
    to: ''
  }, options || {});

  var opt = this.options;

  if (opt.raw && (opt.windowBits > 0)) {
    opt.windowBits = -opt.windowBits;
  }

  else if (opt.gzip && (opt.windowBits > 0) && (opt.windowBits < 16)) {
    opt.windowBits += 16;
  }

  this.err    = 0;      // error code, if happens (0 = Z_OK)
  this.msg    = '';     // error message
  this.ended  = false;  // used to avoid multiple onEnd() calls
  this.chunks = [];     // chunks of compressed data

  this.strm = new zstream();
  this.strm.avail_out = 0;

  var status = deflate_1$2.deflateInit2(
    this.strm,
    opt.level,
    opt.method,
    opt.windowBits,
    opt.memLevel,
    opt.strategy
  );

  if (status !== Z_OK) {
    throw new Error(messages[status]);
  }

  if (opt.header) {
    deflate_1$2.deflateSetHeader(this.strm, opt.header);
  }

  if (opt.dictionary) {
    var dict;
    // Convert data if needed
    if (typeof opt.dictionary === 'string') {
      // If we need to compress text, change encoding to utf8.
      dict = strings.string2buf(opt.dictionary);
    } else if (toString$1.call(opt.dictionary) === '[object ArrayBuffer]') {
      dict = new Uint8Array(opt.dictionary);
    } else {
      dict = opt.dictionary;
    }

    status = deflate_1$2.deflateSetDictionary(this.strm, dict);

    if (status !== Z_OK) {
      throw new Error(messages[status]);
    }

    this._dict_set = true;
  }
}

/**
 * Deflate#push(data[, mode]) -> Boolean
 * - data (Uint8Array|Array|ArrayBuffer|String): input data. Strings will be
 *   converted to utf8 byte sequence.
 * - mode (Number|Boolean): 0..6 for corresponding Z_NO_FLUSH..Z_TREE modes.
 *   See constants. Skipped or `false` means Z_NO_FLUSH, `true` meansh Z_FINISH.
 *
 * Sends input data to deflate pipe, generating [[Deflate#onData]] calls with
 * new compressed chunks. Returns `true` on success. The last data block must have
 * mode Z_FINISH (or `true`). That will flush internal pending buffers and call
 * [[Deflate#onEnd]]. For interim explicit flushes (without ending the stream) you
 * can use mode Z_SYNC_FLUSH, keeping the compression context.
 *
 * On fail call [[Deflate#onEnd]] with error code and return false.
 *
 * We strongly recommend to use `Uint8Array` on input for best speed (output
 * array format is detected automatically). Also, don't skip last param and always
 * use the same type in your code (boolean or number). That will improve JS speed.
 *
 * For regular `Array`-s make sure all elements are [0..255].
 *
 * ##### Example
 *
 * ```javascript
 * push(chunk, false); // push one of data chunks
 * ...
 * push(chunk, true);  // push last chunk
 * ```
 **/
Deflate.prototype.push = function (data, mode) {
  var strm = this.strm;
  var chunkSize = this.options.chunkSize;
  var status, _mode;

  if (this.ended) { return false; }

  _mode = (mode === ~~mode) ? mode : ((mode === true) ? Z_FINISH : Z_NO_FLUSH);

  // Convert data if needed
  if (typeof data === 'string') {
    // If we need to compress text, change encoding to utf8.
    strm.input = strings.string2buf(data);
  } else if (toString$1.call(data) === '[object ArrayBuffer]') {
    strm.input = new Uint8Array(data);
  } else {
    strm.input = data;
  }

  strm.next_in = 0;
  strm.avail_in = strm.input.length;

  do {
    if (strm.avail_out === 0) {
      strm.output = new common.Buf8(chunkSize);
      strm.next_out = 0;
      strm.avail_out = chunkSize;
    }
    status = deflate_1$2.deflate(strm, _mode);    /* no bad return value */

    if (status !== Z_STREAM_END && status !== Z_OK) {
      this.onEnd(status);
      this.ended = true;
      return false;
    }
    if (strm.avail_out === 0 || (strm.avail_in === 0 && (_mode === Z_FINISH || _mode === Z_SYNC_FLUSH))) {
      if (this.options.to === 'string') {
        this.onData(strings.buf2binstring(common.shrinkBuf(strm.output, strm.next_out)));
      } else {
        this.onData(common.shrinkBuf(strm.output, strm.next_out));
      }
    }
  } while ((strm.avail_in > 0 || strm.avail_out === 0) && status !== Z_STREAM_END);

  // Finalize on the last chunk.
  if (_mode === Z_FINISH) {
    status = deflate_1$2.deflateEnd(this.strm);
    this.onEnd(status);
    this.ended = true;
    return status === Z_OK;
  }

  // callback interim results if Z_SYNC_FLUSH.
  if (_mode === Z_SYNC_FLUSH) {
    this.onEnd(Z_OK);
    strm.avail_out = 0;
    return true;
  }

  return true;
};


/**
 * Deflate#onData(chunk) -> Void
 * - chunk (Uint8Array|Array|String): ouput data. Type of array depends
 *   on js engine support. When string output requested, each chunk
 *   will be string.
 *
 * By default, stores data blocks in `chunks[]` property and glue
 * those in `onEnd`. Override this handler, if you need another behaviour.
 **/
Deflate.prototype.onData = function (chunk) {
  this.chunks.push(chunk);
};


/**
 * Deflate#onEnd(status) -> Void
 * - status (Number): deflate status. 0 (Z_OK) on success,
 *   other if not.
 *
 * Called once after you tell deflate that the input stream is
 * complete (Z_FINISH) or should be flushed (Z_SYNC_FLUSH)
 * or if an error happened. By default - join collected chunks,
 * free memory and fill `results` / `err` properties.
 **/
Deflate.prototype.onEnd = function (status) {
  // On success - join
  if (status === Z_OK) {
    if (this.options.to === 'string') {
      this.result = this.chunks.join('');
    } else {
      this.result = common.flattenChunks(this.chunks);
    }
  }
  this.chunks = [];
  this.err = status;
  this.msg = this.strm.msg;
};


/**
 * deflate(data[, options]) -> Uint8Array|Array|String
 * - data (Uint8Array|Array|String): input data to compress.
 * - options (Object): zlib deflate options.
 *
 * Compress `data` with deflate algorithm and `options`.
 *
 * Supported options are:
 *
 * - level
 * - windowBits
 * - memLevel
 * - strategy
 * - dictionary
 *
 * [http://zlib.net/manual.html#Advanced](http://zlib.net/manual.html#Advanced)
 * for more information on these.
 *
 * Sugar (options):
 *
 * - `raw` (Boolean) - say that we work with raw stream, if you don't wish to specify
 *   negative windowBits implicitly.
 * - `to` (String) - if equal to 'string', then result will be "binary string"
 *    (each char code [0..255])
 *
 * ##### Example:
 *
 * ```javascript
 * var pako = require('pako')
 *   , data = Uint8Array([1,2,3,4,5,6,7,8,9]);
 *
 * console.log(pako.deflate(data));
 * ```
 **/
function deflate(input, options) {
  var deflator = new Deflate(options);

  deflator.push(input, true);

  // That will never happens, if you don't cheat with options :)
  if (deflator.err) { throw deflator.msg || messages[deflator.err]; }

  return deflator.result;
}


/**
 * deflateRaw(data[, options]) -> Uint8Array|Array|String
 * - data (Uint8Array|Array|String): input data to compress.
 * - options (Object): zlib deflate options.
 *
 * The same as [[deflate]], but creates raw data, without wrapper
 * (header and adler32 crc).
 **/
function deflateRaw(input, options) {
  options = options || {};
  options.raw = true;
  return deflate(input, options);
}


/**
 * gzip(data[, options]) -> Uint8Array|Array|String
 * - data (Uint8Array|Array|String): input data to compress.
 * - options (Object): zlib deflate options.
 *
 * The same as [[deflate]], but create gzip wrapper instead of
 * deflate one.
 **/
function gzip(input, options) {
  options = options || {};
  options.gzip = true;
  return deflate(input, options);
}


var Deflate_1 = Deflate;
var deflate_2 = deflate;
var deflateRaw_1 = deflateRaw;
var gzip_1 = gzip;

var deflate_1 = {
	Deflate: Deflate_1,
	deflate: deflate_2,
	deflateRaw: deflateRaw_1,
	gzip: gzip_1
};

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

// See state defs from inflate.js
var BAD$1 = 30;       /* got a data error -- remain here until reset */
var TYPE$1 = 12;      /* i: waiting for type bits, including last-flag bit */

/*
   Decode literal, length, and distance codes and write out the resulting
   literal and match bytes until either not enough input or output is
   available, an end-of-block is encountered, or a data error is encountered.
   When large enough input and output buffers are supplied to inflate(), for
   example, a 16K input buffer and a 64K output buffer, more than 95% of the
   inflate execution time is spent in this routine.

   Entry assumptions:

        state.mode === LEN
        strm.avail_in >= 6
        strm.avail_out >= 258
        start >= strm.avail_out
        state.bits < 8

   On return, state.mode is one of:

        LEN -- ran out of enough output space or enough available input
        TYPE -- reached end of block code, inflate() to interpret next block
        BAD -- error in block data

   Notes:

    - The maximum input bits used by a length/distance pair is 15 bits for the
      length code, 5 bits for the length extra, 15 bits for the distance code,
      and 13 bits for the distance extra.  This totals 48 bits, or six bytes.
      Therefore if strm.avail_in >= 6, then there is enough input to avoid
      checking for available input while decoding.

    - The maximum bytes that a single length/distance pair can output is 258
      bytes, which is the maximum length that can be coded.  inflate_fast()
      requires strm.avail_out >= 258 for each loop to avoid checking for
      output space.
 */
var inffast = function inflate_fast(strm, start) {
  var state;
  var _in;                    /* local strm.input */
  var last;                   /* have enough input while in < last */
  var _out;                   /* local strm.output */
  var beg;                    /* inflate()'s initial strm.output */
  var end;                    /* while out < end, enough space available */
//#ifdef INFLATE_STRICT
  var dmax;                   /* maximum distance from zlib header */
//#endif
  var wsize;                  /* window size or zero if not using window */
  var whave;                  /* valid bytes in the window */
  var wnext;                  /* window write index */
  // Use `s_window` instead `window`, avoid conflict with instrumentation tools
  var s_window;               /* allocated sliding window, if wsize != 0 */
  var hold;                   /* local strm.hold */
  var bits;                   /* local strm.bits */
  var lcode;                  /* local strm.lencode */
  var dcode;                  /* local strm.distcode */
  var lmask;                  /* mask for first level of length codes */
  var dmask;                  /* mask for first level of distance codes */
  var here;                   /* retrieved table entry */
  var op;                     /* code bits, operation, extra bits, or */
                              /*  window position, window bytes to copy */
  var len;                    /* match length, unused bytes */
  var dist;                   /* match distance */
  var from;                   /* where to copy match from */
  var from_source;


  var input, output; // JS specific, because we have no pointers

  /* copy state to local variables */
  state = strm.state;
  //here = state.here;
  _in = strm.next_in;
  input = strm.input;
  last = _in + (strm.avail_in - 5);
  _out = strm.next_out;
  output = strm.output;
  beg = _out - (start - strm.avail_out);
  end = _out + (strm.avail_out - 257);
//#ifdef INFLATE_STRICT
  dmax = state.dmax;
//#endif
  wsize = state.wsize;
  whave = state.whave;
  wnext = state.wnext;
  s_window = state.window;
  hold = state.hold;
  bits = state.bits;
  lcode = state.lencode;
  dcode = state.distcode;
  lmask = (1 << state.lenbits) - 1;
  dmask = (1 << state.distbits) - 1;


  /* decode literals and length/distances until end-of-block or not enough
     input data or output space */

  top:
  do {
    if (bits < 15) {
      hold += input[_in++] << bits;
      bits += 8;
      hold += input[_in++] << bits;
      bits += 8;
    }

    here = lcode[hold & lmask];

    dolen:
    for (;;) { // Goto emulation
      op = here >>> 24/*here.bits*/;
      hold >>>= op;
      bits -= op;
      op = (here >>> 16) & 0xff/*here.op*/;
      if (op === 0) {                          /* literal */
        //Tracevv((stderr, here.val >= 0x20 && here.val < 0x7f ?
        //        "inflate:         literal '%c'\n" :
        //        "inflate:         literal 0x%02x\n", here.val));
        output[_out++] = here & 0xffff/*here.val*/;
      }
      else if (op & 16) {                     /* length base */
        len = here & 0xffff/*here.val*/;
        op &= 15;                           /* number of extra bits */
        if (op) {
          if (bits < op) {
            hold += input[_in++] << bits;
            bits += 8;
          }
          len += hold & ((1 << op) - 1);
          hold >>>= op;
          bits -= op;
        }
        //Tracevv((stderr, "inflate:         length %u\n", len));
        if (bits < 15) {
          hold += input[_in++] << bits;
          bits += 8;
          hold += input[_in++] << bits;
          bits += 8;
        }
        here = dcode[hold & dmask];

        dodist:
        for (;;) { // goto emulation
          op = here >>> 24/*here.bits*/;
          hold >>>= op;
          bits -= op;
          op = (here >>> 16) & 0xff/*here.op*/;

          if (op & 16) {                      /* distance base */
            dist = here & 0xffff/*here.val*/;
            op &= 15;                       /* number of extra bits */
            if (bits < op) {
              hold += input[_in++] << bits;
              bits += 8;
              if (bits < op) {
                hold += input[_in++] << bits;
                bits += 8;
              }
            }
            dist += hold & ((1 << op) - 1);
//#ifdef INFLATE_STRICT
            if (dist > dmax) {
              strm.msg = 'invalid distance too far back';
              state.mode = BAD$1;
              break top;
            }
//#endif
            hold >>>= op;
            bits -= op;
            //Tracevv((stderr, "inflate:         distance %u\n", dist));
            op = _out - beg;                /* max distance in output */
            if (dist > op) {                /* see if copy from window */
              op = dist - op;               /* distance back in window */
              if (op > whave) {
                if (state.sane) {
                  strm.msg = 'invalid distance too far back';
                  state.mode = BAD$1;
                  break top;
                }

// (!) This block is disabled in zlib defailts,
// don't enable it for binary compatibility
//#ifdef INFLATE_ALLOW_INVALID_DISTANCE_TOOFAR_ARRR
//                if (len <= op - whave) {
//                  do {
//                    output[_out++] = 0;
//                  } while (--len);
//                  continue top;
//                }
//                len -= op - whave;
//                do {
//                  output[_out++] = 0;
//                } while (--op > whave);
//                if (op === 0) {
//                  from = _out - dist;
//                  do {
//                    output[_out++] = output[from++];
//                  } while (--len);
//                  continue top;
//                }
//#endif
              }
              from = 0; // window index
              from_source = s_window;
              if (wnext === 0) {           /* very common case */
                from += wsize - op;
                if (op < len) {         /* some from window */
                  len -= op;
                  do {
                    output[_out++] = s_window[from++];
                  } while (--op);
                  from = _out - dist;  /* rest from output */
                  from_source = output;
                }
              }
              else if (wnext < op) {      /* wrap around window */
                from += wsize + wnext - op;
                op -= wnext;
                if (op < len) {         /* some from end of window */
                  len -= op;
                  do {
                    output[_out++] = s_window[from++];
                  } while (--op);
                  from = 0;
                  if (wnext < len) {  /* some from start of window */
                    op = wnext;
                    len -= op;
                    do {
                      output[_out++] = s_window[from++];
                    } while (--op);
                    from = _out - dist;      /* rest from output */
                    from_source = output;
                  }
                }
              }
              else {                      /* contiguous in window */
                from += wnext - op;
                if (op < len) {         /* some from window */
                  len -= op;
                  do {
                    output[_out++] = s_window[from++];
                  } while (--op);
                  from = _out - dist;  /* rest from output */
                  from_source = output;
                }
              }
              while (len > 2) {
                output[_out++] = from_source[from++];
                output[_out++] = from_source[from++];
                output[_out++] = from_source[from++];
                len -= 3;
              }
              if (len) {
                output[_out++] = from_source[from++];
                if (len > 1) {
                  output[_out++] = from_source[from++];
                }
              }
            }
            else {
              from = _out - dist;          /* copy direct from output */
              do {                        /* minimum length is three */
                output[_out++] = output[from++];
                output[_out++] = output[from++];
                output[_out++] = output[from++];
                len -= 3;
              } while (len > 2);
              if (len) {
                output[_out++] = output[from++];
                if (len > 1) {
                  output[_out++] = output[from++];
                }
              }
            }
          }
          else if ((op & 64) === 0) {          /* 2nd level distance code */
            here = dcode[(here & 0xffff)/*here.val*/ + (hold & ((1 << op) - 1))];
            continue dodist;
          }
          else {
            strm.msg = 'invalid distance code';
            state.mode = BAD$1;
            break top;
          }

          break; // need to emulate goto via "continue"
        }
      }
      else if ((op & 64) === 0) {              /* 2nd level length code */
        here = lcode[(here & 0xffff)/*here.val*/ + (hold & ((1 << op) - 1))];
        continue dolen;
      }
      else if (op & 32) {                     /* end-of-block */
        //Tracevv((stderr, "inflate:         end of block\n"));
        state.mode = TYPE$1;
        break top;
      }
      else {
        strm.msg = 'invalid literal/length code';
        state.mode = BAD$1;
        break top;
      }

      break; // need to emulate goto via "continue"
    }
  } while (_in < last && _out < end);

  /* return unused bytes (on entry, bits < 8, so in won't go too far back) */
  len = bits >> 3;
  _in -= len;
  bits -= len << 3;
  hold &= (1 << bits) - 1;

  /* update state and return */
  strm.next_in = _in;
  strm.next_out = _out;
  strm.avail_in = (_in < last ? 5 + (last - _in) : 5 - (_in - last));
  strm.avail_out = (_out < end ? 257 + (end - _out) : 257 - (_out - end));
  state.hold = hold;
  state.bits = bits;
  return;
};

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.



var MAXBITS = 15;
var ENOUGH_LENS$1 = 852;
var ENOUGH_DISTS$1 = 592;
//var ENOUGH = (ENOUGH_LENS+ENOUGH_DISTS);

var CODES$1 = 0;
var LENS$1 = 1;
var DISTS$1 = 2;

var lbase = [ /* Length codes 257..285 base */
  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31,
  35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0
];

var lext = [ /* Length codes 257..285 extra */
  16, 16, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 18, 18, 18, 18,
  19, 19, 19, 19, 20, 20, 20, 20, 21, 21, 21, 21, 16, 72, 78
];

var dbase = [ /* Distance codes 0..29 base */
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193,
  257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145,
  8193, 12289, 16385, 24577, 0, 0
];

var dext = [ /* Distance codes 0..29 extra */
  16, 16, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22,
  23, 23, 24, 24, 25, 25, 26, 26, 27, 27,
  28, 28, 29, 29, 64, 64
];

var inftrees = function inflate_table(type, lens, lens_index, codes, table, table_index, work, opts)
{
  var bits = opts.bits;
      //here = opts.here; /* table entry for duplication */

  var len = 0;               /* a code's length in bits */
  var sym = 0;               /* index of code symbols */
  var min = 0, max = 0;          /* minimum and maximum code lengths */
  var root = 0;              /* number of index bits for root table */
  var curr = 0;              /* number of index bits for current table */
  var drop = 0;              /* code bits to drop for sub-table */
  var left = 0;                   /* number of prefix codes available */
  var used = 0;              /* code entries in table used */
  var huff = 0;              /* Huffman code */
  var incr;              /* for incrementing code, index */
  var fill;              /* index for replicating entries */
  var low;               /* low bits for current root entry */
  var mask;              /* mask for low root bits */
  var next;             /* next available space in table */
  var base = null;     /* base value table to use */
  var base_index = 0;
//  var shoextra;    /* extra bits table to use */
  var end;                    /* use base and extra for symbol > end */
  var count = new common.Buf16(MAXBITS + 1); //[MAXBITS+1];    /* number of codes of each length */
  var offs = new common.Buf16(MAXBITS + 1); //[MAXBITS+1];     /* offsets in table for each length */
  var extra = null;
  var extra_index = 0;

  var here_bits, here_op, here_val;

  /*
   Process a set of code lengths to create a canonical Huffman code.  The
   code lengths are lens[0..codes-1].  Each length corresponds to the
   symbols 0..codes-1.  The Huffman code is generated by first sorting the
   symbols by length from short to long, and retaining the symbol order
   for codes with equal lengths.  Then the code starts with all zero bits
   for the first code of the shortest length, and the codes are integer
   increments for the same length, and zeros are appended as the length
   increases.  For the deflate format, these bits are stored backwards
   from their more natural integer increment ordering, and so when the
   decoding tables are built in the large loop below, the integer codes
   are incremented backwards.

   This routine assumes, but does not check, that all of the entries in
   lens[] are in the range 0..MAXBITS.  The caller must assure this.
   1..MAXBITS is interpreted as that code length.  zero means that that
   symbol does not occur in this code.

   The codes are sorted by computing a count of codes for each length,
   creating from that a table of starting indices for each length in the
   sorted table, and then entering the symbols in order in the sorted
   table.  The sorted table is work[], with that space being provided by
   the caller.

   The length counts are used for other purposes as well, i.e. finding
   the minimum and maximum length codes, determining if there are any
   codes at all, checking for a valid set of lengths, and looking ahead
   at length counts to determine sub-table sizes when building the
   decoding tables.
   */

  /* accumulate lengths for codes (assumes lens[] all in 0..MAXBITS) */
  for (len = 0; len <= MAXBITS; len++) {
    count[len] = 0;
  }
  for (sym = 0; sym < codes; sym++) {
    count[lens[lens_index + sym]]++;
  }

  /* bound code lengths, force root to be within code lengths */
  root = bits;
  for (max = MAXBITS; max >= 1; max--) {
    if (count[max] !== 0) { break; }
  }
  if (root > max) {
    root = max;
  }
  if (max === 0) {                     /* no symbols to code at all */
    //table.op[opts.table_index] = 64;  //here.op = (var char)64;    /* invalid code marker */
    //table.bits[opts.table_index] = 1;   //here.bits = (var char)1;
    //table.val[opts.table_index++] = 0;   //here.val = (var short)0;
    table[table_index++] = (1 << 24) | (64 << 16) | 0;


    //table.op[opts.table_index] = 64;
    //table.bits[opts.table_index] = 1;
    //table.val[opts.table_index++] = 0;
    table[table_index++] = (1 << 24) | (64 << 16) | 0;

    opts.bits = 1;
    return 0;     /* no symbols, but wait for decoding to report error */
  }
  for (min = 1; min < max; min++) {
    if (count[min] !== 0) { break; }
  }
  if (root < min) {
    root = min;
  }

  /* check for an over-subscribed or incomplete set of lengths */
  left = 1;
  for (len = 1; len <= MAXBITS; len++) {
    left <<= 1;
    left -= count[len];
    if (left < 0) {
      return -1;
    }        /* over-subscribed */
  }
  if (left > 0 && (type === CODES$1 || max !== 1)) {
    return -1;                      /* incomplete set */
  }

  /* generate offsets into symbol table for each length for sorting */
  offs[1] = 0;
  for (len = 1; len < MAXBITS; len++) {
    offs[len + 1] = offs[len] + count[len];
  }

  /* sort symbols by length, by symbol order within each length */
  for (sym = 0; sym < codes; sym++) {
    if (lens[lens_index + sym] !== 0) {
      work[offs[lens[lens_index + sym]]++] = sym;
    }
  }

  /*
   Create and fill in decoding tables.  In this loop, the table being
   filled is at next and has curr index bits.  The code being used is huff
   with length len.  That code is converted to an index by dropping drop
   bits off of the bottom.  For codes where len is less than drop + curr,
   those top drop + curr - len bits are incremented through all values to
   fill the table with replicated entries.

   root is the number of index bits for the root table.  When len exceeds
   root, sub-tables are created pointed to by the root entry with an index
   of the low root bits of huff.  This is saved in low to check for when a
   new sub-table should be started.  drop is zero when the root table is
   being filled, and drop is root when sub-tables are being filled.

   When a new sub-table is needed, it is necessary to look ahead in the
   code lengths to determine what size sub-table is needed.  The length
   counts are used for this, and so count[] is decremented as codes are
   entered in the tables.

   used keeps track of how many table entries have been allocated from the
   provided *table space.  It is checked for LENS and DIST tables against
   the constants ENOUGH_LENS and ENOUGH_DISTS to guard against changes in
   the initial root table size constants.  See the comments in inftrees.h
   for more information.

   sym increments through all symbols, and the loop terminates when
   all codes of length max, i.e. all codes, have been processed.  This
   routine permits incomplete codes, so another loop after this one fills
   in the rest of the decoding tables with invalid code markers.
   */

  /* set up for code type */
  // poor man optimization - use if-else instead of switch,
  // to avoid deopts in old v8
  if (type === CODES$1) {
    base = extra = work;    /* dummy value--not used */
    end = 19;

  } else if (type === LENS$1) {
    base = lbase;
    base_index -= 257;
    extra = lext;
    extra_index -= 257;
    end = 256;

  } else {                    /* DISTS */
    base = dbase;
    extra = dext;
    end = -1;
  }

  /* initialize opts for loop */
  huff = 0;                   /* starting code */
  sym = 0;                    /* starting code symbol */
  len = min;                  /* starting code length */
  next = table_index;              /* current table to fill in */
  curr = root;                /* current table index bits */
  drop = 0;                   /* current bits to drop from code for index */
  low = -1;                   /* trigger new sub-table when len > root */
  used = 1 << root;          /* use root table entries */
  mask = used - 1;            /* mask for comparing low */

  /* check available table space */
  if ((type === LENS$1 && used > ENOUGH_LENS$1) ||
    (type === DISTS$1 && used > ENOUGH_DISTS$1)) {
    return 1;
  }

  /* process all codes and make table entries */
  for (;;) {
    /* create table entry */
    here_bits = len - drop;
    if (work[sym] < end) {
      here_op = 0;
      here_val = work[sym];
    }
    else if (work[sym] > end) {
      here_op = extra[extra_index + work[sym]];
      here_val = base[base_index + work[sym]];
    }
    else {
      here_op = 32 + 64;         /* end of block */
      here_val = 0;
    }

    /* replicate for those indices with low len bits equal to huff */
    incr = 1 << (len - drop);
    fill = 1 << curr;
    min = fill;                 /* save offset to next table */
    do {
      fill -= incr;
      table[next + (huff >> drop) + fill] = (here_bits << 24) | (here_op << 16) | here_val |0;
    } while (fill !== 0);

    /* backwards increment the len-bit code huff */
    incr = 1 << (len - 1);
    while (huff & incr) {
      incr >>= 1;
    }
    if (incr !== 0) {
      huff &= incr - 1;
      huff += incr;
    } else {
      huff = 0;
    }

    /* go to next symbol, update count, len */
    sym++;
    if (--count[len] === 0) {
      if (len === max) { break; }
      len = lens[lens_index + work[sym]];
    }

    /* create new sub-table if needed */
    if (len > root && (huff & mask) !== low) {
      /* if first time, transition to sub-tables */
      if (drop === 0) {
        drop = root;
      }

      /* increment past last table */
      next += min;            /* here min is 1 << curr */

      /* determine length of next table */
      curr = len - drop;
      left = 1 << curr;
      while (curr + drop < max) {
        left -= count[curr + drop];
        if (left <= 0) { break; }
        curr++;
        left <<= 1;
      }

      /* check for enough space */
      used += 1 << curr;
      if ((type === LENS$1 && used > ENOUGH_LENS$1) ||
        (type === DISTS$1 && used > ENOUGH_DISTS$1)) {
        return 1;
      }

      /* point entry in root table to sub-table */
      low = huff & mask;
      /*table.op[low] = curr;
      table.bits[low] = root;
      table.val[low] = next - opts.table_index;*/
      table[low] = (root << 24) | (curr << 16) | (next - table_index) |0;
    }
  }

  /* fill in remaining table entry if code is incomplete (guaranteed to have
   at most one remaining entry, since if the code is incomplete, the
   maximum code length that was allowed to get this far is one bit) */
  if (huff !== 0) {
    //table.op[next + huff] = 64;            /* invalid code marker */
    //table.bits[next + huff] = len - drop;
    //table.val[next + huff] = 0;
    table[next + huff] = ((len - drop) << 24) | (64 << 16) |0;
  }

  /* set return parameters */
  //opts.table_index += used;
  opts.bits = root;
  return 0;
};

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.







var CODES = 0;
var LENS = 1;
var DISTS = 2;

/* Public constants ==========================================================*/
/* ===========================================================================*/


/* Allowed flush values; see deflate() and inflate() below for details */
//var Z_NO_FLUSH      = 0;
//var Z_PARTIAL_FLUSH = 1;
//var Z_SYNC_FLUSH    = 2;
//var Z_FULL_FLUSH    = 3;
var Z_FINISH$2        = 4;
var Z_BLOCK$1         = 5;
var Z_TREES         = 6;


/* Return codes for the compression/decompression functions. Negative values
 * are errors, positive values are used for special but normal events.
 */
var Z_OK$2            = 0;
var Z_STREAM_END$2    = 1;
var Z_NEED_DICT     = 2;
//var Z_ERRNO         = -1;
var Z_STREAM_ERROR$1  = -2;
var Z_DATA_ERROR$1    = -3;
var Z_MEM_ERROR     = -4;
var Z_BUF_ERROR$1     = -5;
//var Z_VERSION_ERROR = -6;

/* The deflate compression method */
var Z_DEFLATED$2  = 8;


/* STATES ====================================================================*/
/* ===========================================================================*/


var HEAD = 1;       /* i: waiting for magic header */
var FLAGS = 2;      /* i: waiting for method and flags (gzip) */
var TIME = 3;       /* i: waiting for modification time (gzip) */
var OS = 4;         /* i: waiting for extra flags and operating system (gzip) */
var EXLEN = 5;      /* i: waiting for extra length (gzip) */
var EXTRA = 6;      /* i: waiting for extra bytes (gzip) */
var NAME = 7;       /* i: waiting for end of file name (gzip) */
var COMMENT = 8;    /* i: waiting for end of comment (gzip) */
var HCRC = 9;       /* i: waiting for header crc (gzip) */
var DICTID = 10;    /* i: waiting for dictionary check value */
var DICT = 11;      /* waiting for inflateSetDictionary() call */
var TYPE = 12;      /* i: waiting for type bits, including last-flag bit */
var TYPEDO = 13;    /* i: same, but skip check to exit inflate on new block */
var STORED = 14;    /* i: waiting for stored size (length and complement) */
var COPY_ = 15;     /* i/o: same as COPY below, but only first time in */
var COPY = 16;      /* i/o: waiting for input or output to copy stored block */
var TABLE = 17;     /* i: waiting for dynamic block table lengths */
var LENLENS = 18;   /* i: waiting for code length code lengths */
var CODELENS = 19;  /* i: waiting for length/lit and distance code lengths */
var LEN_ = 20;      /* i: same as LEN below, but only first time in */
var LEN = 21;       /* i: waiting for length/lit/eob code */
var LENEXT = 22;    /* i: waiting for length extra bits */
var DIST = 23;      /* i: waiting for distance code */
var DISTEXT = 24;   /* i: waiting for distance extra bits */
var MATCH = 25;     /* o: waiting for output space to copy string */
var LIT = 26;       /* o: waiting for output space to write literal */
var CHECK = 27;     /* i: waiting for 32-bit check value */
var LENGTH = 28;    /* i: waiting for 32-bit length (gzip) */
var DONE = 29;      /* finished check, done -- remain here until reset */
var BAD = 30;       /* got a data error -- remain here until reset */
var MEM = 31;       /* got an inflate() memory error -- remain here until reset */
var SYNC = 32;      /* looking for synchronization bytes to restart inflate() */

/* ===========================================================================*/



var ENOUGH_LENS = 852;
var ENOUGH_DISTS = 592;
//var ENOUGH =  (ENOUGH_LENS+ENOUGH_DISTS);

var MAX_WBITS$1 = 15;
/* 32K LZ77 window */
var DEF_WBITS = MAX_WBITS$1;


function zswap32(q) {
  return  (((q >>> 24) & 0xff) +
          ((q >>> 8) & 0xff00) +
          ((q & 0xff00) << 8) +
          ((q & 0xff) << 24));
}


function InflateState() {
  this.mode = 0;             /* current inflate mode */
  this.last = false;          /* true if processing last block */
  this.wrap = 0;              /* bit 0 true for zlib, bit 1 true for gzip */
  this.havedict = false;      /* true if dictionary provided */
  this.flags = 0;             /* gzip header method and flags (0 if zlib) */
  this.dmax = 0;              /* zlib header max distance (INFLATE_STRICT) */
  this.check = 0;             /* protected copy of check value */
  this.total = 0;             /* protected copy of output count */
  // TODO: may be {}
  this.head = null;           /* where to save gzip header information */

  /* sliding window */
  this.wbits = 0;             /* log base 2 of requested window size */
  this.wsize = 0;             /* window size or zero if not using window */
  this.whave = 0;             /* valid bytes in the window */
  this.wnext = 0;             /* window write index */
  this.window = null;         /* allocated sliding window, if needed */

  /* bit accumulator */
  this.hold = 0;              /* input bit accumulator */
  this.bits = 0;              /* number of bits in "in" */

  /* for string and stored block copying */
  this.length = 0;            /* literal or length of data to copy */
  this.offset = 0;            /* distance back to copy string from */

  /* for table and code decoding */
  this.extra = 0;             /* extra bits needed */

  /* fixed and dynamic code tables */
  this.lencode = null;          /* starting table for length/literal codes */
  this.distcode = null;         /* starting table for distance codes */
  this.lenbits = 0;           /* index bits for lencode */
  this.distbits = 0;          /* index bits for distcode */

  /* dynamic table building */
  this.ncode = 0;             /* number of code length code lengths */
  this.nlen = 0;              /* number of length code lengths */
  this.ndist = 0;             /* number of distance code lengths */
  this.have = 0;              /* number of code lengths in lens[] */
  this.next = null;              /* next available space in codes[] */

  this.lens = new common.Buf16(320); /* temporary storage for code lengths */
  this.work = new common.Buf16(288); /* work area for code table building */

  /*
   because we don't have pointers in js, we use lencode and distcode directly
   as buffers so we don't need codes
  */
  //this.codes = new utils.Buf32(ENOUGH);       /* space for code tables */
  this.lendyn = null;              /* dynamic table for length/literal codes (JS specific) */
  this.distdyn = null;             /* dynamic table for distance codes (JS specific) */
  this.sane = 0;                   /* if false, allow invalid distance too far */
  this.back = 0;                   /* bits back of last unprocessed length/lit */
  this.was = 0;                    /* initial length of match */
}

function inflateResetKeep(strm) {
  var state;

  if (!strm || !strm.state) { return Z_STREAM_ERROR$1; }
  state = strm.state;
  strm.total_in = strm.total_out = state.total = 0;
  strm.msg = ''; /*Z_NULL*/
  if (state.wrap) {       /* to support ill-conceived Java test suite */
    strm.adler = state.wrap & 1;
  }
  state.mode = HEAD;
  state.last = 0;
  state.havedict = 0;
  state.dmax = 32768;
  state.head = null/*Z_NULL*/;
  state.hold = 0;
  state.bits = 0;
  //state.lencode = state.distcode = state.next = state.codes;
  state.lencode = state.lendyn = new common.Buf32(ENOUGH_LENS);
  state.distcode = state.distdyn = new common.Buf32(ENOUGH_DISTS);

  state.sane = 1;
  state.back = -1;
  //Tracev((stderr, "inflate: reset\n"));
  return Z_OK$2;
}

function inflateReset(strm) {
  var state;

  if (!strm || !strm.state) { return Z_STREAM_ERROR$1; }
  state = strm.state;
  state.wsize = 0;
  state.whave = 0;
  state.wnext = 0;
  return inflateResetKeep(strm);

}

function inflateReset2(strm, windowBits) {
  var wrap;
  var state;

  /* get the state */
  if (!strm || !strm.state) { return Z_STREAM_ERROR$1; }
  state = strm.state;

  /* extract wrap request from windowBits parameter */
  if (windowBits < 0) {
    wrap = 0;
    windowBits = -windowBits;
  }
  else {
    wrap = (windowBits >> 4) + 1;
    if (windowBits < 48) {
      windowBits &= 15;
    }
  }

  /* set number of window bits, free window if different */
  if (windowBits && (windowBits < 8 || windowBits > 15)) {
    return Z_STREAM_ERROR$1;
  }
  if (state.window !== null && state.wbits !== windowBits) {
    state.window = null;
  }

  /* update state and reset the rest of it */
  state.wrap = wrap;
  state.wbits = windowBits;
  return inflateReset(strm);
}

function inflateInit2(strm, windowBits) {
  var ret;
  var state;

  if (!strm) { return Z_STREAM_ERROR$1; }
  //strm.msg = Z_NULL;                 /* in case we return an error */

  state = new InflateState();

  //if (state === Z_NULL) return Z_MEM_ERROR;
  //Tracev((stderr, "inflate: allocated\n"));
  strm.state = state;
  state.window = null/*Z_NULL*/;
  ret = inflateReset2(strm, windowBits);
  if (ret !== Z_OK$2) {
    strm.state = null/*Z_NULL*/;
  }
  return ret;
}

function inflateInit(strm) {
  return inflateInit2(strm, DEF_WBITS);
}


/*
 Return state with length and distance decoding tables and index sizes set to
 fixed code decoding.  Normally this returns fixed tables from inffixed.h.
 If BUILDFIXED is defined, then instead this routine builds the tables the
 first time it's called, and returns those tables the first time and
 thereafter.  This reduces the size of the code by about 2K bytes, in
 exchange for a little execution time.  However, BUILDFIXED should not be
 used for threaded applications, since the rewriting of the tables and virgin
 may not be thread-safe.
 */
var virgin = true;

var lenfix;
var distfix; // We have no pointers in JS, so keep tables separate

function fixedtables(state) {
  /* build fixed huffman tables if first call (may not be thread safe) */
  if (virgin) {
    var sym;

    lenfix = new common.Buf32(512);
    distfix = new common.Buf32(32);

    /* literal/length table */
    sym = 0;
    while (sym < 144) { state.lens[sym++] = 8; }
    while (sym < 256) { state.lens[sym++] = 9; }
    while (sym < 280) { state.lens[sym++] = 7; }
    while (sym < 288) { state.lens[sym++] = 8; }

    inftrees(LENS,  state.lens, 0, 288, lenfix,   0, state.work, { bits: 9 });

    /* distance table */
    sym = 0;
    while (sym < 32) { state.lens[sym++] = 5; }

    inftrees(DISTS, state.lens, 0, 32,   distfix, 0, state.work, { bits: 5 });

    /* do this just once */
    virgin = false;
  }

  state.lencode = lenfix;
  state.lenbits = 9;
  state.distcode = distfix;
  state.distbits = 5;
}


/*
 Update the window with the last wsize (normally 32K) bytes written before
 returning.  If window does not exist yet, create it.  This is only called
 when a window is already in use, or when output has been written during this
 inflate call, but the end of the deflate stream has not been reached yet.
 It is also called to create a window for dictionary data when a dictionary
 is loaded.

 Providing output buffers larger than 32K to inflate() should provide a speed
 advantage, since only the last 32K of output is copied to the sliding window
 upon return from inflate(), and since all distances after the first 32K of
 output will fall in the output data, making match copies simpler and faster.
 The advantage may be dependent on the size of the processor's data caches.
 */
function updatewindow(strm, src, end, copy) {
  var dist;
  var state = strm.state;

  /* if it hasn't been done already, allocate space for the window */
  if (state.window === null) {
    state.wsize = 1 << state.wbits;
    state.wnext = 0;
    state.whave = 0;

    state.window = new common.Buf8(state.wsize);
  }

  /* copy state->wsize or less output bytes into the circular window */
  if (copy >= state.wsize) {
    common.arraySet(state.window, src, end - state.wsize, state.wsize, 0);
    state.wnext = 0;
    state.whave = state.wsize;
  }
  else {
    dist = state.wsize - state.wnext;
    if (dist > copy) {
      dist = copy;
    }
    //zmemcpy(state->window + state->wnext, end - copy, dist);
    common.arraySet(state.window, src, end - copy, dist, state.wnext);
    copy -= dist;
    if (copy) {
      //zmemcpy(state->window, end - copy, copy);
      common.arraySet(state.window, src, end - copy, copy, 0);
      state.wnext = copy;
      state.whave = state.wsize;
    }
    else {
      state.wnext += dist;
      if (state.wnext === state.wsize) { state.wnext = 0; }
      if (state.whave < state.wsize) { state.whave += dist; }
    }
  }
  return 0;
}

function inflate$1(strm, flush) {
  var state;
  var input, output;          // input/output buffers
  var next;                   /* next input INDEX */
  var put;                    /* next output INDEX */
  var have, left;             /* available input and output */
  var hold;                   /* bit buffer */
  var bits;                   /* bits in bit buffer */
  var _in, _out;              /* save starting available input and output */
  var copy;                   /* number of stored or match bytes to copy */
  var from;                   /* where to copy match bytes from */
  var from_source;
  var here = 0;               /* current decoding table entry */
  var here_bits, here_op, here_val; // paked "here" denormalized (JS specific)
  //var last;                   /* parent table entry */
  var last_bits, last_op, last_val; // paked "last" denormalized (JS specific)
  var len;                    /* length to copy for repeats, bits to drop */
  var ret;                    /* return code */
  var hbuf = new common.Buf8(4);    /* buffer for gzip header crc calculation */
  var opts;

  var n; // temporary var for NEED_BITS

  var order = /* permutation of code lengths */
    [ 16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15 ];


  if (!strm || !strm.state || !strm.output ||
      (!strm.input && strm.avail_in !== 0)) {
    return Z_STREAM_ERROR$1;
  }

  state = strm.state;
  if (state.mode === TYPE) { state.mode = TYPEDO; }    /* skip check */


  //--- LOAD() ---
  put = strm.next_out;
  output = strm.output;
  left = strm.avail_out;
  next = strm.next_in;
  input = strm.input;
  have = strm.avail_in;
  hold = state.hold;
  bits = state.bits;
  //---

  _in = have;
  _out = left;
  ret = Z_OK$2;

  inf_leave: // goto emulation
  for (;;) {
    switch (state.mode) {
    case HEAD:
      if (state.wrap === 0) {
        state.mode = TYPEDO;
        break;
      }
      //=== NEEDBITS(16);
      while (bits < 16) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      //===//
      if ((state.wrap & 2) && hold === 0x8b1f) {  /* gzip header */
        state.check = 0/*crc32(0L, Z_NULL, 0)*/;
        //=== CRC2(state.check, hold);
        hbuf[0] = hold & 0xff;
        hbuf[1] = (hold >>> 8) & 0xff;
        state.check = crc32_1(state.check, hbuf, 2, 0);
        //===//

        //=== INITBITS();
        hold = 0;
        bits = 0;
        //===//
        state.mode = FLAGS;
        break;
      }
      state.flags = 0;           /* expect zlib header */
      if (state.head) {
        state.head.done = false;
      }
      if (!(state.wrap & 1) ||   /* check if zlib header allowed */
        (((hold & 0xff)/*BITS(8)*/ << 8) + (hold >> 8)) % 31) {
        strm.msg = 'incorrect header check';
        state.mode = BAD;
        break;
      }
      if ((hold & 0x0f)/*BITS(4)*/ !== Z_DEFLATED$2) {
        strm.msg = 'unknown compression method';
        state.mode = BAD;
        break;
      }
      //--- DROPBITS(4) ---//
      hold >>>= 4;
      bits -= 4;
      //---//
      len = (hold & 0x0f)/*BITS(4)*/ + 8;
      if (state.wbits === 0) {
        state.wbits = len;
      }
      else if (len > state.wbits) {
        strm.msg = 'invalid window size';
        state.mode = BAD;
        break;
      }
      state.dmax = 1 << len;
      //Tracev((stderr, "inflate:   zlib header ok\n"));
      strm.adler = state.check = 1/*adler32(0L, Z_NULL, 0)*/;
      state.mode = hold & 0x200 ? DICTID : TYPE;
      //=== INITBITS();
      hold = 0;
      bits = 0;
      //===//
      break;
    case FLAGS:
      //=== NEEDBITS(16); */
      while (bits < 16) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      //===//
      state.flags = hold;
      if ((state.flags & 0xff) !== Z_DEFLATED$2) {
        strm.msg = 'unknown compression method';
        state.mode = BAD;
        break;
      }
      if (state.flags & 0xe000) {
        strm.msg = 'unknown header flags set';
        state.mode = BAD;
        break;
      }
      if (state.head) {
        state.head.text = ((hold >> 8) & 1);
      }
      if (state.flags & 0x0200) {
        //=== CRC2(state.check, hold);
        hbuf[0] = hold & 0xff;
        hbuf[1] = (hold >>> 8) & 0xff;
        state.check = crc32_1(state.check, hbuf, 2, 0);
        //===//
      }
      //=== INITBITS();
      hold = 0;
      bits = 0;
      //===//
      state.mode = TIME;
      /* falls through */
    case TIME:
      //=== NEEDBITS(32); */
      while (bits < 32) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      //===//
      if (state.head) {
        state.head.time = hold;
      }
      if (state.flags & 0x0200) {
        //=== CRC4(state.check, hold)
        hbuf[0] = hold & 0xff;
        hbuf[1] = (hold >>> 8) & 0xff;
        hbuf[2] = (hold >>> 16) & 0xff;
        hbuf[3] = (hold >>> 24) & 0xff;
        state.check = crc32_1(state.check, hbuf, 4, 0);
        //===
      }
      //=== INITBITS();
      hold = 0;
      bits = 0;
      //===//
      state.mode = OS;
      /* falls through */
    case OS:
      //=== NEEDBITS(16); */
      while (bits < 16) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      //===//
      if (state.head) {
        state.head.xflags = (hold & 0xff);
        state.head.os = (hold >> 8);
      }
      if (state.flags & 0x0200) {
        //=== CRC2(state.check, hold);
        hbuf[0] = hold & 0xff;
        hbuf[1] = (hold >>> 8) & 0xff;
        state.check = crc32_1(state.check, hbuf, 2, 0);
        //===//
      }
      //=== INITBITS();
      hold = 0;
      bits = 0;
      //===//
      state.mode = EXLEN;
      /* falls through */
    case EXLEN:
      if (state.flags & 0x0400) {
        //=== NEEDBITS(16); */
        while (bits < 16) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        state.length = hold;
        if (state.head) {
          state.head.extra_len = hold;
        }
        if (state.flags & 0x0200) {
          //=== CRC2(state.check, hold);
          hbuf[0] = hold & 0xff;
          hbuf[1] = (hold >>> 8) & 0xff;
          state.check = crc32_1(state.check, hbuf, 2, 0);
          //===//
        }
        //=== INITBITS();
        hold = 0;
        bits = 0;
        //===//
      }
      else if (state.head) {
        state.head.extra = null/*Z_NULL*/;
      }
      state.mode = EXTRA;
      /* falls through */
    case EXTRA:
      if (state.flags & 0x0400) {
        copy = state.length;
        if (copy > have) { copy = have; }
        if (copy) {
          if (state.head) {
            len = state.head.extra_len - state.length;
            if (!state.head.extra) {
              // Use untyped array for more conveniend processing later
              state.head.extra = new Array(state.head.extra_len);
            }
            common.arraySet(
              state.head.extra,
              input,
              next,
              // extra field is limited to 65536 bytes
              // - no need for additional size check
              copy,
              /*len + copy > state.head.extra_max - len ? state.head.extra_max : copy,*/
              len
            );
            //zmemcpy(state.head.extra + len, next,
            //        len + copy > state.head.extra_max ?
            //        state.head.extra_max - len : copy);
          }
          if (state.flags & 0x0200) {
            state.check = crc32_1(state.check, input, copy, next);
          }
          have -= copy;
          next += copy;
          state.length -= copy;
        }
        if (state.length) { break inf_leave; }
      }
      state.length = 0;
      state.mode = NAME;
      /* falls through */
    case NAME:
      if (state.flags & 0x0800) {
        if (have === 0) { break inf_leave; }
        copy = 0;
        do {
          // TODO: 2 or 1 bytes?
          len = input[next + copy++];
          /* use constant limit because in js we should not preallocate memory */
          if (state.head && len &&
              (state.length < 65536 /*state.head.name_max*/)) {
            state.head.name += String.fromCharCode(len);
          }
        } while (len && copy < have);

        if (state.flags & 0x0200) {
          state.check = crc32_1(state.check, input, copy, next);
        }
        have -= copy;
        next += copy;
        if (len) { break inf_leave; }
      }
      else if (state.head) {
        state.head.name = null;
      }
      state.length = 0;
      state.mode = COMMENT;
      /* falls through */
    case COMMENT:
      if (state.flags & 0x1000) {
        if (have === 0) { break inf_leave; }
        copy = 0;
        do {
          len = input[next + copy++];
          /* use constant limit because in js we should not preallocate memory */
          if (state.head && len &&
              (state.length < 65536 /*state.head.comm_max*/)) {
            state.head.comment += String.fromCharCode(len);
          }
        } while (len && copy < have);
        if (state.flags & 0x0200) {
          state.check = crc32_1(state.check, input, copy, next);
        }
        have -= copy;
        next += copy;
        if (len) { break inf_leave; }
      }
      else if (state.head) {
        state.head.comment = null;
      }
      state.mode = HCRC;
      /* falls through */
    case HCRC:
      if (state.flags & 0x0200) {
        //=== NEEDBITS(16); */
        while (bits < 16) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        if (hold !== (state.check & 0xffff)) {
          strm.msg = 'header crc mismatch';
          state.mode = BAD;
          break;
        }
        //=== INITBITS();
        hold = 0;
        bits = 0;
        //===//
      }
      if (state.head) {
        state.head.hcrc = ((state.flags >> 9) & 1);
        state.head.done = true;
      }
      strm.adler = state.check = 0;
      state.mode = TYPE;
      break;
    case DICTID:
      //=== NEEDBITS(32); */
      while (bits < 32) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      //===//
      strm.adler = state.check = zswap32(hold);
      //=== INITBITS();
      hold = 0;
      bits = 0;
      //===//
      state.mode = DICT;
      /* falls through */
    case DICT:
      if (state.havedict === 0) {
        //--- RESTORE() ---
        strm.next_out = put;
        strm.avail_out = left;
        strm.next_in = next;
        strm.avail_in = have;
        state.hold = hold;
        state.bits = bits;
        //---
        return Z_NEED_DICT;
      }
      strm.adler = state.check = 1/*adler32(0L, Z_NULL, 0)*/;
      state.mode = TYPE;
      /* falls through */
    case TYPE:
      if (flush === Z_BLOCK$1 || flush === Z_TREES) { break inf_leave; }
      /* falls through */
    case TYPEDO:
      if (state.last) {
        //--- BYTEBITS() ---//
        hold >>>= bits & 7;
        bits -= bits & 7;
        //---//
        state.mode = CHECK;
        break;
      }
      //=== NEEDBITS(3); */
      while (bits < 3) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      //===//
      state.last = (hold & 0x01)/*BITS(1)*/;
      //--- DROPBITS(1) ---//
      hold >>>= 1;
      bits -= 1;
      //---//

      switch ((hold & 0x03)/*BITS(2)*/) {
      case 0:                             /* stored block */
        //Tracev((stderr, "inflate:     stored block%s\n",
        //        state.last ? " (last)" : ""));
        state.mode = STORED;
        break;
      case 1:                             /* fixed block */
        fixedtables(state);
        //Tracev((stderr, "inflate:     fixed codes block%s\n",
        //        state.last ? " (last)" : ""));
        state.mode = LEN_;             /* decode codes */
        if (flush === Z_TREES) {
          //--- DROPBITS(2) ---//
          hold >>>= 2;
          bits -= 2;
          //---//
          break inf_leave;
        }
        break;
      case 2:                             /* dynamic block */
        //Tracev((stderr, "inflate:     dynamic codes block%s\n",
        //        state.last ? " (last)" : ""));
        state.mode = TABLE;
        break;
      case 3:
        strm.msg = 'invalid block type';
        state.mode = BAD;
      }
      //--- DROPBITS(2) ---//
      hold >>>= 2;
      bits -= 2;
      //---//
      break;
    case STORED:
      //--- BYTEBITS() ---// /* go to byte boundary */
      hold >>>= bits & 7;
      bits -= bits & 7;
      //---//
      //=== NEEDBITS(32); */
      while (bits < 32) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      //===//
      if ((hold & 0xffff) !== ((hold >>> 16) ^ 0xffff)) {
        strm.msg = 'invalid stored block lengths';
        state.mode = BAD;
        break;
      }
      state.length = hold & 0xffff;
      //Tracev((stderr, "inflate:       stored length %u\n",
      //        state.length));
      //=== INITBITS();
      hold = 0;
      bits = 0;
      //===//
      state.mode = COPY_;
      if (flush === Z_TREES) { break inf_leave; }
      /* falls through */
    case COPY_:
      state.mode = COPY;
      /* falls through */
    case COPY:
      copy = state.length;
      if (copy) {
        if (copy > have) { copy = have; }
        if (copy > left) { copy = left; }
        if (copy === 0) { break inf_leave; }
        //--- zmemcpy(put, next, copy); ---
        common.arraySet(output, input, next, copy, put);
        //---//
        have -= copy;
        next += copy;
        left -= copy;
        put += copy;
        state.length -= copy;
        break;
      }
      //Tracev((stderr, "inflate:       stored end\n"));
      state.mode = TYPE;
      break;
    case TABLE:
      //=== NEEDBITS(14); */
      while (bits < 14) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      //===//
      state.nlen = (hold & 0x1f)/*BITS(5)*/ + 257;
      //--- DROPBITS(5) ---//
      hold >>>= 5;
      bits -= 5;
      //---//
      state.ndist = (hold & 0x1f)/*BITS(5)*/ + 1;
      //--- DROPBITS(5) ---//
      hold >>>= 5;
      bits -= 5;
      //---//
      state.ncode = (hold & 0x0f)/*BITS(4)*/ + 4;
      //--- DROPBITS(4) ---//
      hold >>>= 4;
      bits -= 4;
      //---//
//#ifndef PKZIP_BUG_WORKAROUND
      if (state.nlen > 286 || state.ndist > 30) {
        strm.msg = 'too many length or distance symbols';
        state.mode = BAD;
        break;
      }
//#endif
      //Tracev((stderr, "inflate:       table sizes ok\n"));
      state.have = 0;
      state.mode = LENLENS;
      /* falls through */
    case LENLENS:
      while (state.have < state.ncode) {
        //=== NEEDBITS(3);
        while (bits < 3) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        state.lens[order[state.have++]] = (hold & 0x07);//BITS(3);
        //--- DROPBITS(3) ---//
        hold >>>= 3;
        bits -= 3;
        //---//
      }
      while (state.have < 19) {
        state.lens[order[state.have++]] = 0;
      }
      // We have separate tables & no pointers. 2 commented lines below not needed.
      //state.next = state.codes;
      //state.lencode = state.next;
      // Switch to use dynamic table
      state.lencode = state.lendyn;
      state.lenbits = 7;

      opts = { bits: state.lenbits };
      ret = inftrees(CODES, state.lens, 0, 19, state.lencode, 0, state.work, opts);
      state.lenbits = opts.bits;

      if (ret) {
        strm.msg = 'invalid code lengths set';
        state.mode = BAD;
        break;
      }
      //Tracev((stderr, "inflate:       code lengths ok\n"));
      state.have = 0;
      state.mode = CODELENS;
      /* falls through */
    case CODELENS:
      while (state.have < state.nlen + state.ndist) {
        for (;;) {
          here = state.lencode[hold & ((1 << state.lenbits) - 1)];/*BITS(state.lenbits)*/
          here_bits = here >>> 24;
          here_op = (here >>> 16) & 0xff;
          here_val = here & 0xffff;

          if ((here_bits) <= bits) { break; }
          //--- PULLBYTE() ---//
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
          //---//
        }
        if (here_val < 16) {
          //--- DROPBITS(here.bits) ---//
          hold >>>= here_bits;
          bits -= here_bits;
          //---//
          state.lens[state.have++] = here_val;
        }
        else {
          if (here_val === 16) {
            //=== NEEDBITS(here.bits + 2);
            n = here_bits + 2;
            while (bits < n) {
              if (have === 0) { break inf_leave; }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            //===//
            //--- DROPBITS(here.bits) ---//
            hold >>>= here_bits;
            bits -= here_bits;
            //---//
            if (state.have === 0) {
              strm.msg = 'invalid bit length repeat';
              state.mode = BAD;
              break;
            }
            len = state.lens[state.have - 1];
            copy = 3 + (hold & 0x03);//BITS(2);
            //--- DROPBITS(2) ---//
            hold >>>= 2;
            bits -= 2;
            //---//
          }
          else if (here_val === 17) {
            //=== NEEDBITS(here.bits + 3);
            n = here_bits + 3;
            while (bits < n) {
              if (have === 0) { break inf_leave; }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            //===//
            //--- DROPBITS(here.bits) ---//
            hold >>>= here_bits;
            bits -= here_bits;
            //---//
            len = 0;
            copy = 3 + (hold & 0x07);//BITS(3);
            //--- DROPBITS(3) ---//
            hold >>>= 3;
            bits -= 3;
            //---//
          }
          else {
            //=== NEEDBITS(here.bits + 7);
            n = here_bits + 7;
            while (bits < n) {
              if (have === 0) { break inf_leave; }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            //===//
            //--- DROPBITS(here.bits) ---//
            hold >>>= here_bits;
            bits -= here_bits;
            //---//
            len = 0;
            copy = 11 + (hold & 0x7f);//BITS(7);
            //--- DROPBITS(7) ---//
            hold >>>= 7;
            bits -= 7;
            //---//
          }
          if (state.have + copy > state.nlen + state.ndist) {
            strm.msg = 'invalid bit length repeat';
            state.mode = BAD;
            break;
          }
          while (copy--) {
            state.lens[state.have++] = len;
          }
        }
      }

      /* handle error breaks in while */
      if (state.mode === BAD) { break; }

      /* check for end-of-block code (better have one) */
      if (state.lens[256] === 0) {
        strm.msg = 'invalid code -- missing end-of-block';
        state.mode = BAD;
        break;
      }

      /* build code tables -- note: do not change the lenbits or distbits
         values here (9 and 6) without reading the comments in inftrees.h
         concerning the ENOUGH constants, which depend on those values */
      state.lenbits = 9;

      opts = { bits: state.lenbits };
      ret = inftrees(LENS, state.lens, 0, state.nlen, state.lencode, 0, state.work, opts);
      // We have separate tables & no pointers. 2 commented lines below not needed.
      // state.next_index = opts.table_index;
      state.lenbits = opts.bits;
      // state.lencode = state.next;

      if (ret) {
        strm.msg = 'invalid literal/lengths set';
        state.mode = BAD;
        break;
      }

      state.distbits = 6;
      //state.distcode.copy(state.codes);
      // Switch to use dynamic table
      state.distcode = state.distdyn;
      opts = { bits: state.distbits };
      ret = inftrees(DISTS, state.lens, state.nlen, state.ndist, state.distcode, 0, state.work, opts);
      // We have separate tables & no pointers. 2 commented lines below not needed.
      // state.next_index = opts.table_index;
      state.distbits = opts.bits;
      // state.distcode = state.next;

      if (ret) {
        strm.msg = 'invalid distances set';
        state.mode = BAD;
        break;
      }
      //Tracev((stderr, 'inflate:       codes ok\n'));
      state.mode = LEN_;
      if (flush === Z_TREES) { break inf_leave; }
      /* falls through */
    case LEN_:
      state.mode = LEN;
      /* falls through */
    case LEN:
      if (have >= 6 && left >= 258) {
        //--- RESTORE() ---
        strm.next_out = put;
        strm.avail_out = left;
        strm.next_in = next;
        strm.avail_in = have;
        state.hold = hold;
        state.bits = bits;
        //---
        inffast(strm, _out);
        //--- LOAD() ---
        put = strm.next_out;
        output = strm.output;
        left = strm.avail_out;
        next = strm.next_in;
        input = strm.input;
        have = strm.avail_in;
        hold = state.hold;
        bits = state.bits;
        //---

        if (state.mode === TYPE) {
          state.back = -1;
        }
        break;
      }
      state.back = 0;
      for (;;) {
        here = state.lencode[hold & ((1 << state.lenbits) - 1)];  /*BITS(state.lenbits)*/
        here_bits = here >>> 24;
        here_op = (here >>> 16) & 0xff;
        here_val = here & 0xffff;

        if (here_bits <= bits) { break; }
        //--- PULLBYTE() ---//
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
        //---//
      }
      if (here_op && (here_op & 0xf0) === 0) {
        last_bits = here_bits;
        last_op = here_op;
        last_val = here_val;
        for (;;) {
          here = state.lencode[last_val +
                  ((hold & ((1 << (last_bits + last_op)) - 1))/*BITS(last.bits + last.op)*/ >> last_bits)];
          here_bits = here >>> 24;
          here_op = (here >>> 16) & 0xff;
          here_val = here & 0xffff;

          if ((last_bits + here_bits) <= bits) { break; }
          //--- PULLBYTE() ---//
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
          //---//
        }
        //--- DROPBITS(last.bits) ---//
        hold >>>= last_bits;
        bits -= last_bits;
        //---//
        state.back += last_bits;
      }
      //--- DROPBITS(here.bits) ---//
      hold >>>= here_bits;
      bits -= here_bits;
      //---//
      state.back += here_bits;
      state.length = here_val;
      if (here_op === 0) {
        //Tracevv((stderr, here.val >= 0x20 && here.val < 0x7f ?
        //        "inflate:         literal '%c'\n" :
        //        "inflate:         literal 0x%02x\n", here.val));
        state.mode = LIT;
        break;
      }
      if (here_op & 32) {
        //Tracevv((stderr, "inflate:         end of block\n"));
        state.back = -1;
        state.mode = TYPE;
        break;
      }
      if (here_op & 64) {
        strm.msg = 'invalid literal/length code';
        state.mode = BAD;
        break;
      }
      state.extra = here_op & 15;
      state.mode = LENEXT;
      /* falls through */
    case LENEXT:
      if (state.extra) {
        //=== NEEDBITS(state.extra);
        n = state.extra;
        while (bits < n) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        state.length += hold & ((1 << state.extra) - 1)/*BITS(state.extra)*/;
        //--- DROPBITS(state.extra) ---//
        hold >>>= state.extra;
        bits -= state.extra;
        //---//
        state.back += state.extra;
      }
      //Tracevv((stderr, "inflate:         length %u\n", state.length));
      state.was = state.length;
      state.mode = DIST;
      /* falls through */
    case DIST:
      for (;;) {
        here = state.distcode[hold & ((1 << state.distbits) - 1)];/*BITS(state.distbits)*/
        here_bits = here >>> 24;
        here_op = (here >>> 16) & 0xff;
        here_val = here & 0xffff;

        if ((here_bits) <= bits) { break; }
        //--- PULLBYTE() ---//
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
        //---//
      }
      if ((here_op & 0xf0) === 0) {
        last_bits = here_bits;
        last_op = here_op;
        last_val = here_val;
        for (;;) {
          here = state.distcode[last_val +
                  ((hold & ((1 << (last_bits + last_op)) - 1))/*BITS(last.bits + last.op)*/ >> last_bits)];
          here_bits = here >>> 24;
          here_op = (here >>> 16) & 0xff;
          here_val = here & 0xffff;

          if ((last_bits + here_bits) <= bits) { break; }
          //--- PULLBYTE() ---//
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
          //---//
        }
        //--- DROPBITS(last.bits) ---//
        hold >>>= last_bits;
        bits -= last_bits;
        //---//
        state.back += last_bits;
      }
      //--- DROPBITS(here.bits) ---//
      hold >>>= here_bits;
      bits -= here_bits;
      //---//
      state.back += here_bits;
      if (here_op & 64) {
        strm.msg = 'invalid distance code';
        state.mode = BAD;
        break;
      }
      state.offset = here_val;
      state.extra = (here_op) & 15;
      state.mode = DISTEXT;
      /* falls through */
    case DISTEXT:
      if (state.extra) {
        //=== NEEDBITS(state.extra);
        n = state.extra;
        while (bits < n) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        state.offset += hold & ((1 << state.extra) - 1)/*BITS(state.extra)*/;
        //--- DROPBITS(state.extra) ---//
        hold >>>= state.extra;
        bits -= state.extra;
        //---//
        state.back += state.extra;
      }
//#ifdef INFLATE_STRICT
      if (state.offset > state.dmax) {
        strm.msg = 'invalid distance too far back';
        state.mode = BAD;
        break;
      }
//#endif
      //Tracevv((stderr, "inflate:         distance %u\n", state.offset));
      state.mode = MATCH;
      /* falls through */
    case MATCH:
      if (left === 0) { break inf_leave; }
      copy = _out - left;
      if (state.offset > copy) {         /* copy from window */
        copy = state.offset - copy;
        if (copy > state.whave) {
          if (state.sane) {
            strm.msg = 'invalid distance too far back';
            state.mode = BAD;
            break;
          }
// (!) This block is disabled in zlib defailts,
// don't enable it for binary compatibility
//#ifdef INFLATE_ALLOW_INVALID_DISTANCE_TOOFAR_ARRR
//          Trace((stderr, "inflate.c too far\n"));
//          copy -= state.whave;
//          if (copy > state.length) { copy = state.length; }
//          if (copy > left) { copy = left; }
//          left -= copy;
//          state.length -= copy;
//          do {
//            output[put++] = 0;
//          } while (--copy);
//          if (state.length === 0) { state.mode = LEN; }
//          break;
//#endif
        }
        if (copy > state.wnext) {
          copy -= state.wnext;
          from = state.wsize - copy;
        }
        else {
          from = state.wnext - copy;
        }
        if (copy > state.length) { copy = state.length; }
        from_source = state.window;
      }
      else {                              /* copy from output */
        from_source = output;
        from = put - state.offset;
        copy = state.length;
      }
      if (copy > left) { copy = left; }
      left -= copy;
      state.length -= copy;
      do {
        output[put++] = from_source[from++];
      } while (--copy);
      if (state.length === 0) { state.mode = LEN; }
      break;
    case LIT:
      if (left === 0) { break inf_leave; }
      output[put++] = state.length;
      left--;
      state.mode = LEN;
      break;
    case CHECK:
      if (state.wrap) {
        //=== NEEDBITS(32);
        while (bits < 32) {
          if (have === 0) { break inf_leave; }
          have--;
          // Use '|' insdead of '+' to make sure that result is signed
          hold |= input[next++] << bits;
          bits += 8;
        }
        //===//
        _out -= left;
        strm.total_out += _out;
        state.total += _out;
        if (_out) {
          strm.adler = state.check =
              /*UPDATE(state.check, put - _out, _out);*/
              (state.flags ? crc32_1(state.check, output, _out, put - _out) : adler32_1(state.check, output, _out, put - _out));

        }
        _out = left;
        // NB: crc32 stored as signed 32-bit int, zswap32 returns signed too
        if ((state.flags ? hold : zswap32(hold)) !== state.check) {
          strm.msg = 'incorrect data check';
          state.mode = BAD;
          break;
        }
        //=== INITBITS();
        hold = 0;
        bits = 0;
        //===//
        //Tracev((stderr, "inflate:   check matches trailer\n"));
      }
      state.mode = LENGTH;
      /* falls through */
    case LENGTH:
      if (state.wrap && state.flags) {
        //=== NEEDBITS(32);
        while (bits < 32) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        if (hold !== (state.total & 0xffffffff)) {
          strm.msg = 'incorrect length check';
          state.mode = BAD;
          break;
        }
        //=== INITBITS();
        hold = 0;
        bits = 0;
        //===//
        //Tracev((stderr, "inflate:   length matches trailer\n"));
      }
      state.mode = DONE;
      /* falls through */
    case DONE:
      ret = Z_STREAM_END$2;
      break inf_leave;
    case BAD:
      ret = Z_DATA_ERROR$1;
      break inf_leave;
    case MEM:
      return Z_MEM_ERROR;
    case SYNC:
      /* falls through */
    default:
      return Z_STREAM_ERROR$1;
    }
  }

  // inf_leave <- here is real place for "goto inf_leave", emulated via "break inf_leave"

  /*
     Return from inflate(), updating the total counts and the check value.
     If there was no progress during the inflate() call, return a buffer
     error.  Call updatewindow() to create and/or update the window state.
     Note: a memory error from inflate() is non-recoverable.
   */

  //--- RESTORE() ---
  strm.next_out = put;
  strm.avail_out = left;
  strm.next_in = next;
  strm.avail_in = have;
  state.hold = hold;
  state.bits = bits;
  //---

  if (state.wsize || (_out !== strm.avail_out && state.mode < BAD &&
                      (state.mode < CHECK || flush !== Z_FINISH$2))) {
    if (updatewindow(strm, strm.output, strm.next_out, _out - strm.avail_out)) {
      state.mode = MEM;
      return Z_MEM_ERROR;
    }
  }
  _in -= strm.avail_in;
  _out -= strm.avail_out;
  strm.total_in += _in;
  strm.total_out += _out;
  state.total += _out;
  if (state.wrap && _out) {
    strm.adler = state.check = /*UPDATE(state.check, strm.next_out - _out, _out);*/
      (state.flags ? crc32_1(state.check, output, _out, strm.next_out - _out) : adler32_1(state.check, output, _out, strm.next_out - _out));
  }
  strm.data_type = state.bits + (state.last ? 64 : 0) +
                    (state.mode === TYPE ? 128 : 0) +
                    (state.mode === LEN_ || state.mode === COPY_ ? 256 : 0);
  if (((_in === 0 && _out === 0) || flush === Z_FINISH$2) && ret === Z_OK$2) {
    ret = Z_BUF_ERROR$1;
  }
  return ret;
}

function inflateEnd(strm) {

  if (!strm || !strm.state /*|| strm->zfree == (free_func)0*/) {
    return Z_STREAM_ERROR$1;
  }

  var state = strm.state;
  if (state.window) {
    state.window = null;
  }
  strm.state = null;
  return Z_OK$2;
}

function inflateGetHeader(strm, head) {
  var state;

  /* check state */
  if (!strm || !strm.state) { return Z_STREAM_ERROR$1; }
  state = strm.state;
  if ((state.wrap & 2) === 0) { return Z_STREAM_ERROR$1; }

  /* save header structure */
  state.head = head;
  head.done = false;
  return Z_OK$2;
}

function inflateSetDictionary(strm, dictionary) {
  var dictLength = dictionary.length;

  var state;
  var dictid;
  var ret;

  /* check state */
  if (!strm /* == Z_NULL */ || !strm.state /* == Z_NULL */) { return Z_STREAM_ERROR$1; }
  state = strm.state;

  if (state.wrap !== 0 && state.mode !== DICT) {
    return Z_STREAM_ERROR$1;
  }

  /* check for correct dictionary identifier */
  if (state.mode === DICT) {
    dictid = 1; /* adler32(0, null, 0)*/
    /* dictid = adler32(dictid, dictionary, dictLength); */
    dictid = adler32_1(dictid, dictionary, dictLength, 0);
    if (dictid !== state.check) {
      return Z_DATA_ERROR$1;
    }
  }
  /* copy dictionary to window using updatewindow(), which will amend the
   existing dictionary if appropriate */
  ret = updatewindow(strm, dictionary, dictLength, dictLength);
  if (ret) {
    state.mode = MEM;
    return Z_MEM_ERROR;
  }
  state.havedict = 1;
  // Tracev((stderr, "inflate:   dictionary set\n"));
  return Z_OK$2;
}

var inflateReset_1 = inflateReset;
var inflateReset2_1 = inflateReset2;
var inflateResetKeep_1 = inflateResetKeep;
var inflateInit_1 = inflateInit;
var inflateInit2_1 = inflateInit2;
var inflate_2$1 = inflate$1;
var inflateEnd_1 = inflateEnd;
var inflateGetHeader_1 = inflateGetHeader;
var inflateSetDictionary_1 = inflateSetDictionary;
var inflateInfo = 'pako inflate (from Nodeca project)';

/* Not implemented
exports.inflateCopy = inflateCopy;
exports.inflateGetDictionary = inflateGetDictionary;
exports.inflateMark = inflateMark;
exports.inflatePrime = inflatePrime;
exports.inflateSync = inflateSync;
exports.inflateSyncPoint = inflateSyncPoint;
exports.inflateUndermine = inflateUndermine;
*/

var inflate_1$2 = {
	inflateReset: inflateReset_1,
	inflateReset2: inflateReset2_1,
	inflateResetKeep: inflateResetKeep_1,
	inflateInit: inflateInit_1,
	inflateInit2: inflateInit2_1,
	inflate: inflate_2$1,
	inflateEnd: inflateEnd_1,
	inflateGetHeader: inflateGetHeader_1,
	inflateSetDictionary: inflateSetDictionary_1,
	inflateInfo: inflateInfo
};

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

var constants = {

  /* Allowed flush values; see deflate() and inflate() below for details */
  Z_NO_FLUSH:         0,
  Z_PARTIAL_FLUSH:    1,
  Z_SYNC_FLUSH:       2,
  Z_FULL_FLUSH:       3,
  Z_FINISH:           4,
  Z_BLOCK:            5,
  Z_TREES:            6,

  /* Return codes for the compression/decompression functions. Negative values
  * are errors, positive values are used for special but normal events.
  */
  Z_OK:               0,
  Z_STREAM_END:       1,
  Z_NEED_DICT:        2,
  Z_ERRNO:           -1,
  Z_STREAM_ERROR:    -2,
  Z_DATA_ERROR:      -3,
  //Z_MEM_ERROR:     -4,
  Z_BUF_ERROR:       -5,
  //Z_VERSION_ERROR: -6,

  /* compression levels */
  Z_NO_COMPRESSION:         0,
  Z_BEST_SPEED:             1,
  Z_BEST_COMPRESSION:       9,
  Z_DEFAULT_COMPRESSION:   -1,


  Z_FILTERED:               1,
  Z_HUFFMAN_ONLY:           2,
  Z_RLE:                    3,
  Z_FIXED:                  4,
  Z_DEFAULT_STRATEGY:       0,

  /* Possible values of the data_type field (though see inflate()) */
  Z_BINARY:                 0,
  Z_TEXT:                   1,
  //Z_ASCII:                1, // = Z_TEXT (deprecated)
  Z_UNKNOWN:                2,

  /* The deflate compression method */
  Z_DEFLATED:               8
  //Z_NULL:                 null // Use -1 or null inline, depending on var type
};

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

function GZheader() {
  /* true if compressed data believed to be text */
  this.text       = 0;
  /* modification time */
  this.time       = 0;
  /* extra flags (not used when writing a gzip file) */
  this.xflags     = 0;
  /* operating system */
  this.os         = 0;
  /* pointer to extra field or Z_NULL if none */
  this.extra      = null;
  /* extra field length (valid if extra != Z_NULL) */
  this.extra_len  = 0; // Actually, we don't need it in JS,
                       // but leave for few code modifications

  //
  // Setup limits is not necessary because in js we should not preallocate memory
  // for inflate use constant limit in 65536 bytes
  //

  /* space at extra (only when reading header) */
  // this.extra_max  = 0;
  /* pointer to zero-terminated file name or Z_NULL */
  this.name       = '';
  /* space at name (only when reading header) */
  // this.name_max   = 0;
  /* pointer to zero-terminated comment or Z_NULL */
  this.comment    = '';
  /* space at comment (only when reading header) */
  // this.comm_max   = 0;
  /* true if there was or will be a header crc */
  this.hcrc       = 0;
  /* true when done reading gzip header (not used when writing a gzip file) */
  this.done       = false;
}

var gzheader = GZheader;

var toString$2 = Object.prototype.toString;

/**
 * class Inflate
 *
 * Generic JS-style wrapper for zlib calls. If you don't need
 * streaming behaviour - use more simple functions: [[inflate]]
 * and [[inflateRaw]].
 **/

/* internal
 * inflate.chunks -> Array
 *
 * Chunks of output data, if [[Inflate#onData]] not overriden.
 **/

/**
 * Inflate.result -> Uint8Array|Array|String
 *
 * Uncompressed result, generated by default [[Inflate#onData]]
 * and [[Inflate#onEnd]] handlers. Filled after you push last chunk
 * (call [[Inflate#push]] with `Z_FINISH` / `true` param) or if you
 * push a chunk with explicit flush (call [[Inflate#push]] with
 * `Z_SYNC_FLUSH` param).
 **/

/**
 * Inflate.err -> Number
 *
 * Error code after inflate finished. 0 (Z_OK) on success.
 * Should be checked if broken data possible.
 **/

/**
 * Inflate.msg -> String
 *
 * Error message, if [[Inflate.err]] != 0
 **/


/**
 * new Inflate(options)
 * - options (Object): zlib inflate options.
 *
 * Creates new inflator instance with specified params. Throws exception
 * on bad params. Supported options:
 *
 * - `windowBits`
 * - `dictionary`
 *
 * [http://zlib.net/manual.html#Advanced](http://zlib.net/manual.html#Advanced)
 * for more information on these.
 *
 * Additional options, for internal needs:
 *
 * - `chunkSize` - size of generated data chunks (16K by default)
 * - `raw` (Boolean) - do raw inflate
 * - `to` (String) - if equal to 'string', then result will be converted
 *   from utf8 to utf16 (javascript) string. When string output requested,
 *   chunk length can differ from `chunkSize`, depending on content.
 *
 * By default, when no options set, autodetect deflate/gzip data format via
 * wrapper header.
 *
 * ##### Example:
 *
 * ```javascript
 * var pako = require('pako')
 *   , chunk1 = Uint8Array([1,2,3,4,5,6,7,8,9])
 *   , chunk2 = Uint8Array([10,11,12,13,14,15,16,17,18,19]);
 *
 * var inflate = new pako.Inflate({ level: 3});
 *
 * inflate.push(chunk1, false);
 * inflate.push(chunk2, true);  // true -> last chunk
 *
 * if (inflate.err) { throw new Error(inflate.err); }
 *
 * console.log(inflate.result);
 * ```
 **/
function Inflate(options) {
  if (!(this instanceof Inflate)) return new Inflate(options);

  this.options = common.assign({
    chunkSize: 16384,
    windowBits: 0,
    to: ''
  }, options || {});

  var opt = this.options;

  // Force window size for `raw` data, if not set directly,
  // because we have no header for autodetect.
  if (opt.raw && (opt.windowBits >= 0) && (opt.windowBits < 16)) {
    opt.windowBits = -opt.windowBits;
    if (opt.windowBits === 0) { opt.windowBits = -15; }
  }

  // If `windowBits` not defined (and mode not raw) - set autodetect flag for gzip/deflate
  if ((opt.windowBits >= 0) && (opt.windowBits < 16) &&
      !(options && options.windowBits)) {
    opt.windowBits += 32;
  }

  // Gzip header has no info about windows size, we can do autodetect only
  // for deflate. So, if window size not set, force it to max when gzip possible
  if ((opt.windowBits > 15) && (opt.windowBits < 48)) {
    // bit 3 (16) -> gzipped data
    // bit 4 (32) -> autodetect gzip/deflate
    if ((opt.windowBits & 15) === 0) {
      opt.windowBits |= 15;
    }
  }

  this.err    = 0;      // error code, if happens (0 = Z_OK)
  this.msg    = '';     // error message
  this.ended  = false;  // used to avoid multiple onEnd() calls
  this.chunks = [];     // chunks of compressed data

  this.strm   = new zstream();
  this.strm.avail_out = 0;

  var status  = inflate_1$2.inflateInit2(
    this.strm,
    opt.windowBits
  );

  if (status !== constants.Z_OK) {
    throw new Error(messages[status]);
  }

  this.header = new gzheader();

  inflate_1$2.inflateGetHeader(this.strm, this.header);
}

/**
 * Inflate#push(data[, mode]) -> Boolean
 * - data (Uint8Array|Array|ArrayBuffer|String): input data
 * - mode (Number|Boolean): 0..6 for corresponding Z_NO_FLUSH..Z_TREE modes.
 *   See constants. Skipped or `false` means Z_NO_FLUSH, `true` meansh Z_FINISH.
 *
 * Sends input data to inflate pipe, generating [[Inflate#onData]] calls with
 * new output chunks. Returns `true` on success. The last data block must have
 * mode Z_FINISH (or `true`). That will flush internal pending buffers and call
 * [[Inflate#onEnd]]. For interim explicit flushes (without ending the stream) you
 * can use mode Z_SYNC_FLUSH, keeping the decompression context.
 *
 * On fail call [[Inflate#onEnd]] with error code and return false.
 *
 * We strongly recommend to use `Uint8Array` on input for best speed (output
 * format is detected automatically). Also, don't skip last param and always
 * use the same type in your code (boolean or number). That will improve JS speed.
 *
 * For regular `Array`-s make sure all elements are [0..255].
 *
 * ##### Example
 *
 * ```javascript
 * push(chunk, false); // push one of data chunks
 * ...
 * push(chunk, true);  // push last chunk
 * ```
 **/
Inflate.prototype.push = function (data, mode) {
  var strm = this.strm;
  var chunkSize = this.options.chunkSize;
  var dictionary = this.options.dictionary;
  var status, _mode;
  var next_out_utf8, tail, utf8str;
  var dict;

  // Flag to properly process Z_BUF_ERROR on testing inflate call
  // when we check that all output data was flushed.
  var allowBufError = false;

  if (this.ended) { return false; }
  _mode = (mode === ~~mode) ? mode : ((mode === true) ? constants.Z_FINISH : constants.Z_NO_FLUSH);

  // Convert data if needed
  if (typeof data === 'string') {
    // Only binary strings can be decompressed on practice
    strm.input = strings.binstring2buf(data);
  } else if (toString$2.call(data) === '[object ArrayBuffer]') {
    strm.input = new Uint8Array(data);
  } else {
    strm.input = data;
  }

  strm.next_in = 0;
  strm.avail_in = strm.input.length;

  do {
    if (strm.avail_out === 0) {
      strm.output = new common.Buf8(chunkSize);
      strm.next_out = 0;
      strm.avail_out = chunkSize;
    }

    status = inflate_1$2.inflate(strm, constants.Z_NO_FLUSH);    /* no bad return value */

    if (status === constants.Z_NEED_DICT && dictionary) {
      // Convert data if needed
      if (typeof dictionary === 'string') {
        dict = strings.string2buf(dictionary);
      } else if (toString$2.call(dictionary) === '[object ArrayBuffer]') {
        dict = new Uint8Array(dictionary);
      } else {
        dict = dictionary;
      }

      status = inflate_1$2.inflateSetDictionary(this.strm, dict);

    }

    if (status === constants.Z_BUF_ERROR && allowBufError === true) {
      status = constants.Z_OK;
      allowBufError = false;
    }

    if (status !== constants.Z_STREAM_END && status !== constants.Z_OK) {
      this.onEnd(status);
      this.ended = true;
      return false;
    }

    if (strm.next_out) {
      if (strm.avail_out === 0 || status === constants.Z_STREAM_END || (strm.avail_in === 0 && (_mode === constants.Z_FINISH || _mode === constants.Z_SYNC_FLUSH))) {

        if (this.options.to === 'string') {

          next_out_utf8 = strings.utf8border(strm.output, strm.next_out);

          tail = strm.next_out - next_out_utf8;
          utf8str = strings.buf2string(strm.output, next_out_utf8);

          // move tail
          strm.next_out = tail;
          strm.avail_out = chunkSize - tail;
          if (tail) { common.arraySet(strm.output, strm.output, next_out_utf8, tail, 0); }

          this.onData(utf8str);

        } else {
          this.onData(common.shrinkBuf(strm.output, strm.next_out));
        }
      }
    }

    // When no more input data, we should check that internal inflate buffers
    // are flushed. The only way to do it when avail_out = 0 - run one more
    // inflate pass. But if output data not exists, inflate return Z_BUF_ERROR.
    // Here we set flag to process this error properly.
    //
    // NOTE. Deflate does not return error in this case and does not needs such
    // logic.
    if (strm.avail_in === 0 && strm.avail_out === 0) {
      allowBufError = true;
    }

  } while ((strm.avail_in > 0 || strm.avail_out === 0) && status !== constants.Z_STREAM_END);

  if (status === constants.Z_STREAM_END) {
    _mode = constants.Z_FINISH;
  }

  // Finalize on the last chunk.
  if (_mode === constants.Z_FINISH) {
    status = inflate_1$2.inflateEnd(this.strm);
    this.onEnd(status);
    this.ended = true;
    return status === constants.Z_OK;
  }

  // callback interim results if Z_SYNC_FLUSH.
  if (_mode === constants.Z_SYNC_FLUSH) {
    this.onEnd(constants.Z_OK);
    strm.avail_out = 0;
    return true;
  }

  return true;
};


/**
 * Inflate#onData(chunk) -> Void
 * - chunk (Uint8Array|Array|String): ouput data. Type of array depends
 *   on js engine support. When string output requested, each chunk
 *   will be string.
 *
 * By default, stores data blocks in `chunks[]` property and glue
 * those in `onEnd`. Override this handler, if you need another behaviour.
 **/
Inflate.prototype.onData = function (chunk) {
  this.chunks.push(chunk);
};


/**
 * Inflate#onEnd(status) -> Void
 * - status (Number): inflate status. 0 (Z_OK) on success,
 *   other if not.
 *
 * Called either after you tell inflate that the input stream is
 * complete (Z_FINISH) or should be flushed (Z_SYNC_FLUSH)
 * or if an error happened. By default - join collected chunks,
 * free memory and fill `results` / `err` properties.
 **/
Inflate.prototype.onEnd = function (status) {
  // On success - join
  if (status === constants.Z_OK) {
    if (this.options.to === 'string') {
      // Glue & convert here, until we teach pako to send
      // utf8 alligned strings to onData
      this.result = this.chunks.join('');
    } else {
      this.result = common.flattenChunks(this.chunks);
    }
  }
  this.chunks = [];
  this.err = status;
  this.msg = this.strm.msg;
};


/**
 * inflate(data[, options]) -> Uint8Array|Array|String
 * - data (Uint8Array|Array|String): input data to decompress.
 * - options (Object): zlib inflate options.
 *
 * Decompress `data` with inflate/ungzip and `options`. Autodetect
 * format via wrapper header by default. That's why we don't provide
 * separate `ungzip` method.
 *
 * Supported options are:
 *
 * - windowBits
 *
 * [http://zlib.net/manual.html#Advanced](http://zlib.net/manual.html#Advanced)
 * for more information.
 *
 * Sugar (options):
 *
 * - `raw` (Boolean) - say that we work with raw stream, if you don't wish to specify
 *   negative windowBits implicitly.
 * - `to` (String) - if equal to 'string', then result will be converted
 *   from utf8 to utf16 (javascript) string. When string output requested,
 *   chunk length can differ from `chunkSize`, depending on content.
 *
 *
 * ##### Example:
 *
 * ```javascript
 * var pako = require('pako')
 *   , input = pako.deflate([1,2,3,4,5,6,7,8,9])
 *   , output;
 *
 * try {
 *   output = pako.inflate(input);
 * } catch (err)
 *   console.log(err);
 * }
 * ```
 **/
function inflate(input, options) {
  var inflator = new Inflate(options);

  inflator.push(input, true);

  // That will never happens, if you don't cheat with options :)
  if (inflator.err) { throw inflator.msg || messages[inflator.err]; }

  return inflator.result;
}


/**
 * inflateRaw(data[, options]) -> Uint8Array|Array|String
 * - data (Uint8Array|Array|String): input data to decompress.
 * - options (Object): zlib inflate options.
 *
 * The same as [[inflate]], but creates raw data, without wrapper
 * (header and adler32 crc).
 **/
function inflateRaw(input, options) {
  options = options || {};
  options.raw = true;
  return inflate(input, options);
}


/**
 * ungzip(data[, options]) -> Uint8Array|Array|String
 * - data (Uint8Array|Array|String): input data to decompress.
 * - options (Object): zlib inflate options.
 *
 * Just shortcut to [[inflate]], because it autodetects format
 * by header.content. Done for convenience.
 **/


var Inflate_1 = Inflate;
var inflate_2 = inflate;
var inflateRaw_1 = inflateRaw;
var ungzip  = inflate;

var inflate_1 = {
	Inflate: Inflate_1,
	inflate: inflate_2,
	inflateRaw: inflateRaw_1,
	ungzip: ungzip
};

var assign    = common.assign;





var pako = {};

assign(pako, deflate_1, inflate_1, constants);

var index$1 = pako;

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


/**
* Takes the File inputs from a HTML input of type "file" (aka. a file dialog), and reads it as a ArrayBuffer.
* Every File given in input should be added separately using `addInput( file[i], 'uniqueID' )`.
* The event "ready" must be set up ( using .on("ready", function(){}) ) and will
* be triggered when all the files given in input are translated into ArrayBuffers.
* Once ready, all the outputs are accecible using the same uniqueID with the
* method `getOutput("uniqueID")`.
* Gzip compressed files will be uncompressed.
*
* Once the filter is *updated*, you can query the `filenames` metadata (sorted by categories)
* and also the `checksums` metadata using `.getMetadata()`. This later metadata 
* give a unique *md5*, very convenient to compare if two files are actually the same.
* Note that in case the file is *gziped*, the checksum is computed on the raw file,
* not on the *un-gziped* buffer.
*
* **Usage**
* - [examples/fileToArrayBuffer.html](../examples/fileToArrayBuffer.html)
*/
class FileToArrayBufferReader extends Filter {

  constructor(){
    super();
    this._outputCounter = 0;
    
    // filenames by categories
    this.setMetadata("filenames", {});
    
    // md5 checksum by categories
    this.setMetadata("checksums", {});
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
        
        var filename = that._getInput(category).name;
        var basename = filename.split(/[\\/]/).pop();
        var extension = basename.split('.').pop();
        var checksum = md5( result );
        
        // few metadata for recognizing files (potentially)
        that._metadata.filenames[ category ] = basename;
        that._metadata.checksums[ category ] = checksum;

        if( extension.localeCompare("pixp") ){
          // trying to un-gzip it with Pako
          try {
            result = index$1.inflate(result).buffer;
            console.log("File was un-gziped successfully");
          } catch (err) {
            console.log("Pako: " + err + " (this content is not gziped)");
          }
        }
        
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
      that.triggerEvent("ready");
    }
  }

} /* END of class FileToArrayBufferReader */

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


/**
* Open a files as ArrayBuffer using their URL. You must specify one or several URL
* (String) using `addInput("...")` and add function to the event "ready" using
* `.on( "ready", function(filter){ ... })`.
* The "ready" event will be called only when all input are loaded.
* Gzip compressed files will be uncompressed.
* Once the filter is *updated*, you can query the `filenames` metadata (sorted by categories)
* and also the `checksums` metadata using `.getMetadata()`. This later metadata 
* give a unique *md5*, very convenient to compare if two files are actually the same.
* Note that in case the file is *gziped*, the checksum is computed on the raw file,
* not on the *un-gziped* buffer.
*
* **Usage**
* - [examples/urlFileToArrayBuffer.html](../examples/urlFileToArrayBuffer.html)
*/
class UrlToArrayBufferReader extends Filter {

  constructor(){
    super();
    this._outputCounter = 0;
    
    // filenames by categories
    this.setMetadata("filenames", {});
    
    // md5 checksum by categories
    this.setMetadata("checksums", {});
  }


  _run(){
    var that = this;

    if(! this.getNumberOfInputs() ){
      console.warn("No input was specified, cannot run this filer.");
      return;
    }


    this._forEachInput( function(category, input){
      that._loadUrl(category, input);
    });

  }


  /**
  * [PRIVATE]
  * Perform a XMLHttpRequest with the given url and adds it to the output
  */
  _loadUrl( category, url ){
    var that = this;

    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "arraybuffer";

    xhr.onload = function(event) {
      var arrayBuff = xhr.response;
      
      var basename = url.split(/[\\/]/).pop();
      var extension = basename.split('.').pop();
      var checksum = md5( arrayBuff );
      
      // few metadata for recognizing files (potentially)
      that._metadata.filenames[ category ] = basename;
      that._metadata.checksums[ category ] = checksum;

      // trying to un-gzip it with Pako for non pixp files
      if( extension.localeCompare("pixp") ){
        try {
          arrayBuff = index$1.inflate(arrayBuff).buffer;
          console.log("File was un-gziped successfully");
        } catch (err) {
          console.log("Pako: " + err + " (this content is not gziped)");
        }
      }
      
      that._output[ category ] = arrayBuff;
      

      that._outputCounter ++;

      if( that._outputCounter == that.getNumberOfInputs()){
        that.triggerEvent("ready");
      }
    };

    xhr.error = function(){
      console.log("here go the error");
    };

    xhr.send();
  }


} /* END of class UrlToArrayBufferReader */

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
* The metadata "debug" can be set to true to
* enable a verbose mode.
* Takes an ArrayBuffer as input (0) and output a `MniVolume` (which inherit `Image3D`).
*
* **Usage**
* - [examples/fileToMinc2.html](../examples/fileToMinc2.html)
*/
class Minc2Decoder extends Filter{

  constructor(){
    super();
    this.addInputValidator(0, ArrayBuffer);

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
            dp = index$1.inflate(sp);
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
        if (typeof index$1 !== 'object') {
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


/*
  createMincVolume(header, raw_data){
    var volume = createVolume(header, this.createMincData(header, raw_data));
    volume.type = "minc";

    volume.saveOriginAndTransform(header);
    volume.intensity_min = header.voxel_min;
    volume.intensity_max = header.voxel_max;

    return volume;

  }
*/


  /*
    initialize the large 1D array of data depending on the type found.
    Rearange the original ArrayBuffer into a typed array.
    args:
      header: obj - header of the data
      raw_data: ArrayBuffer - sub object given by hdf5Loader
  */
  createMincData(header, raw_data){

    var native_data = null;

    switch (header.datatype) {
      case 'int8':
      native_data = new Int8Array(raw_data);
      break;
      case 'int16':
      native_data = new Int16Array(raw_data);
      break;
      case 'int32':
      native_data = new Int32Array(raw_data);
      break;
      case 'float32':
      native_data = new Float32Array(raw_data);
      break;
      case 'float64':
      native_data = new Float64Array(raw_data);
      break;
      case 'uint8':
      native_data = new Uint8Array(raw_data);
      break;
      case 'uint16':
      native_data = new Uint16Array(raw_data);
      break;
      case 'uint32':
      case 'rgb8':
      native_data = new Uint32Array(raw_data);
      break;
      default:
      var error_message = "Unsupported data type: " + header.datatype;
      console.log({ message: error_message } );
      //BrainBrowser.events.triggerEvent("error", { message: error_message } );
      throw new Error(error_message);
    }

    return native_data;
  }




  //----------------------------------------------------------------------------

  _run(){
    var that = this;

    var inputBuffer = this._getInput(0);

    if(!inputBuffer){
      console.warn("Minc2Decoder requires an ArrayBuffer as input \"0\". Unable to continue.");
      return;
    }

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

    try{
      this._superblk = this.hdf5Superblock();
    }catch(e){
      //console.error(e);
      console.warn("The input file is not a Minc2 file.");
      return;
    }


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

    var minc_header = this.parseHeader( JSON.stringify(header) );
    var dataArray = this.createMincData(minc_header, new_abuf);

    // add the output to this filter
    this._addOutput(MniVolume);
    var mniVol = this.getOutput();
    mniVol.setData(dataArray, minc_header);
    mniVol.setMetadata("format", "minc2");
  }



} /* END of class Minc2Decoder */

/*
* Author    Jonathan Lurie - http://me.jonahanlurie.fr
*           Robert D. Vincent
*
* License   MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

/**
* Decodes a NIfTI file.
* Takes an ArrayBuffer as input (0) and output a `MniVolume` (which inherit `Image3D`).
*
* **Usage**
* - [examples/fileToNifti.html](../examples/fileToNifti.html)
*/
class NiftiDecoder extends Filter {

  constructor(){
    super();
    this.addInputValidator(0, ArrayBuffer);
    this.setMetadata("debug", false);
  }


  /**
  * [PRIVATE]
  */
  parseNifti1Header(raw_data) {
    var header = {
      order: ["zspace", "yspace", "xspace"],
      xspace: {},
      yspace: {},
      zspace: {}
    };
    var error_message = null;
    var dview = new DataView(raw_data, 0, 348);
    var bytes = new Uint8Array(raw_data, 0, 348);
    var littleEndian = true;

    var sizeof_hdr = dview.getUint32(0, true);
    if (sizeof_hdr === 0x0000015c) {
      littleEndian = true;
    } else if (sizeof_hdr === 0x5c010000) {
      littleEndian = false;
    } else {
      error_message = "This does not look like a NIfTI-1 file.";
    }

    var ndims = dview.getUint16(40, littleEndian);
    if (ndims < 3 || ndims > 4) {
      error_message = "Cannot handle " + ndims + "-dimensional images yet.";
    }

    var magic = String.fromCharCode.apply(null, bytes.subarray(344, 348));
    if (magic !== "n+1\0") {
      error_message = "Bad magic number: '" + magic + "'";
    }

    if (error_message) {
      //throw new Error(error_message);
      console.warn("The input file is not a NIfTI file.");
      return null;
    }

    header.xspace.space_length = dview.getUint16(42, littleEndian);
    header.yspace.space_length = dview.getUint16(44, littleEndian);
    header.zspace.space_length = dview.getUint16(46, littleEndian);
    var tlength = dview.getUint16(48, littleEndian);

    var datatype = dview.getUint16(70, littleEndian);
    var bitpix = dview.getUint16(72, littleEndian);

    var xstep = dview.getFloat32(80, littleEndian);
    var ystep = dview.getFloat32(84, littleEndian);
    var zstep = dview.getFloat32(88, littleEndian);
    var tstep = dview.getFloat32(92, littleEndian);

    var vox_offset = dview.getFloat32(108, littleEndian);
    if (vox_offset < 352) {
      vox_offset = 352;
    }

    var scl_slope = dview.getFloat32(112, littleEndian);
    var scl_inter = dview.getFloat32(116, littleEndian);

    var qform_code = dview.getUint16(252, littleEndian);
    var sform_code = dview.getUint16(254, littleEndian);

    var transform = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1]
    ];

    if (tlength >= 1) {
      header.time = {};
      header.time.space_length = tlength;
      header.time.step = tstep;
      header.time.start = 0;
      header.time.name = "time";
      header.order = ["time", "zspace", "yspace", "xspace"];
    }

    /* Record the number of bytes per voxel, and note whether we need
     * to swap bytes in the voxel data.
     */
    header.bytes_per_voxel = bitpix / 8;
    header.must_swap_data = !littleEndian && header.bytes_per_voxel > 1;

    if (sform_code > 0) {
      /* The "Sform", if present, defines an affine transform which is
       * generally assumed to correspond to some standard coordinate
       * space (e.g. Talairach).
       */
      transform[0][0] = dview.getFloat32(280, littleEndian);
      transform[0][1] = dview.getFloat32(284, littleEndian);
      transform[0][2] = dview.getFloat32(288, littleEndian);
      transform[0][3] = dview.getFloat32(292, littleEndian);
      transform[1][0] = dview.getFloat32(296, littleEndian);
      transform[1][1] = dview.getFloat32(300, littleEndian);
      transform[1][2] = dview.getFloat32(304, littleEndian);
      transform[1][3] = dview.getFloat32(308, littleEndian);
      transform[2][0] = dview.getFloat32(312, littleEndian);
      transform[2][1] = dview.getFloat32(316, littleEndian);
      transform[2][2] = dview.getFloat32(320, littleEndian);
      transform[2][3] = dview.getFloat32(324, littleEndian);
    }
    else if (qform_code > 0) {
      /* The "Qform", if present, defines a quaternion which specifies
       * a less general transformation, often to scanner space.
       */
      var quatern_b = dview.getFloat32(256, littleEndian);
      var quatern_c = dview.getFloat32(260, littleEndian);
      var quatern_d = dview.getFloat32(264, littleEndian);
      var qoffset_x = dview.getFloat32(268, littleEndian);
      var qoffset_y = dview.getFloat32(272, littleEndian);
      var qoffset_z = dview.getFloat32(276, littleEndian);
      var qfac = (dview.getFloat32(76, littleEndian) < 0) ? -1.0 : 1.0;

      transform = this.niftiQuaternToMat44(quatern_b, quatern_c, quatern_d,
                                           qoffset_x, qoffset_y, qoffset_z,
                                           xstep,     ystep,     zstep,     qfac);
    }
    else {
      transform[0][0] = xstep;
      transform[1][1] = ystep;
      transform[2][2] = zstep;
    }

    MniVolume.transformToMinc(transform, header);

    header.datatype = datatype;
    header.vox_offset = vox_offset;
    header.scl_slope = scl_slope;
    header.scl_inter = scl_inter;

    return header;
  }


  /**
  * [PRIVATE]
  * This function is a direct translation of the identical function
  * found in the standard NIfTI-1 library (nifti1_io.c).
  */
  niftiQuaternToMat44( qb, qc, qd,
                       qx, qy, qz,
                       dx, dy, dz, qfac )
  {
    var m = [                   // 4x4 transform
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 1]
    ];
    var b = qb;
    var c = qc;
    var d = qd;
    var a, xd, yd, zd;

    // compute a parameter from b,c,d

    a = 1.0 - (b * b + c * c + d * d);
    if ( a < 1.e-7 ) {           // special case
      a = 1.0 / Math.sqrt(b * b + c * c + d * d);
      b *= a;                    // normalize (b,c,d) vector
      c *= a;
      d *= a;
      a = 0.0;                   // a = 0 ==> 180 degree rotation
    } else {
      a = Math.sqrt(a);          // angle = 2*arccos(a)
    }

    // load rotation matrix, including scaling factors for voxel sizes

    xd = (dx > 0.0) ? dx : 1.0;  // make sure are positive
    yd = (dy > 0.0) ? dy : 1.0;
    zd = (dz > 0.0) ? dz : 1.0;

    if ( qfac < 0.0 )            // left handedness?
      zd = -zd;

    m[0][0] =       (a * a + b * b - c * c - d * d) * xd;
    m[0][1] = 2.0 * (b * c - a * d                ) * yd;
    m[0][2] = 2.0 * (b * d + a * c                ) * zd;
    m[1][0] = 2.0 * (b * c + a * d                ) * xd;
    m[1][1] =       (a * a + c * c - b * b - d * d) * yd;
    m[1][2] = 2.0 * (c * d - a * b                ) * zd;
    m[2][0] = 2.0 * (b * d - a * c                ) * xd;
    m[2][1] = 2.0 * (c * d + a * b                ) * yd;
    m[2][2] =       (a * a + d * d - c * c - b * b) * zd;

    // load offsets
    m[0][3] = qx;
    m[1][3] = qy;
    m[2][3] = qz;

    return m;
  }


  /**
  * [PRIVATE]
  */
  createNifti1Data(header, raw_data) {
    var native_data = null;

    if (header.must_swap_data) {
      MniVolume.swapn(
        new Uint8Array(raw_data, header.vox_offset),
        header.bytes_per_voxel
      );
    }

    switch (header.datatype) {
    case 2:                     // DT_UNSIGNED_CHAR
      // no translation necessary; could optimize this out.
      native_data = new Uint8Array(raw_data, header.vox_offset);
      break;
    case 4:                     // DT_SIGNED_SHORT
      native_data = new Int16Array(raw_data, header.vox_offset);
      break;
    case 8:                     // DT_SIGNED_INT
      native_data = new Int32Array(raw_data, header.vox_offset);
      break;
    case 16:                    // DT_FLOAT
      native_data = new Float32Array(raw_data, header.vox_offset);
      break;
    case 64:                    // DT_DOUBLE
      native_data = new Float64Array(raw_data, header.vox_offset);
      break;
    // Values above 256 are NIfTI-specific, and rarely used.
    case 256:                   // DT_INT8
      native_data = new Int8Array(raw_data, header.vox_offset);
      break;
    case 512:                   // DT_UINT16
      native_data = new Uint16Array(raw_data, header.vox_offset);
      break;
    case 768:                   // DT_UINT32
      native_data = new Uint32Array(raw_data, header.vox_offset);
      break;
    default:
      // We don't yet support 64-bit, complex, RGB, and float 128 types.
      throw new Error("Unsupported data type: " + header.datatype);
    }

    var d = 0;                  // Generic loop counter.
    var slope = header.scl_slope;
    var inter = header.scl_inter;

    // According to the NIfTI specification, a slope value of zero means
    // that the data should _not_ be scaled. Otherwise, every voxel is
    // transformed according to value = value * slope + inter
    //
    if (slope !== 0.0) {
      var float_data = new Float32Array(native_data.length);

      for (d = 0; d < native_data.length; d++) {
        float_data[d] = native_data[d] * slope + inter;
      }
      native_data = float_data; // Return the new float buffer.
    }

    if(header.order.length === 4) {
      header.order = header.order.slice(1);
    }

    // Incrementation offsets for each dimension of the volume.
    header[header.order[0]].offset = header[header.order[1]].space_length * header[header.order[2]].space_length;
    header[header.order[1]].offset = header[header.order[2]].space_length;
    header[header.order[2]].offset = 1;

    if(header.time) {
      header.time.offset = header.xspace.space_length * header.yspace.space_length * header.zspace.space_length;
    }

    return native_data;
  }


  //----------------------------------------------------------------------------

  _run(){
    var that = this;
    var inputBuffer = this._getInput(0);

    if(!inputBuffer){
      console.warn("NiftiDecoder requires an ArrayBuffer as input \"0\". Unable to continue.");
      return;
    }

    var header = this.parseNifti1Header( inputBuffer );

    // abort if header not valid
    if(!header)
      return;

    var dataArray = this.createNifti1Data(header, inputBuffer);

    // add the output to this filter
    this._addOutput(MniVolume);
    var mniVol = this.getOutput();
    mniVol.setData(dataArray, header);
    mniVol.setMetadata("format", "nifti");

  }


} /* END class NiftiDecoder */

var FileSaver = createCommonjsModule(function (module) {
/* FileSaver.js
 * A saveAs() FileSaver implementation.
 * 1.3.2
 * 2016-06-16 18:25:19
 *
 * By Eli Grey, http://eligrey.com
 * License: MIT
 *   See https://github.com/eligrey/FileSaver.js/blob/master/LICENSE.md
 */

/*global self */
/*jslint bitwise: true, indent: 4, laxbreak: true, laxcomma: true, smarttabs: true, plusplus: true */

/*! @source http://purl.eligrey.com/github/FileSaver.js/blob/master/FileSaver.js */

var saveAs = saveAs || (function(view) {
	"use strict";
	// IE <10 is explicitly unsupported
	if (typeof view === "undefined" || typeof navigator !== "undefined" && /MSIE [1-9]\./.test(navigator.userAgent)) {
		return;
	}
	var
		  doc = view.document
		  // only get URL when necessary in case Blob.js hasn't overridden it yet
		, get_URL = function() {
			return view.URL || view.webkitURL || view;
		}
		, save_link = doc.createElementNS("http://www.w3.org/1999/xhtml", "a")
		, can_use_save_link = "download" in save_link
		, click = function(node) {
			var event = new MouseEvent("click");
			node.dispatchEvent(event);
		}
		, is_safari = /constructor/i.test(view.HTMLElement) || view.safari
		, is_chrome_ios =/CriOS\/[\d]+/.test(navigator.userAgent)
		, throw_outside = function(ex) {
			(view.setImmediate || view.setTimeout)(function() {
				throw ex;
			}, 0);
		}
		, force_saveable_type = "application/octet-stream"
		// the Blob API is fundamentally broken as there is no "downloadfinished" event to subscribe to
		, arbitrary_revoke_timeout = 1000 * 40 // in ms
		, revoke = function(file) {
			var revoker = function() {
				if (typeof file === "string") { // file is an object URL
					get_URL().revokeObjectURL(file);
				} else { // file is a File
					file.remove();
				}
			};
			setTimeout(revoker, arbitrary_revoke_timeout);
		}
		, dispatch = function(filesaver, event_types, event) {
			event_types = [].concat(event_types);
			var i = event_types.length;
			while (i--) {
				var listener = filesaver["on" + event_types[i]];
				if (typeof listener === "function") {
					try {
						listener.call(filesaver, event || filesaver);
					} catch (ex) {
						throw_outside(ex);
					}
				}
			}
		}
		, auto_bom = function(blob) {
			// prepend BOM for UTF-8 XML and text/* types (including HTML)
			// note: your browser will automatically convert UTF-16 U+FEFF to EF BB BF
			if (/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)) {
				return new Blob([String.fromCharCode(0xFEFF), blob], {type: blob.type});
			}
			return blob;
		}
		, FileSaver = function(blob, name, no_auto_bom) {
			if (!no_auto_bom) {
				blob = auto_bom(blob);
			}
			// First try a.download, then web filesystem, then object URLs
			var
				  filesaver = this
				, type = blob.type
				, force = type === force_saveable_type
				, object_url
				, dispatch_all = function() {
					dispatch(filesaver, "writestart progress write writeend".split(" "));
				}
				// on any filesys errors revert to saving with object URLs
				, fs_error = function() {
					if ((is_chrome_ios || (force && is_safari)) && view.FileReader) {
						// Safari doesn't allow downloading of blob urls
						var reader = new FileReader();
						reader.onloadend = function() {
							var url = is_chrome_ios ? reader.result : reader.result.replace(/^data:[^;]*;/, 'data:attachment/file;');
							var popup = view.open(url, '_blank');
							if(!popup) view.location.href = url;
							url=undefined; // release reference before dispatching
							filesaver.readyState = filesaver.DONE;
							dispatch_all();
						};
						reader.readAsDataURL(blob);
						filesaver.readyState = filesaver.INIT;
						return;
					}
					// don't create more object URLs than needed
					if (!object_url) {
						object_url = get_URL().createObjectURL(blob);
					}
					if (force) {
						view.location.href = object_url;
					} else {
						var opened = view.open(object_url, "_blank");
						if (!opened) {
							// Apple does not allow window.open, see https://developer.apple.com/library/safari/documentation/Tools/Conceptual/SafariExtensionGuide/WorkingwithWindowsandTabs/WorkingwithWindowsandTabs.html
							view.location.href = object_url;
						}
					}
					filesaver.readyState = filesaver.DONE;
					dispatch_all();
					revoke(object_url);
				};
			filesaver.readyState = filesaver.INIT;

			if (can_use_save_link) {
				object_url = get_URL().createObjectURL(blob);
				setTimeout(function() {
					save_link.href = object_url;
					save_link.download = name;
					click(save_link);
					dispatch_all();
					revoke(object_url);
					filesaver.readyState = filesaver.DONE;
				});
				return;
			}

			fs_error();
		}
		, FS_proto = FileSaver.prototype
		, saveAs = function(blob, name, no_auto_bom) {
			return new FileSaver(blob, name || blob.name || "download", no_auto_bom);
		};
	// IE 10+ (native saveAs)
	if (typeof navigator !== "undefined" && navigator.msSaveOrOpenBlob) {
		return function(blob, name, no_auto_bom) {
			name = name || blob.name || "download";

			if (!no_auto_bom) {
				blob = auto_bom(blob);
			}
			return navigator.msSaveOrOpenBlob(blob, name);
		};
	}

	FS_proto.abort = function(){};
	FS_proto.readyState = FS_proto.INIT = 0;
	FS_proto.WRITING = 1;
	FS_proto.DONE = 2;

	FS_proto.error =
	FS_proto.onwritestart =
	FS_proto.onprogress =
	FS_proto.onwrite =
	FS_proto.onabort =
	FS_proto.onerror =
	FS_proto.onwriteend =
		null;

	return saveAs;
}(
	   typeof self !== "undefined" && self
	|| typeof window !== "undefined" && window
	|| commonjsGlobal.content
));
// `self` is undefined in Firefox for Android content script context
// while `this` is nsIContentFrameMessageManager
// with an attribute `content` that corresponds to the window

if ('object' !== "undefined" && module.exports) {
  module.exports.saveAs = saveAs;
} else if ((typeof undefined !== "undefined" && undefined !== null) && (undefined.amd !== null)) {
  undefined("FileSaver.js", function() {
    return saveAs;
  });
}
});

/*
* Author    Jonathan Lurie - http://me.jonahanlurie.fr
*
* License   MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

//import JSZip from "jszip";
/**
* A PixpEncoder instance takes an Image2D or Image3D as input with `addInput(...)`
* and encode it so that it can be saved as a *.pixp file.
* An output filename can be specified using `.setMetadata("filename", "yourName.pixp");`,
* by default, the name is "untitled.pixp".
* When `update()` is called, a gzip blog is prepared as output[0] and can then be downloaded
* when calling the method `.download()`. The gzip blob could also be sent over AJAX
* using a third party library.
*
* **Usage**
* - [examples/savePixpFile.html](../examples/savePixpFile.html)
*/
class PixpEncoder extends Filter {
  constructor(){
    super();
    this.setMetadata("filename", "untitled.pixp");

  }


  /**
  * [PRIVATE]
  * overwrite the original from Filter
  * Only accept Image2D and Image3D
  */
  hasValidInput(){
    var input = this._getInput();
    return input && ( input.isOfType(Image2D.TYPE()) || input.isOfType(Image3D.TYPE()) );
  }


  _run(){

    if(! this.hasValidInput() ){
      console.warn("PixpEncoder can only encode Image2D and Image3D.");
      return;
    }

    var input = this._getInput();

    var arrayAndMeta = {
      dataType: input.getData().constructor.name, // typed array type
      data: Array.prototype.slice.call( input.getData() ),  // data of pixel/voxel
      metadata: input.getMetadataCopy(),  // Image2D/Image3D._metadata
      pixpipeType: input.constructor.name // most likely "Image2D", "Image3D", "MniVolume", "LineString", etc.
    };

    var pixpString = JSON.stringify( arrayAndMeta );

    var deflator = new index$1.Deflate({
      level: 6,
      //to: 'string',
      gzip: true,
      header: {
          text: true,
          time: + new Date(),
          comment: "This file was created by Pixpipe.js"
        }
    });

    deflator.push(pixpString, true);

    // making a blob to be saved
    this._output[0] = new Blob([deflator.result], {type: "application/gzip"} );
  }


  /**
  * Download the generated file
  */
  download(){
    var output = this.getOutput();

    if(output){
      FileSaver.saveAs( this.getOutput(), this.getMetadata("filename"));
    }else{
      console.warn("No output computed yet.");
    }
  }

} /* END of class PixpEncoder */

/*
* Author    Jonathan Lurie - http://me.jonahanlurie.fr
*
* License   MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

/**
* A PixpDecoder instance decodes a *.pixp file and output an Image2D or Image3D.
* The input, specified by `.addInput(...)` must be an ArrayBuffer
* (from an `UrlToArrayBufferFilter`, an `UrlToArrayBufferReader` or anothrer source ).
*
* **Usage**
* - [examples/pixpFileToImage2D.html](../examples/pixpFileToImage2D.html)
*/
class PixpDecoder extends Filter {
  constructor(){
    super();
    this.addInputValidator(0, ArrayBuffer);
  }


  _run(){

    if(! this.hasValidInput() ){
      console.warn("PixpDecoder can only decode ArrayBuffer.");
      return;
    }

    var input = this._getInput();

    //var pixpString2 = pako.inflate(input /*, { to: 'string' }*/);
    //var pixpObject = JSON.parse( pixpString2 );

    var inflator = new index$1.Inflate({
      level: 6,
      to: 'string'
    });

    inflator.push( input, true );

    // quit if not a gz file
    if( inflator.err ){
      console.warn("This file is not a Pixp file.");
      return;
    }
    
    var pixpObject = null;

    try{
      pixpObject = JSON.parse( inflator.result );
    }catch(e){
      console.warn("Could not parse pixp file.");
      console.error(e);
      return;
    }

    if( ! (pixpObject.pixpipeType in pixpipe)){
      console.warn("Unknown type pixpipe." + pixpObject.pixpipeType + ", cannot create any output." );
      return;
    }

    var constructorHost = null;
    
    try{
      constructorHost = window;
    }catch( e ){
      try{
        constructorHost = GLOBAL;
      }catch( e ){
        console.warn( "You are not in a Javascript environment?? Weird." );
        return;
      }
    }
    
    if(! constructorHost[ pixpObject.dataType ]){
      console.warn( "Data array from pixp file is unknown: " + pixpObject.dataType );
      return;
    }

    var outputRawData = new constructorHost[ pixpObject.dataType ]( pixpObject.data );
    var output = new pixpipe[ pixpObject.pixpipeType ];
    output.setRawData( outputRawData );
    output.setRawMetadata( pixpObject.metadata );

    this._output[0] = output;

  }



} /* END of class PixpDecoder */

/*
* Author    Jonathan Lurie - http://me.jonahanlurie.fr
*           Robert D. Vincent
*
* License   MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

/**
* Decodes a MGH file.
* Takes an ArrayBuffer as input (0) and output a `MniVolume` (which inherit `Image3D`).
*
* **Usage**
* - [examples/fileToMgh.html](../examples/fileToMgh.html)
*/
class MghDecoder extends Filter {
  
  constructor() {
    super();
    this.addInputValidator(0, ArrayBuffer);
    this.setMetadata("debug", false);
  }
  
  
  /* Function to parse the basic MGH header. This is a 284-byte binary
   * object that begins at offset zero in the file.
   * The resulting header object will contain the following fields:
   *
   * header.order[] - An array of strings that gives the order of the
   * spatial dimensions.
   * header.xspace - Description of the X axis (patient left to right)
   * header.yspace - Description of the Y axis (patient posterior to anterior)
   * header.zspace - Description of the Z axis (patient inferior to superior)
   * header.time - Description of time axis, if any.

   * Non-standard fields used internally only:
   *
   * header.nvoxels - Total number of voxels in the image.
   * header.datatype - MGH data type of image.
   * header.little_endian - True if data is little endian (should be false!)
   */
  _parseMGHHeader(raw_data, callback) {
    var header = {
      order: ["xspace", "yspace", "zspace"],
      xspace: {},
      yspace: {},
      zspace: {}
    };
    var error_message;
    var dview = new DataView(raw_data, 0, 284);
    var little_endian = true;

    /* Read the header version, which should always have the value
     * 0x00000001. We use this to test the endian-ness of the data,
     * but it should always be big-endian.
     */
    var hdr_version = dview.getUint32(0, true);
    if (hdr_version === 0x00000001) {
      little_endian = true;
    } else if (hdr_version === 0x01000000) {
      little_endian = false;    // Generally files are big-endian.
    }
    else {
      console.warn( "This does not look like an MGH file." );
      return null;
    }

    /* Now read the dimension lengths. There are at most 4 dimensions
     * in the file. The lengths fields are always present, but they
     * unused dimensions may have the value 0 or 1.
     */
    var ndims = 0;
    var sizes = [0, 0, 0, 0];
    var header_offset = 4;
    var nvoxels = 1;
    for (ndims = 0; ndims < 4; ndims++) {
      sizes[ndims] = dview.getUint32(header_offset, little_endian);
      if (sizes[ndims] <= 1) {
        break;
      }
      nvoxels *= sizes[ndims];
      header_offset += 4;
    }

    if (ndims < 3 || ndims > 4) {
      console.warn( "Cannot handle " + ndims + "-dimensional images yet." );
      return null;
    }

    var datatype = dview.getUint32(20, little_endian);
    // IGNORED var dof = dview.getUint32(24, little_endian);
    var good_transform_flag = dview.getUint16(28, little_endian);
    var spacing = [1.0, 1.0, 1.0];
    var i, j;
    var dircos = [
      [-1.0,  0.0,  0.0],
      [ 0.0,  0.0, -1.0],
      [ 0.0,  1.0,  0.0],
      [ 0.0,  0.0,  0.0]
    ];
    if (good_transform_flag) {
      header_offset = 30;
      for (i = 0; i < 3; i++) {
        spacing[i] = dview.getFloat32(header_offset, little_endian);
        header_offset += 4;
      }
      for (i = 0; i < 4; i++) {
        for (j = 0; j < 3; j++) {
          dircos[i][j] = dview.getFloat32(header_offset, little_endian);
          header_offset += 4;
        }
      }
    }

    if ( this._metadata.debug ) {
      // Prints out the transform in a format similar to the output
      // of FreeSurfer's mri_info tool.
      //
      for (i = 0; i < 3; i++) {
        var s1 = "";
        for (j = 0; j < 4; j++) {
          s1 += "xyzc"[j] + "_" + "ras"[i] + " " + dircos[j][i] + " ";
        }
        console.log(s1);
      }
    }

    var axis_index_from_file = [0, 1, 2];

    for ( var axis = 0; axis < 3; axis++) {
      var spatial_axis = 0;
      var c_x = Math.abs(dircos[axis][0]);
      var c_y = Math.abs(dircos[axis][1]);
      var c_z = Math.abs(dircos[axis][2]);

      header.order[axis] = "xspace";
      if (c_y > c_x && c_y > c_z) {
        spatial_axis = 1;
        header.order[axis] = "yspace";
      }
      if (c_z > c_x && c_z > c_y) {
        spatial_axis = 2;
        header.order[axis] = "zspace";
      }
      axis_index_from_file[axis] = spatial_axis;
    }

    /* If there are four dimensions, assume the last is the time
     * dimension. I use default values for step and start because as
     * far as I know MGH files do not carry any descriptive
     * information about the 4th dimension.
     */
    if (ndims === 4) {
      if (this._metadata.debug) {
        console.log("Creating time dimension: " + sizes[3]);
      }
      header.time = {
        space_length: sizes[3],
        step: 1,
        start: 0,
        name: "time"
      };
      header.order.push("time");
    }

    /** This is here because there are two different ways of interpreting
      * the origin of an MGH file. One can ignore the offsets in the
      * transform, using the centre of the voxel grid. Or you can correct
      * these naive grid centres using the values stored in the transform.
      * The first approach is what is used by surface files, so to get them
      * to register nicely, we want ignore_offsets to be true. However,
      * getting volumetric files to register correctly implies setting
      * ignore_offsets to false.
      */
    var ignore_offsets = false;
    var mgh_xform = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ];
    for (i = 0; i < 3; i++) {
      for (j = 0; j < 3; j++) {
        mgh_xform[i][j] = dircos[j][i] * spacing[i];
      }
    }

    for (i = 0; i < 3; i++) {
      var temp = 0.0;
      for (j = 0; j < 3; j++) {
        temp += mgh_xform[i][j] * (sizes[j] / 2.0);
      }

      if (ignore_offsets) {
        mgh_xform[i][4 - 1] = -temp;
      }
      else {
        mgh_xform[i][4 - 1] = dircos[4 - 1][i] - temp;
      }
    }

    var transform = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ];

    for (i = 0; i < 3; i++) {
      for (j = 0; j < 4; j++) {
        var volume_axis = j;
        if (j < 3) {
          volume_axis = axis_index_from_file[j];
        }
        transform[i][volume_axis] = mgh_xform[i][j];
      }
    }

    // Now that we have the transform, need to convert it to MINC-like
    // steps and direction_cosines.

    MniVolume.transformToMinc(transform, header);

    // Save the datatype so that we can refer to it later.
    header.datatype = datatype;
    header.little_endian = little_endian;
    header.nvoxels = nvoxels;

    // Save the voxel dimension lengths.
    for (i = 0; i < 3; i++) {
      header[header.order[i]].space_length = sizes[i];
    }

    return header;
  }
  
  
  _createMGHData(header, raw_data) {
    
    var native_data = null;
    var bytes_per_voxel = 1;

    switch (header.datatype) {
    case 0:                     // Unsigned characters.
      bytes_per_voxel = 1;
      break;
    case 1:                     // 4-byte signed integers.
    case 3:                     // 4-byte float.
      bytes_per_voxel = 4;
      break;
    case 4:                     // 2-byte signed integers.
      bytes_per_voxel = 2;
      break;
    default:
      console.warn( "Unsupported data type: " + header.datatype );
      return null;
    }

    var nbytes = header.nvoxels * bytes_per_voxel;

    if (bytes_per_voxel > 1 && !header.little_endian) {
      MniVolume.swapn( new Uint8Array(raw_data, 284, nbytes), bytes_per_voxel );
    }

    switch (header.datatype) {
    case 0:                     // unsigned char
      native_data = new Uint8Array(raw_data, 284, header.nvoxels);
      break;
    case 1:                     // signed int
      native_data = new Int32Array(raw_data, 284, header.nvoxels);
      break;
    case 3:
      native_data = new Float32Array(raw_data, 284, header.nvoxels);
      break;
    case 4:                     // signed short
      native_data = new Int16Array(raw_data, 284, header.nvoxels);
      break;
    }

    // Incrementation offsets for each dimension of the volume. MGH
    // files store the fastest-varying dimension _first_, so the
    // "first" dimension actually has the smallest offset. That is
    // why this calculation is different from that for NIfTI-1.
    //
    var offset = 1;
    for (var d = 0; d < header.order.length; d++) {
      header[header.order[d]].offset = offset;
      offset *= header[header.order[d]].space_length;
    }
    return native_data;

  }

  
  _run(){
    var inputBuffer = this._getInput(0);

    if(!inputBuffer){
      console.warn("MghDecoder requires an ArrayBuffer as input \"0\". Unable to continue.");
      return;
    }

    var header = this._parseMGHHeader( inputBuffer );

    // abort if header not valid
    if(!header)
      return;


    var dataArray = this._createMGHData(header, inputBuffer);
    
    if(!dataArray)
      return null;

    // add the output to this filter
    this._addOutput(MniVolume);
    var mniVol = this.getOutput();
    mniVol.setData(dataArray, header);
    mniVol.setMetadata("format", "mgh");
    
  }
  
} /* END of class MghDecoder */

/*
* Author    Jonathan Lurie - http://me.jonahanlurie.fr
*
* License   MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

/**
* A PixBinDecoder instance decodes a *.pixp file and output an Image2D or Image3D.
* The input, specified by `.addInput(...)` must be an ArrayBuffer
* (from an `UrlToArrayBufferFilter`, an `UrlToArrayBufferReader` or anothrer source ).
*
* **Usage**
* - [examples/pixpFileToImage2D.html](../examples/pixpFileToImage2D.html)
*/
class PixBinDecoder extends Filter {
  constructor(){
    super();
    this.addInputValidator(0, ArrayBuffer);
  }


  _run(){

    if(! this.hasValidInput() ){
      console.warn("PixBinDecoder can only decode ArrayBuffer.");
      return;
    }

    var input = this._getInput();
    var inputByteLength = input.byteLength;

    // the view to decode the buffer
    var view = new DataView( input );
    var offsetFromHere = 0;
    
    // fetch the extendedMetadata string length
    var extendedMetadataStringLength = view.getUint32( offsetFromHere );
    offsetFromHere += 4;
    
    // getting extendedMetadata
    var extendedMetadataBytes = new Uint8Array(input, offsetFromHere, extendedMetadataStringLength);
    var extendedMetadata = JSON.parse( String.fromCharCode( ...extendedMetadataBytes ) );
    offsetFromHere += extendedMetadataStringLength;
    
    // getting the data
    var constructorHost = null;
    
    try{
      constructorHost = window; // in a web browser
    }catch( e ){
      try{
        constructorHost = GLOBAL; // in node
      }catch( e ){
        console.warn( "You are not in a Javascript environment?? Weird." );
        return;
      }
    }
    
    if(! constructorHost[ extendedMetadata.dataType ]){
      console.warn( "Data array from pixb file is unknown: " + extendedMetadata.dataType );
      return;
    }
    
    /*
      There is a known issues in JS that a TypedArray cannot be created starting at a non-multiple-of-2 start offset 
      if the type of data within this array is supposed to take more than one byte (ie. Uint16, Float32, etc.).
      The error is stated like that (in Chrome):
      "Uncaught RangeError: start offset of Uint16Array should be a multiple of 2"
      When it comes to Float32, Chrome wants an offset that is multiple of 4, and so on.
      
      The workaround is to slice the buffer to take only the data part of it (basically to remove what is before)
      so that this new array starts with an offset 0, no matter what was before.
    */
    
    var data = new constructorHost[ extendedMetadata.dataType ]( input.slice( offsetFromHere ) );
    
    var output = new pixpipe[ extendedMetadata.pixpipeType ];
    output.setRawData( data );
    output.setRawMetadata( extendedMetadata.metadata );

    this._output[0] = output;
  }


} /* END of class PixBinDecoder */

/*
* Author    Jonathan Lurie - http://me.jonahanlurie.fr
*
* License   MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


// decoders
/**
* An instance of Image3DGenericDecoder takes a ArrayBuffer 
* as input 0 (`.addInput(myArrayBuffer)`) and output an Image3D.
* The `update` method will perform several decoding attempts, using the readers
* specified in the constructor.
* In case of success (one of the registered decoder was compatible to the data)
* the metadata `decoderConstructor` and `decoderName` are made accessible and give
* information about the file format. If no decoder managed to decode the input buffer,
* this filter will not have any output.
*
* Developers: if a new 3D dataset decoder is added, reference it here.
*/
class Image3DGenericDecoder extends Filter {
  
  constructor(){
    super();
    
    this._decoders = [
      Minc2Decoder,
      NiftiDecoder,
      MghDecoder,
      PixpDecoder,
      PixBinDecoder
    ];
  }
  
  
  _run(){
    var inputBuffer = this._getInput(0);
    
    if(!inputBuffer){
      console.warn("The input buffer must not be null.");
      return;
    }
    
    // try with each decoder
    for(var d=0; d<this._decoders.length; d++){
      var decoder = new this._decoders[d]();
      decoder.addInput( inputBuffer );
      decoder.update();
      
      if(decoder.getNumberOfOutputs()){
        this._output[0] = decoder.getOutput();
        this.setMetadata("decoderConstructor", this._decoders[d]);
        this.setMetadata("decoderName", this._decoders[d].name);
        break;
      }
    }
  }
  
  
} /* END of class Image3DGenericDecoder */

//[4]   	NameStartChar	   ::=   	":" | [A-Z] | "_" | [a-z] | [#xC0-#xD6] | [#xD8-#xF6] | [#xF8-#x2FF] | [#x370-#x37D] | [#x37F-#x1FFF] | [#x200C-#x200D] | [#x2070-#x218F] | [#x2C00-#x2FEF] | [#x3001-#xD7FF] | [#xF900-#xFDCF] | [#xFDF0-#xFFFD] | [#x10000-#xEFFFF]
//[4a]   	NameChar	   ::=   	NameStartChar | "-" | "." | [0-9] | #xB7 | [#x0300-#x036F] | [#x203F-#x2040]
//[5]   	Name	   ::=   	NameStartChar (NameChar)*
var nameStartChar = /[A-Z_a-z\xC0-\xD6\xD8-\xF6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/;//\u10000-\uEFFFF
var nameChar = new RegExp("[\\-\\.0-9"+nameStartChar.source.slice(1,-1)+"\\u00B7\\u0300-\\u036F\\u203F-\\u2040]");
var tagNamePattern = new RegExp('^'+nameStartChar.source+nameChar.source+'*(?:\:'+nameStartChar.source+nameChar.source+'*)?$');
//var tagNamePattern = /^[a-zA-Z_][\w\-\.]*(?:\:[a-zA-Z_][\w\-\.]*)?$/
//var handlers = 'resolveEntity,getExternalSubset,characters,endDocument,endElement,endPrefixMapping,ignorableWhitespace,processingInstruction,setDocumentLocator,skippedEntity,startDocument,startElement,startPrefixMapping,notationDecl,unparsedEntityDecl,error,fatalError,warning,attributeDecl,elementDecl,externalEntityDecl,internalEntityDecl,comment,endCDATA,endDTD,endEntity,startCDATA,startDTD,startEntity'.split(',')

//S_TAG,	S_ATTR,	S_EQ,	S_ATTR_NOQUOT_VALUE
//S_ATTR_SPACE,	S_ATTR_END,	S_TAG_SPACE, S_TAG_CLOSE
var S_TAG = 0;//tag name offerring
var S_ATTR = 1;//attr name offerring 
var S_ATTR_SPACE=2;//attr name end and space offer
var S_EQ = 3;//=space?
var S_ATTR_NOQUOT_VALUE = 4;//attr value(no quot value only)
var S_ATTR_END = 5;//attr value end and no space(quot end)
var S_TAG_SPACE = 6;//(attr value end || tag end ) && (space offer)
var S_TAG_CLOSE = 7;//closed el<el />

function XMLReader(){
	
}

XMLReader.prototype = {
	parse:function(source,defaultNSMap,entityMap){
		var domBuilder = this.domBuilder;
		domBuilder.startDocument();
		_copy(defaultNSMap ,defaultNSMap = {});
		parse(source,defaultNSMap,entityMap,
				domBuilder,this.errorHandler);
		domBuilder.endDocument();
	}
};
function parse(source,defaultNSMapCopy,entityMap,domBuilder,errorHandler){
	function fixedFromCharCode(code) {
		// String.prototype.fromCharCode does not supports
		// > 2 bytes unicode chars directly
		if (code > 0xffff) {
			code -= 0x10000;
			var surrogate1 = 0xd800 + (code >> 10)
				, surrogate2 = 0xdc00 + (code & 0x3ff);

			return String.fromCharCode(surrogate1, surrogate2);
		} else {
			return String.fromCharCode(code);
		}
	}
	function entityReplacer(a){
		var k = a.slice(1,-1);
		if(k in entityMap){
			return entityMap[k]; 
		}else if(k.charAt(0) === '#'){
			return fixedFromCharCode(parseInt(k.substr(1).replace('x','0x')))
		}else{
			errorHandler.error('entity not found:'+a);
			return a;
		}
	}
	function appendText(end){//has some bugs
		if(end>start){
			var xt = source.substring(start,end).replace(/&#?\w+;/g,entityReplacer);
			locator&&position(start);
			domBuilder.characters(xt,0,end-start);
			start = end;
		}
	}
	function position(p,m){
		while(p>=lineEnd && (m = linePattern.exec(source))){
			lineStart = m.index;
			lineEnd = lineStart + m[0].length;
			locator.lineNumber++;
			//console.log('line++:',locator,startPos,endPos)
		}
		locator.columnNumber = p-lineStart+1;
	}
	var lineStart = 0;
	var lineEnd = 0;
	var linePattern = /.*(?:\r\n?|\n)|.*$/g;
	var locator = domBuilder.locator;
	
	var parseStack = [{currentNSMap:defaultNSMapCopy}];
	var closeMap = {};
	var start = 0;
	while(true){
		try{
			var tagStart = source.indexOf('<',start);
			if(tagStart<0){
				if(!source.substr(start).match(/^\s*$/)){
					var doc = domBuilder.doc;
	    			var text = doc.createTextNode(source.substr(start));
	    			doc.appendChild(text);
	    			domBuilder.currentElement = text;
				}
				return;
			}
			if(tagStart>start){
				appendText(tagStart);
			}
			switch(source.charAt(tagStart+1)){
			case '/':
				var end = source.indexOf('>',tagStart+3);
				var tagName = source.substring(tagStart+2,end);
				var config = parseStack.pop();
				if(end<0){
					
	        		tagName = source.substring(tagStart+2).replace(/[\s<].*/,'');
	        		//console.error('#@@@@@@'+tagName)
	        		errorHandler.error("end tag name: "+tagName+' is not complete:'+config.tagName);
	        		end = tagStart+1+tagName.length;
	        	}else if(tagName.match(/\s</)){
	        		tagName = tagName.replace(/[\s<].*/,'');
	        		errorHandler.error("end tag name: "+tagName+' maybe not complete');
	        		end = tagStart+1+tagName.length;
				}
				//console.error(parseStack.length,parseStack)
				//console.error(config);
				var localNSMap = config.localNSMap;
				var endMatch = config.tagName == tagName;
				var endIgnoreCaseMach = endMatch || config.tagName&&config.tagName.toLowerCase() == tagName.toLowerCase();
		        if(endIgnoreCaseMach){
		        	domBuilder.endElement(config.uri,config.localName,tagName);
					if(localNSMap){
						for(var prefix in localNSMap){
							domBuilder.endPrefixMapping(prefix) ;
						}
					}
					if(!endMatch){
		            	errorHandler.fatalError("end tag name: "+tagName+' is not match the current start tagName:'+config.tagName );
					}
		        }else{
		        	parseStack.push(config);
		        }
				
				end++;
				break;
				// end elment
			case '?':// <?...?>
				locator&&position(tagStart);
				end = parseInstruction(source,tagStart,domBuilder);
				break;
			case '!':// <!doctype,<![CDATA,<!--
				locator&&position(tagStart);
				end = parseDCC(source,tagStart,domBuilder,errorHandler);
				break;
			default:
				locator&&position(tagStart);
				var el = new ElementAttributes();
				var currentNSMap = parseStack[parseStack.length-1].currentNSMap;
				//elStartEnd
				var end = parseElementStartPart(source,tagStart,el,currentNSMap,entityReplacer,errorHandler);
				var len = el.length;
				
				
				if(!el.closed && fixSelfClosed(source,end,el.tagName,closeMap)){
					el.closed = true;
					if(!entityMap.nbsp){
						errorHandler.warning('unclosed xml attribute');
					}
				}
				if(locator && len){
					var locator2 = copyLocator(locator,{});
					//try{//attribute position fixed
					for(var i = 0;i<len;i++){
						var a = el[i];
						position(a.offset);
						a.locator = copyLocator(locator,{});
					}
					//}catch(e){console.error('@@@@@'+e)}
					domBuilder.locator = locator2;
					if(appendElement(el,domBuilder,currentNSMap)){
						parseStack.push(el);
					}
					domBuilder.locator = locator;
				}else{
					if(appendElement(el,domBuilder,currentNSMap)){
						parseStack.push(el);
					}
				}
				
				
				
				if(el.uri === 'http://www.w3.org/1999/xhtml' && !el.closed){
					end = parseHtmlSpecialContent(source,end,el.tagName,entityReplacer,domBuilder);
				}else{
					end++;
				}
			}
		}catch(e){
			errorHandler.error('element parse error: '+e);
			//errorHandler.error('element parse error: '+e);
			end = -1;
			//throw e;
		}
		if(end>start){
			start = end;
		}else{
			//TODO: 这里有可能sax回退，有位置错误风险
			appendText(Math.max(tagStart,start)+1);
		}
	}
}
function copyLocator(f,t){
	t.lineNumber = f.lineNumber;
	t.columnNumber = f.columnNumber;
	return t;
}

/**
 * @see #appendElement(source,elStartEnd,el,selfClosed,entityReplacer,domBuilder,parseStack);
 * @return end of the elementStartPart(end of elementEndPart for selfClosed el)
 */
function parseElementStartPart(source,start,el,currentNSMap,entityReplacer,errorHandler){
	var attrName;
	var value;
	var p = ++start;
	var s = S_TAG;//status
	while(true){
		var c = source.charAt(p);
		switch(c){
		case '=':
			if(s === S_ATTR){//attrName
				attrName = source.slice(start,p);
				s = S_EQ;
			}else if(s === S_ATTR_SPACE){
				s = S_EQ;
			}else{
				//fatalError: equal must after attrName or space after attrName
				throw new Error('attribute equal must after attrName');
			}
			break;
		case '\'':
		case '"':
			if(s === S_EQ || s === S_ATTR //|| s == S_ATTR_SPACE
				){//equal
				if(s === S_ATTR){
					errorHandler.warning('attribute value must after "="');
					attrName = source.slice(start,p);
				}
				start = p+1;
				p = source.indexOf(c,start);
				if(p>0){
					value = source.slice(start,p).replace(/&#?\w+;/g,entityReplacer);
					el.add(attrName,value,start-1);
					s = S_ATTR_END;
				}else{
					//fatalError: no end quot match
					throw new Error('attribute value no end \''+c+'\' match');
				}
			}else if(s == S_ATTR_NOQUOT_VALUE){
				value = source.slice(start,p).replace(/&#?\w+;/g,entityReplacer);
				//console.log(attrName,value,start,p)
				el.add(attrName,value,start);
				//console.dir(el)
				errorHandler.warning('attribute "'+attrName+'" missed start quot('+c+')!!');
				start = p+1;
				s = S_ATTR_END;
			}else{
				//fatalError: no equal before
				throw new Error('attribute value must after "="');
			}
			break;
		case '/':
			switch(s){
			case S_TAG:
				el.setTagName(source.slice(start,p));
			case S_ATTR_END:
			case S_TAG_SPACE:
			case S_TAG_CLOSE:
				s =S_TAG_CLOSE;
				el.closed = true;
			case S_ATTR_NOQUOT_VALUE:
			case S_ATTR:
			case S_ATTR_SPACE:
				break;
			//case S_EQ:
			default:
				throw new Error("attribute invalid close char('/')")
			}
			break;
		case ''://end document
			//throw new Error('unexpected end of input')
			errorHandler.error('unexpected end of input');
			if(s == S_TAG){
				el.setTagName(source.slice(start,p));
			}
			return p;
		case '>':
			switch(s){
			case S_TAG:
				el.setTagName(source.slice(start,p));
			case S_ATTR_END:
			case S_TAG_SPACE:
			case S_TAG_CLOSE:
				break;//normal
			case S_ATTR_NOQUOT_VALUE://Compatible state
			case S_ATTR:
				value = source.slice(start,p);
				if(value.slice(-1) === '/'){
					el.closed  = true;
					value = value.slice(0,-1);
				}
			case S_ATTR_SPACE:
				if(s === S_ATTR_SPACE){
					value = attrName;
				}
				if(s == S_ATTR_NOQUOT_VALUE){
					errorHandler.warning('attribute "'+value+'" missed quot(")!!');
					el.add(attrName,value.replace(/&#?\w+;/g,entityReplacer),start);
				}else{
					if(currentNSMap[''] !== 'http://www.w3.org/1999/xhtml' || !value.match(/^(?:disabled|checked|selected)$/i)){
						errorHandler.warning('attribute "'+value+'" missed value!! "'+value+'" instead!!');
					}
					el.add(value,value,start);
				}
				break;
			case S_EQ:
				throw new Error('attribute value missed!!');
			}
//			console.log(tagName,tagNamePattern,tagNamePattern.test(tagName))
			return p;
		/*xml space '\x20' | #x9 | #xD | #xA; */
		case '\u0080':
			c = ' ';
		default:
			if(c<= ' '){//space
				switch(s){
				case S_TAG:
					el.setTagName(source.slice(start,p));//tagName
					s = S_TAG_SPACE;
					break;
				case S_ATTR:
					attrName = source.slice(start,p);
					s = S_ATTR_SPACE;
					break;
				case S_ATTR_NOQUOT_VALUE:
					var value = source.slice(start,p).replace(/&#?\w+;/g,entityReplacer);
					errorHandler.warning('attribute "'+value+'" missed quot(")!!');
					el.add(attrName,value,start);
				case S_ATTR_END:
					s = S_TAG_SPACE;
					break;
				//case S_TAG_SPACE:
				//case S_EQ:
				//case S_ATTR_SPACE:
				//	void();break;
				//case S_TAG_CLOSE:
					//ignore warning
				}
			}else{//not space
//S_TAG,	S_ATTR,	S_EQ,	S_ATTR_NOQUOT_VALUE
//S_ATTR_SPACE,	S_ATTR_END,	S_TAG_SPACE, S_TAG_CLOSE
				switch(s){
				//case S_TAG:void();break;
				//case S_ATTR:void();break;
				//case S_ATTR_NOQUOT_VALUE:void();break;
				case S_ATTR_SPACE:
					var tagName =  el.tagName;
					if(currentNSMap[''] !== 'http://www.w3.org/1999/xhtml' || !attrName.match(/^(?:disabled|checked|selected)$/i)){
						errorHandler.warning('attribute "'+attrName+'" missed value!! "'+attrName+'" instead2!!');
					}
					el.add(attrName,attrName,start);
					start = p;
					s = S_ATTR;
					break;
				case S_ATTR_END:
					errorHandler.warning('attribute space is required"'+attrName+'"!!');
				case S_TAG_SPACE:
					s = S_ATTR;
					start = p;
					break;
				case S_EQ:
					s = S_ATTR_NOQUOT_VALUE;
					start = p;
					break;
				case S_TAG_CLOSE:
					throw new Error("elements closed character '/' and '>' must be connected to");
				}
			}
		}//end outer switch
		//console.log('p++',p)
		p++;
	}
}
/**
 * @return true if has new namespace define
 */
function appendElement(el,domBuilder,currentNSMap){
	var tagName = el.tagName;
	var localNSMap = null;
	//var currentNSMap = parseStack[parseStack.length-1].currentNSMap;
	var i = el.length;
	while(i--){
		var a = el[i];
		var qName = a.qName;
		var value = a.value;
		var nsp = qName.indexOf(':');
		if(nsp>0){
			var prefix = a.prefix = qName.slice(0,nsp);
			var localName = qName.slice(nsp+1);
			var nsPrefix = prefix === 'xmlns' && localName;
		}else{
			localName = qName;
			prefix = null;
			nsPrefix = qName === 'xmlns' && '';
		}
		//can not set prefix,because prefix !== ''
		a.localName = localName ;
		//prefix == null for no ns prefix attribute 
		if(nsPrefix !== false){//hack!!
			if(localNSMap == null){
				localNSMap = {};
				//console.log(currentNSMap,0)
				_copy(currentNSMap,currentNSMap={});
				//console.log(currentNSMap,1)
			}
			currentNSMap[nsPrefix] = localNSMap[nsPrefix] = value;
			a.uri = 'http://www.w3.org/2000/xmlns/';
			domBuilder.startPrefixMapping(nsPrefix, value); 
		}
	}
	var i = el.length;
	while(i--){
		a = el[i];
		var prefix = a.prefix;
		if(prefix){//no prefix attribute has no namespace
			if(prefix === 'xml'){
				a.uri = 'http://www.w3.org/XML/1998/namespace';
			}if(prefix !== 'xmlns'){
				a.uri = currentNSMap[prefix || ''];
				
				//{console.log('###'+a.qName,domBuilder.locator.systemId+'',currentNSMap,a.uri)}
			}
		}
	}
	var nsp = tagName.indexOf(':');
	if(nsp>0){
		prefix = el.prefix = tagName.slice(0,nsp);
		localName = el.localName = tagName.slice(nsp+1);
	}else{
		prefix = null;//important!!
		localName = el.localName = tagName;
	}
	//no prefix element has default namespace
	var ns = el.uri = currentNSMap[prefix || ''];
	domBuilder.startElement(ns,localName,tagName,el);
	//endPrefixMapping and startPrefixMapping have not any help for dom builder
	//localNSMap = null
	if(el.closed){
		domBuilder.endElement(ns,localName,tagName);
		if(localNSMap){
			for(prefix in localNSMap){
				domBuilder.endPrefixMapping(prefix); 
			}
		}
	}else{
		el.currentNSMap = currentNSMap;
		el.localNSMap = localNSMap;
		//parseStack.push(el);
		return true;
	}
}
function parseHtmlSpecialContent(source,elStartEnd,tagName,entityReplacer,domBuilder){
	if(/^(?:script|textarea)$/i.test(tagName)){
		var elEndStart =  source.indexOf('</'+tagName+'>',elStartEnd);
		var text = source.substring(elStartEnd+1,elEndStart);
		if(/[&<]/.test(text)){
			if(/^script$/i.test(tagName)){
				//if(!/\]\]>/.test(text)){
					//lexHandler.startCDATA();
					domBuilder.characters(text,0,text.length);
					//lexHandler.endCDATA();
					return elEndStart;
				//}
			}//}else{//text area
				text = text.replace(/&#?\w+;/g,entityReplacer);
				domBuilder.characters(text,0,text.length);
				return elEndStart;
			//}
			
		}
	}
	return elStartEnd+1;
}
function fixSelfClosed(source,elStartEnd,tagName,closeMap){
	//if(tagName in closeMap){
	var pos = closeMap[tagName];
	if(pos == null){
		//console.log(tagName)
		pos =  source.lastIndexOf('</'+tagName+'>');
		if(pos<elStartEnd){//忘记闭合
			pos = source.lastIndexOf('</'+tagName);
		}
		closeMap[tagName] =pos;
	}
	return pos<elStartEnd;
	//} 
}
function _copy(source,target){
	for(var n in source){target[n] = source[n];}
}
function parseDCC(source,start,domBuilder,errorHandler){//sure start with '<!'
	var next= source.charAt(start+2);
	switch(next){
	case '-':
		if(source.charAt(start + 3) === '-'){
			var end = source.indexOf('-->',start+4);
			//append comment source.substring(4,end)//<!--
			if(end>start){
				domBuilder.comment(source,start+4,end-start-4);
				return end+3;
			}else{
				errorHandler.error("Unclosed comment");
				return -1;
			}
		}else{
			//error
			return -1;
		}
	default:
		if(source.substr(start+3,6) == 'CDATA['){
			var end = source.indexOf(']]>',start+9);
			domBuilder.startCDATA();
			domBuilder.characters(source,start+9,end-start-9);
			domBuilder.endCDATA(); 
			return end+3;
		}
		//<!DOCTYPE
		//startDTD(java.lang.String name, java.lang.String publicId, java.lang.String systemId) 
		var matchs = split(source,start);
		var len = matchs.length;
		if(len>1 && /!doctype/i.test(matchs[0][0])){
			var name = matchs[1][0];
			var pubid = len>3 && /^public$/i.test(matchs[2][0]) && matchs[3][0];
			var sysid = len>4 && matchs[4][0];
			var lastMatch = matchs[len-1];
			domBuilder.startDTD(name,pubid && pubid.replace(/^(['"])(.*?)\1$/,'$2'),
					sysid && sysid.replace(/^(['"])(.*?)\1$/,'$2'));
			domBuilder.endDTD();
			
			return lastMatch.index+lastMatch[0].length
		}
	}
	return -1;
}



function parseInstruction(source,start,domBuilder){
	var end = source.indexOf('?>',start);
	if(end){
		var match = source.substring(start,end).match(/^<\?(\S*)\s*([\s\S]*?)\s*$/);
		if(match){
			var len = match[0].length;
			domBuilder.processingInstruction(match[1], match[2]) ;
			return end+2;
		}else{//error
			return -1;
		}
	}
	return -1;
}

/**
 * @param source
 */
function ElementAttributes(source){
	
}
ElementAttributes.prototype = {
	setTagName:function(tagName){
		if(!tagNamePattern.test(tagName)){
			throw new Error('invalid tagName:'+tagName)
		}
		this.tagName = tagName;
	},
	add:function(qName,value,offset){
		if(!tagNamePattern.test(qName)){
			throw new Error('invalid attribute:'+qName)
		}
		this[this.length++] = {qName:qName,value:value,offset:offset};
	},
	length:0,
	getLocalName:function(i){return this[i].localName},
	getLocator:function(i){return this[i].locator},
	getQName:function(i){return this[i].qName},
	getURI:function(i){return this[i].uri},
	getValue:function(i){return this[i].value}
//	,getIndex:function(uri, localName)){
//		if(localName){
//			
//		}else{
//			var qName = uri
//		}
//	},
//	getValue:function(){return this.getValue(this.getIndex.apply(this,arguments))},
//	getType:function(uri,localName){}
//	getType:function(i){},
};




function _set_proto_(thiz,parent){
	thiz.__proto__ = parent;
	return thiz;
}
if(!(_set_proto_({},_set_proto_.prototype) instanceof _set_proto_)){
	_set_proto_ = function(thiz,parent){
		function p(){}
		p.prototype = parent;
		p = new p();
		for(parent in thiz){
			p[parent] = thiz[parent];
		}
		return p;
	};
}

function split(source,start){
	var match;
	var buf = [];
	var reg = /'[^']+'|"[^"]+"|[^\s<>\/=]+=?|(\/?\s*>|<)/g;
	reg.lastIndex = start;
	reg.exec(source);//skip <
	while(match = reg.exec(source)){
		buf.push(match);
		if(match[1])return buf;
	}
}

var XMLReader_1 = XMLReader;

var sax = {
	XMLReader: XMLReader_1
};

/*
 * DOM Level 2
 * Object DOMException
 * @see http://www.w3.org/TR/REC-DOM-Level-1/ecma-script-language-binding.html
 * @see http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/ecma-script-binding.html
 */

function copy(src,dest){
	for(var p in src){
		dest[p] = src[p];
	}
}
/**
^\w+\.prototype\.([_\w]+)\s*=\s*((?:.*\{\s*?[\r\n][\s\S]*?^})|\S.*?(?=[;\r\n]));?
^\w+\.prototype\.([_\w]+)\s*=\s*(\S.*?(?=[;\r\n]));?
 */
function _extends(Class,Super){
	var pt = Class.prototype;
	if(Object.create){
		var ppt = Object.create(Super.prototype);
		pt.__proto__ = ppt;
	}
	if(!(pt instanceof Super)){
		function t(){}
		t.prototype = Super.prototype;
		t = new t();
		copy(pt,t);
		Class.prototype = pt = t;
	}
	if(pt.constructor != Class){
		if(typeof Class != 'function'){
			console.error("unknow Class:"+Class);
		}
		pt.constructor = Class;
	}
}
var htmlns = 'http://www.w3.org/1999/xhtml';
// Node Types
var NodeType = {};
var ELEMENT_NODE                = NodeType.ELEMENT_NODE                = 1;
var ATTRIBUTE_NODE              = NodeType.ATTRIBUTE_NODE              = 2;
var TEXT_NODE                   = NodeType.TEXT_NODE                   = 3;
var CDATA_SECTION_NODE          = NodeType.CDATA_SECTION_NODE          = 4;
var ENTITY_REFERENCE_NODE       = NodeType.ENTITY_REFERENCE_NODE       = 5;
var ENTITY_NODE                 = NodeType.ENTITY_NODE                 = 6;
var PROCESSING_INSTRUCTION_NODE = NodeType.PROCESSING_INSTRUCTION_NODE = 7;
var COMMENT_NODE                = NodeType.COMMENT_NODE                = 8;
var DOCUMENT_NODE               = NodeType.DOCUMENT_NODE               = 9;
var DOCUMENT_TYPE_NODE          = NodeType.DOCUMENT_TYPE_NODE          = 10;
var DOCUMENT_FRAGMENT_NODE      = NodeType.DOCUMENT_FRAGMENT_NODE      = 11;
var NOTATION_NODE               = NodeType.NOTATION_NODE               = 12;

// ExceptionCode
var ExceptionCode = {};
var ExceptionMessage = {};
var INDEX_SIZE_ERR              = ExceptionCode.INDEX_SIZE_ERR              = ((ExceptionMessage[1]="Index size error"),1);
var DOMSTRING_SIZE_ERR          = ExceptionCode.DOMSTRING_SIZE_ERR          = ((ExceptionMessage[2]="DOMString size error"),2);
var HIERARCHY_REQUEST_ERR       = ExceptionCode.HIERARCHY_REQUEST_ERR       = ((ExceptionMessage[3]="Hierarchy request error"),3);
var WRONG_DOCUMENT_ERR          = ExceptionCode.WRONG_DOCUMENT_ERR          = ((ExceptionMessage[4]="Wrong document"),4);
var INVALID_CHARACTER_ERR       = ExceptionCode.INVALID_CHARACTER_ERR       = ((ExceptionMessage[5]="Invalid character"),5);
var NO_DATA_ALLOWED_ERR         = ExceptionCode.NO_DATA_ALLOWED_ERR         = ((ExceptionMessage[6]="No data allowed"),6);
var NO_MODIFICATION_ALLOWED_ERR = ExceptionCode.NO_MODIFICATION_ALLOWED_ERR = ((ExceptionMessage[7]="No modification allowed"),7);
var NOT_FOUND_ERR               = ExceptionCode.NOT_FOUND_ERR               = ((ExceptionMessage[8]="Not found"),8);
var NOT_SUPPORTED_ERR           = ExceptionCode.NOT_SUPPORTED_ERR           = ((ExceptionMessage[9]="Not supported"),9);
var INUSE_ATTRIBUTE_ERR         = ExceptionCode.INUSE_ATTRIBUTE_ERR         = ((ExceptionMessage[10]="Attribute in use"),10);
//level2
var INVALID_STATE_ERR        	= ExceptionCode.INVALID_STATE_ERR        	= ((ExceptionMessage[11]="Invalid state"),11);
var SYNTAX_ERR               	= ExceptionCode.SYNTAX_ERR               	= ((ExceptionMessage[12]="Syntax error"),12);
var INVALID_MODIFICATION_ERR 	= ExceptionCode.INVALID_MODIFICATION_ERR 	= ((ExceptionMessage[13]="Invalid modification"),13);
var NAMESPACE_ERR            	= ExceptionCode.NAMESPACE_ERR           	= ((ExceptionMessage[14]="Invalid namespace"),14);
var INVALID_ACCESS_ERR       	= ExceptionCode.INVALID_ACCESS_ERR      	= ((ExceptionMessage[15]="Invalid access"),15);


function DOMException(code, message) {
	if(message instanceof Error){
		var error = message;
	}else{
		error = this;
		Error.call(this, ExceptionMessage[code]);
		this.message = ExceptionMessage[code];
		if(Error.captureStackTrace) Error.captureStackTrace(this, DOMException);
	}
	error.code = code;
	if(message) this.message = this.message + ": " + message;
	return error;
}
DOMException.prototype = Error.prototype;
copy(ExceptionCode,DOMException);
/**
 * @see http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/core.html#ID-536297177
 * The NodeList interface provides the abstraction of an ordered collection of nodes, without defining or constraining how this collection is implemented. NodeList objects in the DOM are live.
 * The items in the NodeList are accessible via an integral index, starting from 0.
 */
function NodeList() {
}
NodeList.prototype = {
	/**
	 * The number of nodes in the list. The range of valid child node indices is 0 to length-1 inclusive.
	 * @standard level1
	 */
	length:0, 
	/**
	 * Returns the indexth item in the collection. If index is greater than or equal to the number of nodes in the list, this returns null.
	 * @standard level1
	 * @param index  unsigned long 
	 *   Index into the collection.
	 * @return Node
	 * 	The node at the indexth position in the NodeList, or null if that is not a valid index. 
	 */
	item: function(index) {
		return this[index] || null;
	},
	toString:function(isHTML,nodeFilter){
		for(var buf = [], i = 0;i<this.length;i++){
			serializeToString(this[i],buf,isHTML,nodeFilter);
		}
		return buf.join('');
	}
};
function LiveNodeList(node,refresh){
	this._node = node;
	this._refresh = refresh;
	_updateLiveList(this);
}
function _updateLiveList(list){
	var inc = list._node._inc || list._node.ownerDocument._inc;
	if(list._inc != inc){
		var ls = list._refresh(list._node);
		//console.log(ls.length)
		__set__(list,'length',ls.length);
		copy(ls,list);
		list._inc = inc;
	}
}
LiveNodeList.prototype.item = function(i){
	_updateLiveList(this);
	return this[i];
};

_extends(LiveNodeList,NodeList);
/**
 * 
 * Objects implementing the NamedNodeMap interface are used to represent collections of nodes that can be accessed by name. Note that NamedNodeMap does not inherit from NodeList; NamedNodeMaps are not maintained in any particular order. Objects contained in an object implementing NamedNodeMap may also be accessed by an ordinal index, but this is simply to allow convenient enumeration of the contents of a NamedNodeMap, and does not imply that the DOM specifies an order to these Nodes.
 * NamedNodeMap objects in the DOM are live.
 * used for attributes or DocumentType entities 
 */
function NamedNodeMap() {
}

function _findNodeIndex(list,node){
	var i = list.length;
	while(i--){
		if(list[i] === node){return i}
	}
}

function _addNamedNode(el,list,newAttr,oldAttr){
	if(oldAttr){
		list[_findNodeIndex(list,oldAttr)] = newAttr;
	}else{
		list[list.length++] = newAttr;
	}
	if(el){
		newAttr.ownerElement = el;
		var doc = el.ownerDocument;
		if(doc){
			oldAttr && _onRemoveAttribute(doc,el,oldAttr);
			_onAddAttribute(doc,el,newAttr);
		}
	}
}
function _removeNamedNode(el,list,attr){
	//console.log('remove attr:'+attr)
	var i = _findNodeIndex(list,attr);
	if(i>=0){
		var lastIndex = list.length-1;
		while(i<lastIndex){
			list[i] = list[++i];
		}
		list.length = lastIndex;
		if(el){
			var doc = el.ownerDocument;
			if(doc){
				_onRemoveAttribute(doc,el,attr);
				attr.ownerElement = null;
			}
		}
	}else{
		throw DOMException(NOT_FOUND_ERR,new Error(el.tagName+'@'+attr))
	}
}
NamedNodeMap.prototype = {
	length:0,
	item:NodeList.prototype.item,
	getNamedItem: function(key) {
//		if(key.indexOf(':')>0 || key == 'xmlns'){
//			return null;
//		}
		//console.log()
		var i = this.length;
		while(i--){
			var attr = this[i];
			//console.log(attr.nodeName,key)
			if(attr.nodeName == key){
				return attr;
			}
		}
	},
	setNamedItem: function(attr) {
		var el = attr.ownerElement;
		if(el && el!=this._ownerElement){
			throw new DOMException(INUSE_ATTRIBUTE_ERR);
		}
		var oldAttr = this.getNamedItem(attr.nodeName);
		_addNamedNode(this._ownerElement,this,attr,oldAttr);
		return oldAttr;
	},
	/* returns Node */
	setNamedItemNS: function(attr) {// raises: WRONG_DOCUMENT_ERR,NO_MODIFICATION_ALLOWED_ERR,INUSE_ATTRIBUTE_ERR
		var el = attr.ownerElement, oldAttr;
		if(el && el!=this._ownerElement){
			throw new DOMException(INUSE_ATTRIBUTE_ERR);
		}
		oldAttr = this.getNamedItemNS(attr.namespaceURI,attr.localName);
		_addNamedNode(this._ownerElement,this,attr,oldAttr);
		return oldAttr;
	},

	/* returns Node */
	removeNamedItem: function(key) {
		var attr = this.getNamedItem(key);
		_removeNamedNode(this._ownerElement,this,attr);
		return attr;
		
		
	},// raises: NOT_FOUND_ERR,NO_MODIFICATION_ALLOWED_ERR
	
	//for level2
	removeNamedItemNS:function(namespaceURI,localName){
		var attr = this.getNamedItemNS(namespaceURI,localName);
		_removeNamedNode(this._ownerElement,this,attr);
		return attr;
	},
	getNamedItemNS: function(namespaceURI, localName) {
		var i = this.length;
		while(i--){
			var node = this[i];
			if(node.localName == localName && node.namespaceURI == namespaceURI){
				return node;
			}
		}
		return null;
	}
};
/**
 * @see http://www.w3.org/TR/REC-DOM-Level-1/level-one-core.html#ID-102161490
 */
function DOMImplementation(/* Object */ features) {
	this._features = {};
	if (features) {
		for (var feature in features) {
			 this._features = features[feature];
		}
	}
}

DOMImplementation.prototype = {
	hasFeature: function(/* string */ feature, /* string */ version) {
		var versions = this._features[feature.toLowerCase()];
		if (versions && (!version || version in versions)) {
			return true;
		} else {
			return false;
		}
	},
	// Introduced in DOM Level 2:
	createDocument:function(namespaceURI,  qualifiedName, doctype){// raises:INVALID_CHARACTER_ERR,NAMESPACE_ERR,WRONG_DOCUMENT_ERR
		var doc = new Document();
		doc.implementation = this;
		doc.childNodes = new NodeList();
		doc.doctype = doctype;
		if(doctype){
			doc.appendChild(doctype);
		}
		if(qualifiedName){
			var root = doc.createElementNS(namespaceURI,qualifiedName);
			doc.appendChild(root);
		}
		return doc;
	},
	// Introduced in DOM Level 2:
	createDocumentType:function(qualifiedName, publicId, systemId){// raises:INVALID_CHARACTER_ERR,NAMESPACE_ERR
		var node = new DocumentType();
		node.name = qualifiedName;
		node.nodeName = qualifiedName;
		node.publicId = publicId;
		node.systemId = systemId;
		// Introduced in DOM Level 2:
		//readonly attribute DOMString        internalSubset;
		
		//TODO:..
		//  readonly attribute NamedNodeMap     entities;
		//  readonly attribute NamedNodeMap     notations;
		return node;
	}
};


/**
 * @see http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/core.html#ID-1950641247
 */

function Node() {
}

Node.prototype = {
	firstChild : null,
	lastChild : null,
	previousSibling : null,
	nextSibling : null,
	attributes : null,
	parentNode : null,
	childNodes : null,
	ownerDocument : null,
	nodeValue : null,
	namespaceURI : null,
	prefix : null,
	localName : null,
	// Modified in DOM Level 2:
	insertBefore:function(newChild, refChild){//raises 
		return _insertBefore(this,newChild,refChild);
	},
	replaceChild:function(newChild, oldChild){//raises 
		this.insertBefore(newChild,oldChild);
		if(oldChild){
			this.removeChild(oldChild);
		}
	},
	removeChild:function(oldChild){
		return _removeChild(this,oldChild);
	},
	appendChild:function(newChild){
		return this.insertBefore(newChild,null);
	},
	hasChildNodes:function(){
		return this.firstChild != null;
	},
	cloneNode:function(deep){
		return cloneNode(this.ownerDocument||this,this,deep);
	},
	// Modified in DOM Level 2:
	normalize:function(){
		var child = this.firstChild;
		while(child){
			var next = child.nextSibling;
			if(next && next.nodeType == TEXT_NODE && child.nodeType == TEXT_NODE){
				this.removeChild(next);
				child.appendData(next.data);
			}else{
				child.normalize();
				child = next;
			}
		}
	},
  	// Introduced in DOM Level 2:
	isSupported:function(feature, version){
		return this.ownerDocument.implementation.hasFeature(feature,version);
	},
    // Introduced in DOM Level 2:
    hasAttributes:function(){
    	return this.attributes.length>0;
    },
    lookupPrefix:function(namespaceURI){
    	var el = this;
    	while(el){
    		var map = el._nsMap;
    		//console.dir(map)
    		if(map){
    			for(var n in map){
    				if(map[n] == namespaceURI){
    					return n;
    				}
    			}
    		}
    		el = el.nodeType == ATTRIBUTE_NODE?el.ownerDocument : el.parentNode;
    	}
    	return null;
    },
    // Introduced in DOM Level 3:
    lookupNamespaceURI:function(prefix){
    	var el = this;
    	while(el){
    		var map = el._nsMap;
    		//console.dir(map)
    		if(map){
    			if(prefix in map){
    				return map[prefix] ;
    			}
    		}
    		el = el.nodeType == ATTRIBUTE_NODE?el.ownerDocument : el.parentNode;
    	}
    	return null;
    },
    // Introduced in DOM Level 3:
    isDefaultNamespace:function(namespaceURI){
    	var prefix = this.lookupPrefix(namespaceURI);
    	return prefix == null;
    }
};


function _xmlEncoder(c){
	return c == '<' && '&lt;' ||
         c == '>' && '&gt;' ||
         c == '&' && '&amp;' ||
         c == '"' && '&quot;' ||
         '&#'+c.charCodeAt()+';'
}


copy(NodeType,Node);
copy(NodeType,Node.prototype);

/**
 * @param callback return true for continue,false for break
 * @return boolean true: break visit;
 */
function _visitNode(node,callback){
	if(callback(node)){
		return true;
	}
	if(node = node.firstChild){
		do{
			if(_visitNode(node,callback)){return true}
        }while(node=node.nextSibling)
    }
}



function Document(){
}
function _onAddAttribute(doc,el,newAttr){
	doc && doc._inc++;
	var ns = newAttr.namespaceURI;
	if(ns == 'http://www.w3.org/2000/xmlns/'){
		//update namespace
		el._nsMap[newAttr.prefix?newAttr.localName:''] = newAttr.value;
	}
}
function _onRemoveAttribute(doc,el,newAttr,remove){
	doc && doc._inc++;
	var ns = newAttr.namespaceURI;
	if(ns == 'http://www.w3.org/2000/xmlns/'){
		//update namespace
		delete el._nsMap[newAttr.prefix?newAttr.localName:''];
	}
}
function _onUpdateChild(doc,el,newChild){
	if(doc && doc._inc){
		doc._inc++;
		//update childNodes
		var cs = el.childNodes;
		if(newChild){
			cs[cs.length++] = newChild;
		}else{
			//console.log(1)
			var child = el.firstChild;
			var i = 0;
			while(child){
				cs[i++] = child;
				child =child.nextSibling;
			}
			cs.length = i;
		}
	}
}

/**
 * attributes;
 * children;
 * 
 * writeable properties:
 * nodeValue,Attr:value,CharacterData:data
 * prefix
 */
function _removeChild(parentNode,child){
	var previous = child.previousSibling;
	var next = child.nextSibling;
	if(previous){
		previous.nextSibling = next;
	}else{
		parentNode.firstChild = next;
	}
	if(next){
		next.previousSibling = previous;
	}else{
		parentNode.lastChild = previous;
	}
	_onUpdateChild(parentNode.ownerDocument,parentNode);
	return child;
}
/**
 * preformance key(refChild == null)
 */
function _insertBefore(parentNode,newChild,nextChild){
	var cp = newChild.parentNode;
	if(cp){
		cp.removeChild(newChild);//remove and update
	}
	if(newChild.nodeType === DOCUMENT_FRAGMENT_NODE){
		var newFirst = newChild.firstChild;
		if (newFirst == null) {
			return newChild;
		}
		var newLast = newChild.lastChild;
	}else{
		newFirst = newLast = newChild;
	}
	var pre = nextChild ? nextChild.previousSibling : parentNode.lastChild;

	newFirst.previousSibling = pre;
	newLast.nextSibling = nextChild;
	
	
	if(pre){
		pre.nextSibling = newFirst;
	}else{
		parentNode.firstChild = newFirst;
	}
	if(nextChild == null){
		parentNode.lastChild = newLast;
	}else{
		nextChild.previousSibling = newLast;
	}
	do{
		newFirst.parentNode = parentNode;
	}while(newFirst !== newLast && (newFirst= newFirst.nextSibling))
	_onUpdateChild(parentNode.ownerDocument||parentNode,parentNode);
	//console.log(parentNode.lastChild.nextSibling == null)
	if (newChild.nodeType == DOCUMENT_FRAGMENT_NODE) {
		newChild.firstChild = newChild.lastChild = null;
	}
	return newChild;
}
function _appendSingleChild(parentNode,newChild){
	var cp = newChild.parentNode;
	if(cp){
		var pre = parentNode.lastChild;
		cp.removeChild(newChild);//remove and update
		var pre = parentNode.lastChild;
	}
	var pre = parentNode.lastChild;
	newChild.parentNode = parentNode;
	newChild.previousSibling = pre;
	newChild.nextSibling = null;
	if(pre){
		pre.nextSibling = newChild;
	}else{
		parentNode.firstChild = newChild;
	}
	parentNode.lastChild = newChild;
	_onUpdateChild(parentNode.ownerDocument,parentNode,newChild);
	return newChild;
	//console.log("__aa",parentNode.lastChild.nextSibling == null)
}
Document.prototype = {
	//implementation : null,
	nodeName :  '#document',
	nodeType :  DOCUMENT_NODE,
	doctype :  null,
	documentElement :  null,
	_inc : 1,
	
	insertBefore :  function(newChild, refChild){//raises 
		if(newChild.nodeType == DOCUMENT_FRAGMENT_NODE){
			var child = newChild.firstChild;
			while(child){
				var next = child.nextSibling;
				this.insertBefore(child,refChild);
				child = next;
			}
			return newChild;
		}
		if(this.documentElement == null && newChild.nodeType == ELEMENT_NODE){
			this.documentElement = newChild;
		}
		
		return _insertBefore(this,newChild,refChild),(newChild.ownerDocument = this),newChild;
	},
	removeChild :  function(oldChild){
		if(this.documentElement == oldChild){
			this.documentElement = null;
		}
		return _removeChild(this,oldChild);
	},
	// Introduced in DOM Level 2:
	importNode : function(importedNode,deep){
		return importNode(this,importedNode,deep);
	},
	// Introduced in DOM Level 2:
	getElementById :	function(id){
		var rtv = null;
		_visitNode(this.documentElement,function(node){
			if(node.nodeType == ELEMENT_NODE){
				if(node.getAttribute('id') == id){
					rtv = node;
					return true;
				}
			}
		});
		return rtv;
	},
	
	//document factory method:
	createElement :	function(tagName){
		var node = new Element();
		node.ownerDocument = this;
		node.nodeName = tagName;
		node.tagName = tagName;
		node.childNodes = new NodeList();
		var attrs	= node.attributes = new NamedNodeMap();
		attrs._ownerElement = node;
		return node;
	},
	createDocumentFragment :	function(){
		var node = new DocumentFragment();
		node.ownerDocument = this;
		node.childNodes = new NodeList();
		return node;
	},
	createTextNode :	function(data){
		var node = new Text();
		node.ownerDocument = this;
		node.appendData(data);
		return node;
	},
	createComment :	function(data){
		var node = new Comment();
		node.ownerDocument = this;
		node.appendData(data);
		return node;
	},
	createCDATASection :	function(data){
		var node = new CDATASection();
		node.ownerDocument = this;
		node.appendData(data);
		return node;
	},
	createProcessingInstruction :	function(target,data){
		var node = new ProcessingInstruction();
		node.ownerDocument = this;
		node.tagName = node.target = target;
		node.nodeValue= node.data = data;
		return node;
	},
	createAttribute :	function(name){
		var node = new Attr();
		node.ownerDocument	= this;
		node.name = name;
		node.nodeName	= name;
		node.localName = name;
		node.specified = true;
		return node;
	},
	createEntityReference :	function(name){
		var node = new EntityReference();
		node.ownerDocument	= this;
		node.nodeName	= name;
		return node;
	},
	// Introduced in DOM Level 2:
	createElementNS :	function(namespaceURI,qualifiedName){
		var node = new Element();
		var pl = qualifiedName.split(':');
		var attrs	= node.attributes = new NamedNodeMap();
		node.childNodes = new NodeList();
		node.ownerDocument = this;
		node.nodeName = qualifiedName;
		node.tagName = qualifiedName;
		node.namespaceURI = namespaceURI;
		if(pl.length == 2){
			node.prefix = pl[0];
			node.localName = pl[1];
		}else{
			//el.prefix = null;
			node.localName = qualifiedName;
		}
		attrs._ownerElement = node;
		return node;
	},
	// Introduced in DOM Level 2:
	createAttributeNS :	function(namespaceURI,qualifiedName){
		var node = new Attr();
		var pl = qualifiedName.split(':');
		node.ownerDocument = this;
		node.nodeName = qualifiedName;
		node.name = qualifiedName;
		node.namespaceURI = namespaceURI;
		node.specified = true;
		if(pl.length == 2){
			node.prefix = pl[0];
			node.localName = pl[1];
		}else{
			//el.prefix = null;
			node.localName = qualifiedName;
		}
		return node;
	}
};
_extends(Document,Node);


function Element() {
	this._nsMap = {};
}
Element.prototype = {
	nodeType : ELEMENT_NODE,
	hasAttribute : function(name){
		return this.getAttributeNode(name)!=null;
	},
	getAttribute : function(name){
		var attr = this.getAttributeNode(name);
		return attr && attr.value || '';
	},
	getAttributeNode : function(name){
		return this.attributes.getNamedItem(name);
	},
	setAttribute : function(name, value){
		var attr = this.ownerDocument.createAttribute(name);
		attr.value = attr.nodeValue = "" + value;
		this.setAttributeNode(attr);
	},
	removeAttribute : function(name){
		var attr = this.getAttributeNode(name);
		attr && this.removeAttributeNode(attr);
	},
	
	//four real opeartion method
	appendChild:function(newChild){
		if(newChild.nodeType === DOCUMENT_FRAGMENT_NODE){
			return this.insertBefore(newChild,null);
		}else{
			return _appendSingleChild(this,newChild);
		}
	},
	setAttributeNode : function(newAttr){
		return this.attributes.setNamedItem(newAttr);
	},
	setAttributeNodeNS : function(newAttr){
		return this.attributes.setNamedItemNS(newAttr);
	},
	removeAttributeNode : function(oldAttr){
		//console.log(this == oldAttr.ownerElement)
		return this.attributes.removeNamedItem(oldAttr.nodeName);
	},
	//get real attribute name,and remove it by removeAttributeNode
	removeAttributeNS : function(namespaceURI, localName){
		var old = this.getAttributeNodeNS(namespaceURI, localName);
		old && this.removeAttributeNode(old);
	},
	
	hasAttributeNS : function(namespaceURI, localName){
		return this.getAttributeNodeNS(namespaceURI, localName)!=null;
	},
	getAttributeNS : function(namespaceURI, localName){
		var attr = this.getAttributeNodeNS(namespaceURI, localName);
		return attr && attr.value || '';
	},
	setAttributeNS : function(namespaceURI, qualifiedName, value){
		var attr = this.ownerDocument.createAttributeNS(namespaceURI, qualifiedName);
		attr.value = attr.nodeValue = "" + value;
		this.setAttributeNode(attr);
	},
	getAttributeNodeNS : function(namespaceURI, localName){
		return this.attributes.getNamedItemNS(namespaceURI, localName);
	},
	
	getElementsByTagName : function(tagName){
		return new LiveNodeList(this,function(base){
			var ls = [];
			_visitNode(base,function(node){
				if(node !== base && node.nodeType == ELEMENT_NODE && (tagName === '*' || node.tagName == tagName)){
					ls.push(node);
				}
			});
			return ls;
		});
	},
	getElementsByTagNameNS : function(namespaceURI, localName){
		return new LiveNodeList(this,function(base){
			var ls = [];
			_visitNode(base,function(node){
				if(node !== base && node.nodeType === ELEMENT_NODE && (namespaceURI === '*' || node.namespaceURI === namespaceURI) && (localName === '*' || node.localName == localName)){
					ls.push(node);
				}
			});
			return ls;
			
		});
	}
};
Document.prototype.getElementsByTagName = Element.prototype.getElementsByTagName;
Document.prototype.getElementsByTagNameNS = Element.prototype.getElementsByTagNameNS;


_extends(Element,Node);
function Attr() {
}
Attr.prototype.nodeType = ATTRIBUTE_NODE;
_extends(Attr,Node);


function CharacterData() {
}
CharacterData.prototype = {
	data : '',
	substringData : function(offset, count) {
		return this.data.substring(offset, offset+count);
	},
	appendData: function(text) {
		text = this.data+text;
		this.nodeValue = this.data = text;
		this.length = text.length;
	},
	insertData: function(offset,text) {
		this.replaceData(offset,0,text);
	
	},
	appendChild:function(newChild){
		throw new Error(ExceptionMessage[HIERARCHY_REQUEST_ERR])
	},
	deleteData: function(offset, count) {
		this.replaceData(offset,count,"");
	},
	replaceData: function(offset, count, text) {
		var start = this.data.substring(0,offset);
		var end = this.data.substring(offset+count);
		text = start + text + end;
		this.nodeValue = this.data = text;
		this.length = text.length;
	}
};
_extends(CharacterData,Node);
function Text() {
}
Text.prototype = {
	nodeName : "#text",
	nodeType : TEXT_NODE,
	splitText : function(offset) {
		var text = this.data;
		var newText = text.substring(offset);
		text = text.substring(0, offset);
		this.data = this.nodeValue = text;
		this.length = text.length;
		var newNode = this.ownerDocument.createTextNode(newText);
		if(this.parentNode){
			this.parentNode.insertBefore(newNode, this.nextSibling);
		}
		return newNode;
	}
};
_extends(Text,CharacterData);
function Comment() {
}
Comment.prototype = {
	nodeName : "#comment",
	nodeType : COMMENT_NODE
};
_extends(Comment,CharacterData);

function CDATASection() {
}
CDATASection.prototype = {
	nodeName : "#cdata-section",
	nodeType : CDATA_SECTION_NODE
};
_extends(CDATASection,CharacterData);


function DocumentType() {
}
DocumentType.prototype.nodeType = DOCUMENT_TYPE_NODE;
_extends(DocumentType,Node);

function Notation() {
}
Notation.prototype.nodeType = NOTATION_NODE;
_extends(Notation,Node);

function Entity() {
}
Entity.prototype.nodeType = ENTITY_NODE;
_extends(Entity,Node);

function EntityReference() {
}
EntityReference.prototype.nodeType = ENTITY_REFERENCE_NODE;
_extends(EntityReference,Node);

function DocumentFragment() {
}
DocumentFragment.prototype.nodeName =	"#document-fragment";
DocumentFragment.prototype.nodeType =	DOCUMENT_FRAGMENT_NODE;
_extends(DocumentFragment,Node);


function ProcessingInstruction() {
}
ProcessingInstruction.prototype.nodeType = PROCESSING_INSTRUCTION_NODE;
_extends(ProcessingInstruction,Node);
function XMLSerializer(){}
XMLSerializer.prototype.serializeToString = function(node,isHtml,nodeFilter){
	return nodeSerializeToString.call(node,isHtml,nodeFilter);
};
Node.prototype.toString = nodeSerializeToString;
function nodeSerializeToString(isHtml,nodeFilter){
	var buf = [];
	var refNode = this.nodeType == 9?this.documentElement:this;
	var prefix = refNode.prefix;
	var uri = refNode.namespaceURI;
	
	if(uri && prefix == null){
		//console.log(prefix)
		var prefix = refNode.lookupPrefix(uri);
		if(prefix == null){
			//isHTML = true;
			var visibleNamespaces=[
			{namespace:uri,prefix:null}
			//{namespace:uri,prefix:''}
			];
		}
	}
	serializeToString(this,buf,isHtml,nodeFilter,visibleNamespaces);
	//console.log('###',this.nodeType,uri,prefix,buf.join(''))
	return buf.join('');
}
function needNamespaceDefine(node,isHTML, visibleNamespaces) {
	var prefix = node.prefix||'';
	var uri = node.namespaceURI;
	if (!prefix && !uri){
		return false;
	}
	if (prefix === "xml" && uri === "http://www.w3.org/XML/1998/namespace" 
		|| uri == 'http://www.w3.org/2000/xmlns/'){
		return false;
	}
	
	var i = visibleNamespaces.length; 
	//console.log('@@@@',node.tagName,prefix,uri,visibleNamespaces)
	while (i--) {
		var ns = visibleNamespaces[i];
		// get namespace prefix
		//console.log(node.nodeType,node.tagName,ns.prefix,prefix)
		if (ns.prefix == prefix){
			return ns.namespace != uri;
		}
	}
	//console.log(isHTML,uri,prefix=='')
	//if(isHTML && prefix ==null && uri == 'http://www.w3.org/1999/xhtml'){
	//	return false;
	//}
	//node.flag = '11111'
	//console.error(3,true,node.flag,node.prefix,node.namespaceURI)
	return true;
}
function serializeToString(node,buf,isHTML,nodeFilter,visibleNamespaces){
	if(nodeFilter){
		node = nodeFilter(node);
		if(node){
			if(typeof node == 'string'){
				buf.push(node);
				return;
			}
		}else{
			return;
		}
		//buf.sort.apply(attrs, attributeSorter);
	}
	switch(node.nodeType){
	case ELEMENT_NODE:
		if (!visibleNamespaces) visibleNamespaces = [];
		var startVisibleNamespaces = visibleNamespaces.length;
		var attrs = node.attributes;
		var len = attrs.length;
		var child = node.firstChild;
		var nodeName = node.tagName;
		
		isHTML =  (htmlns === node.namespaceURI) ||isHTML; 
		buf.push('<',nodeName);
		
		
		
		for(var i=0;i<len;i++){
			// add namespaces for attributes
			var attr = attrs.item(i);
			if (attr.prefix == 'xmlns') {
				visibleNamespaces.push({ prefix: attr.localName, namespace: attr.value });
			}else if(attr.nodeName == 'xmlns'){
				visibleNamespaces.push({ prefix: '', namespace: attr.value });
			}
		}
		for(var i=0;i<len;i++){
			var attr = attrs.item(i);
			if (needNamespaceDefine(attr,isHTML, visibleNamespaces)) {
				var prefix = attr.prefix||'';
				var uri = attr.namespaceURI;
				var ns = prefix ? ' xmlns:' + prefix : " xmlns";
				buf.push(ns, '="' , uri , '"');
				visibleNamespaces.push({ prefix: prefix, namespace:uri });
			}
			serializeToString(attr,buf,isHTML,nodeFilter,visibleNamespaces);
		}
		// add namespace for current node		
		if (needNamespaceDefine(node,isHTML, visibleNamespaces)) {
			var prefix = node.prefix||'';
			var uri = node.namespaceURI;
			var ns = prefix ? ' xmlns:' + prefix : " xmlns";
			buf.push(ns, '="' , uri , '"');
			visibleNamespaces.push({ prefix: prefix, namespace:uri });
		}
		
		if(child || isHTML && !/^(?:meta|link|img|br|hr|input)$/i.test(nodeName)){
			buf.push('>');
			//if is cdata child node
			if(isHTML && /^script$/i.test(nodeName)){
				while(child){
					if(child.data){
						buf.push(child.data);
					}else{
						serializeToString(child,buf,isHTML,nodeFilter,visibleNamespaces);
					}
					child = child.nextSibling;
				}
			}else
			{
				while(child){
					serializeToString(child,buf,isHTML,nodeFilter,visibleNamespaces);
					child = child.nextSibling;
				}
			}
			buf.push('</',nodeName,'>');
		}else{
			buf.push('/>');
		}
		// remove added visible namespaces
		//visibleNamespaces.length = startVisibleNamespaces;
		return;
	case DOCUMENT_NODE:
	case DOCUMENT_FRAGMENT_NODE:
		var child = node.firstChild;
		while(child){
			serializeToString(child,buf,isHTML,nodeFilter,visibleNamespaces);
			child = child.nextSibling;
		}
		return;
	case ATTRIBUTE_NODE:
		return buf.push(' ',node.name,'="',node.value.replace(/[<&"]/g,_xmlEncoder),'"');
	case TEXT_NODE:
		return buf.push(node.data.replace(/[<&]/g,_xmlEncoder));
	case CDATA_SECTION_NODE:
		return buf.push( '<![CDATA[',node.data,']]>');
	case COMMENT_NODE:
		return buf.push( "<!--",node.data,"-->");
	case DOCUMENT_TYPE_NODE:
		var pubid = node.publicId;
		var sysid = node.systemId;
		buf.push('<!DOCTYPE ',node.name);
		if(pubid){
			buf.push(' PUBLIC "',pubid);
			if (sysid && sysid!='.') {
				buf.push( '" "',sysid);
			}
			buf.push('">');
		}else if(sysid && sysid!='.'){
			buf.push(' SYSTEM "',sysid,'">');
		}else{
			var sub = node.internalSubset;
			if(sub){
				buf.push(" [",sub,"]");
			}
			buf.push(">");
		}
		return;
	case PROCESSING_INSTRUCTION_NODE:
		return buf.push( "<?",node.target," ",node.data,"?>");
	case ENTITY_REFERENCE_NODE:
		return buf.push( '&',node.nodeName,';');
	//case ENTITY_NODE:
	//case NOTATION_NODE:
	default:
		buf.push('??',node.nodeName);
	}
}
function importNode(doc,node,deep){
	var node2;
	switch (node.nodeType) {
	case ELEMENT_NODE:
		node2 = node.cloneNode(false);
		node2.ownerDocument = doc;
		//var attrs = node2.attributes;
		//var len = attrs.length;
		//for(var i=0;i<len;i++){
			//node2.setAttributeNodeNS(importNode(doc,attrs.item(i),deep));
		//}
	case DOCUMENT_FRAGMENT_NODE:
		break;
	case ATTRIBUTE_NODE:
		deep = true;
		break;
	//case ENTITY_REFERENCE_NODE:
	//case PROCESSING_INSTRUCTION_NODE:
	////case TEXT_NODE:
	//case CDATA_SECTION_NODE:
	//case COMMENT_NODE:
	//	deep = false;
	//	break;
	//case DOCUMENT_NODE:
	//case DOCUMENT_TYPE_NODE:
	//cannot be imported.
	//case ENTITY_NODE:
	//case NOTATION_NODE：
	//can not hit in level3
	//default:throw e;
	}
	if(!node2){
		node2 = node.cloneNode(false);//false
	}
	node2.ownerDocument = doc;
	node2.parentNode = null;
	if(deep){
		var child = node.firstChild;
		while(child){
			node2.appendChild(importNode(doc,child,deep));
			child = child.nextSibling;
		}
	}
	return node2;
}
//
//var _relationMap = {firstChild:1,lastChild:1,previousSibling:1,nextSibling:1,
//					attributes:1,childNodes:1,parentNode:1,documentElement:1,doctype,};
function cloneNode(doc,node,deep){
	var node2 = new node.constructor();
	for(var n in node){
		var v = node[n];
		if(typeof v != 'object' ){
			if(v != node2[n]){
				node2[n] = v;
			}
		}
	}
	if(node.childNodes){
		node2.childNodes = new NodeList();
	}
	node2.ownerDocument = doc;
	switch (node2.nodeType) {
	case ELEMENT_NODE:
		var attrs	= node.attributes;
		var attrs2	= node2.attributes = new NamedNodeMap();
		var len = attrs.length;
		attrs2._ownerElement = node2;
		for(var i=0;i<len;i++){
			node2.setAttributeNode(cloneNode(doc,attrs.item(i),true));
		}
		break;;
	case ATTRIBUTE_NODE:
		deep = true;
	}
	if(deep){
		var child = node.firstChild;
		while(child){
			node2.appendChild(cloneNode(doc,child,deep));
			child = child.nextSibling;
		}
	}
	return node2;
}

function __set__(object,key,value){
	object[key] = value;
}
//do dynamic
try{
	if(Object.defineProperty){
		Object.defineProperty(LiveNodeList.prototype,'length',{
			get:function(){
				_updateLiveList(this);
				return this.$$length;
			}
		});
		Object.defineProperty(Node.prototype,'textContent',{
			get:function(){
				return getTextContent(this);
			},
			set:function(data){
				switch(this.nodeType){
				case ELEMENT_NODE:
				case DOCUMENT_FRAGMENT_NODE:
					while(this.firstChild){
						this.removeChild(this.firstChild);
					}
					if(data || String(data)){
						this.appendChild(this.ownerDocument.createTextNode(data));
					}
					break;
				default:
					//TODO:
					this.data = data;
					this.value = data;
					this.nodeValue = data;
				}
			}
		});
		
		function getTextContent(node){
			switch(node.nodeType){
			case ELEMENT_NODE:
			case DOCUMENT_FRAGMENT_NODE:
				var buf = [];
				node = node.firstChild;
				while(node){
					if(node.nodeType!==7 && node.nodeType !==8){
						buf.push(getTextContent(node));
					}
					node = node.nextSibling;
				}
				return buf.join('');
			default:
				return node.nodeValue;
			}
		}
		__set__ = function(object,key,value){
			//console.log(value)
			object['$$'+key] = value;
		};
	}
}catch(e){//ie8
}

//if(typeof require == 'function'){
	var DOMImplementation_1 = DOMImplementation;
	var XMLSerializer_1 = XMLSerializer;
//}

var dom = {
	DOMImplementation: DOMImplementation_1,
	XMLSerializer: XMLSerializer_1
};

var domParser = createCommonjsModule(function (module, exports) {
function DOMParser(options){
	this.options = options ||{locator:{}};
	
}
DOMParser.prototype.parseFromString = function(source,mimeType){
	var options = this.options;
	var sax$$1 =  new XMLReader();
	var domBuilder = options.domBuilder || new DOMHandler();//contentHandler and LexicalHandler
	var errorHandler = options.errorHandler;
	var locator = options.locator;
	var defaultNSMap = options.xmlns||{};
	var entityMap = {'lt':'<','gt':'>','amp':'&','quot':'"','apos':"'"};
	if(locator){
		domBuilder.setDocumentLocator(locator);
	}
	
	sax$$1.errorHandler = buildErrorHandler(errorHandler,domBuilder,locator);
	sax$$1.domBuilder = options.domBuilder || domBuilder;
	if(/\/x?html?$/.test(mimeType)){
		entityMap.nbsp = '\xa0';
		entityMap.copy = '\xa9';
		defaultNSMap['']= 'http://www.w3.org/1999/xhtml';
	}
	defaultNSMap.xml = defaultNSMap.xml || 'http://www.w3.org/XML/1998/namespace';
	if(source){
		sax$$1.parse(source,defaultNSMap,entityMap);
	}else{
		sax$$1.errorHandler.error("invalid doc source");
	}
	return domBuilder.doc;
};
function buildErrorHandler(errorImpl,domBuilder,locator){
	if(!errorImpl){
		if(domBuilder instanceof DOMHandler){
			return domBuilder;
		}
		errorImpl = domBuilder ;
	}
	var errorHandler = {};
	var isCallback = errorImpl instanceof Function;
	locator = locator||{};
	function build(key){
		var fn = errorImpl[key];
		if(!fn && isCallback){
			fn = errorImpl.length == 2?function(msg){errorImpl(key,msg);}:errorImpl;
		}
		errorHandler[key] = fn && function(msg){
			fn('[xmldom '+key+']\t'+msg+_locator(locator));
		}||function(){};
	}
	build('warning');
	build('error');
	build('fatalError');
	return errorHandler;
}

//console.log('#\n\n\n\n\n\n\n####')
/**
 * +ContentHandler+ErrorHandler
 * +LexicalHandler+EntityResolver2
 * -DeclHandler-DTDHandler 
 * 
 * DefaultHandler:EntityResolver, DTDHandler, ContentHandler, ErrorHandler
 * DefaultHandler2:DefaultHandler,LexicalHandler, DeclHandler, EntityResolver2
 * @link http://www.saxproject.org/apidoc/org/xml/sax/helpers/DefaultHandler.html
 */
function DOMHandler() {
    this.cdata = false;
}
function position(locator,node){
	node.lineNumber = locator.lineNumber;
	node.columnNumber = locator.columnNumber;
}
/**
 * @see org.xml.sax.ContentHandler#startDocument
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ContentHandler.html
 */ 
DOMHandler.prototype = {
	startDocument : function() {
    	this.doc = new DOMImplementation().createDocument(null, null, null);
    	if (this.locator) {
        	this.doc.documentURI = this.locator.systemId;
    	}
	},
	startElement:function(namespaceURI, localName, qName, attrs) {
		var doc = this.doc;
	    var el = doc.createElementNS(namespaceURI, qName||localName);
	    var len = attrs.length;
	    appendElement(this, el);
	    this.currentElement = el;
	    
		this.locator && position(this.locator,el);
	    for (var i = 0 ; i < len; i++) {
	        var namespaceURI = attrs.getURI(i);
	        var value = attrs.getValue(i);
	        var qName = attrs.getQName(i);
			var attr = doc.createAttributeNS(namespaceURI, qName);
			this.locator &&position(attrs.getLocator(i),attr);
			attr.value = attr.nodeValue = value;
			el.setAttributeNode(attr);
	    }
	},
	endElement:function(namespaceURI, localName, qName) {
		var current = this.currentElement;
		var tagName = current.tagName;
		this.currentElement = current.parentNode;
	},
	startPrefixMapping:function(prefix, uri) {
	},
	endPrefixMapping:function(prefix) {
	},
	processingInstruction:function(target, data) {
	    var ins = this.doc.createProcessingInstruction(target, data);
	    this.locator && position(this.locator,ins);
	    appendElement(this, ins);
	},
	ignorableWhitespace:function(ch, start, length) {
	},
	characters:function(chars, start, length) {
		chars = _toString.apply(this,arguments);
		//console.log(chars)
		if(chars){
			if (this.cdata) {
				var charNode = this.doc.createCDATASection(chars);
			} else {
				var charNode = this.doc.createTextNode(chars);
			}
			if(this.currentElement){
				this.currentElement.appendChild(charNode);
			}else if(/^\s*$/.test(chars)){
				this.doc.appendChild(charNode);
				//process xml
			}
			this.locator && position(this.locator,charNode);
		}
	},
	skippedEntity:function(name) {
	},
	endDocument:function() {
		this.doc.normalize();
	},
	setDocumentLocator:function (locator) {
	    if(this.locator = locator){// && !('lineNumber' in locator)){
	    	locator.lineNumber = 0;
	    }
	},
	//LexicalHandler
	comment:function(chars, start, length) {
		chars = _toString.apply(this,arguments);
	    var comm = this.doc.createComment(chars);
	    this.locator && position(this.locator,comm);
	    appendElement(this, comm);
	},
	
	startCDATA:function() {
	    //used in characters() methods
	    this.cdata = true;
	},
	endCDATA:function() {
	    this.cdata = false;
	},
	
	startDTD:function(name, publicId, systemId) {
		var impl = this.doc.implementation;
	    if (impl && impl.createDocumentType) {
	        var dt = impl.createDocumentType(name, publicId, systemId);
	        this.locator && position(this.locator,dt);
	        appendElement(this, dt);
	    }
	},
	/**
	 * @see org.xml.sax.ErrorHandler
	 * @link http://www.saxproject.org/apidoc/org/xml/sax/ErrorHandler.html
	 */
	warning:function(error) {
		console.warn('[xmldom warning]\t'+error,_locator(this.locator));
	},
	error:function(error) {
		console.error('[xmldom error]\t'+error,_locator(this.locator));
	},
	fatalError:function(error) {
		console.error('[xmldom fatalError]\t'+error,_locator(this.locator));
	    throw error;
	}
};
function _locator(l){
	if(l){
		return '\n@'+(l.systemId ||'')+'#[line:'+l.lineNumber+',col:'+l.columnNumber+']'
	}
}
function _toString(chars,start,length){
	if(typeof chars == 'string'){
		return chars.substr(start,length)
	}else{//java sax connect width xmldom on rhino(what about: "? && !(chars instanceof String)")
		if(chars.length >= start+length || start){
			return new java.lang.String(chars,start,length)+'';
		}
		return chars;
	}
}

/*
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ext/LexicalHandler.html
 * used method of org.xml.sax.ext.LexicalHandler:
 *  #comment(chars, start, length)
 *  #startCDATA()
 *  #endCDATA()
 *  #startDTD(name, publicId, systemId)
 *
 *
 * IGNORED method of org.xml.sax.ext.LexicalHandler:
 *  #endDTD()
 *  #startEntity(name)
 *  #endEntity(name)
 *
 *
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ext/DeclHandler.html
 * IGNORED method of org.xml.sax.ext.DeclHandler
 * 	#attributeDecl(eName, aName, type, mode, value)
 *  #elementDecl(name, model)
 *  #externalEntityDecl(name, publicId, systemId)
 *  #internalEntityDecl(name, value)
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ext/EntityResolver2.html
 * IGNORED method of org.xml.sax.EntityResolver2
 *  #resolveEntity(String name,String publicId,String baseURI,String systemId)
 *  #resolveEntity(publicId, systemId)
 *  #getExternalSubset(name, baseURI)
 * @link http://www.saxproject.org/apidoc/org/xml/sax/DTDHandler.html
 * IGNORED method of org.xml.sax.DTDHandler
 *  #notationDecl(name, publicId, systemId) {};
 *  #unparsedEntityDecl(name, publicId, systemId, notationName) {};
 */
"endDTD,startEntity,endEntity,attributeDecl,elementDecl,externalEntityDecl,internalEntityDecl,resolveEntity,getExternalSubset,notationDecl,unparsedEntityDecl".replace(/\w+/g,function(key){
	DOMHandler.prototype[key] = function(){return null};
});

/* Private static helpers treated below as private instance methods, so don't need to add these to the public API; we might use a Relator to also get rid of non-standard public properties */
function appendElement (hander,node) {
    if (!hander.currentElement) {
        hander.doc.appendChild(node);
    } else {
        hander.currentElement.appendChild(node);
    }
}//appendChild and setAttributeNS are preformance key

//if(typeof require == 'function'){
	var XMLReader = sax.XMLReader;
	var DOMImplementation = exports.DOMImplementation = dom.DOMImplementation;
	exports.XMLSerializer = dom.XMLSerializer ;
	exports.DOMParser = DOMParser;
//}
});

var fieldTagNames$1 = {
  // TIFF Baseline
  0x013B: 'Artist',
  0x0102: 'BitsPerSample',
  0x0109: 'CellLength',
  0x0108: 'CellWidth',
  0x0140: 'ColorMap',
  0x0103: 'Compression',
  0x8298: 'Copyright',
  0x0132: 'DateTime',
  0x0152: 'ExtraSamples',
  0x010A: 'FillOrder',
  0x0121: 'FreeByteCounts',
  0x0120: 'FreeOffsets',
  0x0123: 'GrayResponseCurve',
  0x0122: 'GrayResponseUnit',
  0x013C: 'HostComputer',
  0x010E: 'ImageDescription',
  0x0101: 'ImageLength',
  0x0100: 'ImageWidth',
  0x010F: 'Make',
  0x0119: 'MaxSampleValue',
  0x0118: 'MinSampleValue',
  0x0110: 'Model',
  0x00FE: 'NewSubfileType',
  0x0112: 'Orientation',
  0x0106: 'PhotometricInterpretation',
  0x011C: 'PlanarConfiguration',
  0x0128: 'ResolutionUnit',
  0x0116: 'RowsPerStrip',
  0x0115: 'SamplesPerPixel',
  0x0131: 'Software',
  0x0117: 'StripByteCounts',
  0x0111: 'StripOffsets',
  0x00FF: 'SubfileType',
  0x0107: 'Threshholding',
  0x011A: 'XResolution',
  0x011B: 'YResolution',

  // TIFF Extended
  0x0146: 'BadFaxLines',
  0x0147: 'CleanFaxData',
  0x0157: 'ClipPath',
  0x0148: 'ConsecutiveBadFaxLines',
  0x01B1: 'Decode',
  0x01B2: 'DefaultImageColor',
  0x010D: 'DocumentName',
  0x0150: 'DotRange',
  0x0141: 'HalftoneHints',
  0x015A: 'Indexed',
  0x015B: 'JPEGTables',
  0x011D: 'PageName',
  0x0129: 'PageNumber',
  0x013D: 'Predictor',
  0x013F: 'PrimaryChromaticities',
  0x0214: 'ReferenceBlackWhite',
  0x0153: 'SampleFormat',
  0x0154: 'SMinSampleValue',
  0x0155: 'SMaxSampleValue',
  0x022F: 'StripRowCounts',
  0x014A: 'SubIFDs',
  0x0124: 'T4Options',
  0x0125: 'T6Options',
  0x0145: 'TileByteCounts',
  0x0143: 'TileLength',
  0x0144: 'TileOffsets',
  0x0142: 'TileWidth',
  0x012D: 'TransferFunction',
  0x013E: 'WhitePoint',
  0x0158: 'XClipPathUnits',
  0x011E: 'XPosition',
  0x0211: 'YCbCrCoefficients',
  0x0213: 'YCbCrPositioning',
  0x0212: 'YCbCrSubSampling',
  0x0159: 'YClipPathUnits',
  0x011F: 'YPosition',

  // EXIF
  0x9202: 'ApertureValue',
  0xA001: 'ColorSpace',
  0x9004: 'DateTimeDigitized',
  0x9003: 'DateTimeOriginal',
  0x8769: 'Exif IFD',
  0x9000: 'ExifVersion',
  0x829A: 'ExposureTime',
  0xA300: 'FileSource',
  0x9209: 'Flash',
  0xA000: 'FlashpixVersion',
  0x829D: 'FNumber',
  0xA420: 'ImageUniqueID',
  0x9208: 'LightSource',
  0x927C: 'MakerNote',
  0x9201: 'ShutterSpeedValue',
  0x9286: 'UserComment',

  // IPTC
  0x83BB: 'IPTC',

  // ICC
  0x8773: 'ICC Profile',

  // XMP
  0x02BC: 'XMP',

  // GDAL
  0xA480: 'GDAL_METADATA',
  0xA481: 'GDAL_NODATA',

  // Photoshop
  0x8649: 'Photoshop',

  // GeoTiff
  0x830E: 'ModelPixelScale',
  0x8482: 'ModelTiepoint',
  0x85D8: 'ModelTransformation',
  0x87AF: 'GeoKeyDirectory',
  0x87B0: 'GeoDoubleParams',
  0x87B1: 'GeoAsciiParams'
};

var key;
var fieldTags = {};
for (key in fieldTagNames$1) {
  fieldTags[fieldTagNames$1[key]] = parseInt(key);
}

var arrayFields$1 = [fieldTags.BitsPerSample, fieldTags.ExtraSamples, fieldTags.SampleFormat, fieldTags.StripByteCounts, fieldTags.StripOffsets, fieldTags.StripRowCounts, fieldTags.TileByteCounts, fieldTags.TileOffsets];

var fieldTypeNames = {
  0x0001: 'BYTE',
  0x0002: 'ASCII',
  0x0003: 'SHORT',
  0x0004: 'LONG',
  0x0005: 'RATIONAL',
  0x0006: 'SBYTE',
  0x0007: 'UNDEFINED',
  0x0008: 'SSHORT',
  0x0009: 'SLONG',
  0x000A: 'SRATIONAL',
  0x000B: 'FLOAT',
  0x000C: 'DOUBLE',
  // introduced by BigTIFF
  0x0010: 'LONG8',
  0x0011: 'SLONG8',
  0x0012: 'IFD8'
};

var fieldTypes$1 = {};
for (key in fieldTypeNames) {
  fieldTypes$1[fieldTypeNames[key]] = parseInt(key);
}

var photometricInterpretations = {
  WhiteIsZero: 0,
  BlackIsZero: 1,
  RGB: 2,
  Palette: 3,
  TransparencyMask: 4,
  CMYK: 5,
  YCbCr: 6,

  CIELab: 8,
  ICCLab: 9
};

var geoKeyNames$1 = {
  1024: 'GTModelTypeGeoKey',
  1025: 'GTRasterTypeGeoKey',
  1026: 'GTCitationGeoKey',
  2048: 'GeographicTypeGeoKey',
  2049: 'GeogCitationGeoKey',
  2050: 'GeogGeodeticDatumGeoKey',
  2051: 'GeogPrimeMeridianGeoKey',
  2052: 'GeogLinearUnitsGeoKey',
  2053: 'GeogLinearUnitSizeGeoKey',
  2054: 'GeogAngularUnitsGeoKey',
  2055: 'GeogAngularUnitSizeGeoKey',
  2056: 'GeogEllipsoidGeoKey',
  2057: 'GeogSemiMajorAxisGeoKey',
  2058: 'GeogSemiMinorAxisGeoKey',
  2059: 'GeogInvFlatteningGeoKey',
  2060: 'GeogAzimuthUnitsGeoKey',
  2061: 'GeogPrimeMeridianLongGeoKey',
  2062: 'GeogTOWGS84GeoKey',
  3072: 'ProjectedCSTypeGeoKey',
  3073: 'PCSCitationGeoKey',
  3074: 'ProjectionGeoKey',
  3075: 'ProjCoordTransGeoKey',
  3076: 'ProjLinearUnitsGeoKey',
  3077: 'ProjLinearUnitSizeGeoKey',
  3078: 'ProjStdParallel1GeoKey',
  3079: 'ProjStdParallel2GeoKey',
  3080: 'ProjNatOriginLongGeoKey',
  3081: 'ProjNatOriginLatGeoKey',
  3082: 'ProjFalseEastingGeoKey',
  3083: 'ProjFalseNorthingGeoKey',
  3084: 'ProjFalseOriginLongGeoKey',
  3085: 'ProjFalseOriginLatGeoKey',
  3086: 'ProjFalseOriginEastingGeoKey',
  3087: 'ProjFalseOriginNorthingGeoKey',
  3088: 'ProjCenterLongGeoKey',
  3089: 'ProjCenterLatGeoKey',
  3090: 'ProjCenterEastingGeoKey',
  3091: 'ProjCenterNorthingGeoKey',
  3092: 'ProjScaleAtNatOriginGeoKey',
  3093: 'ProjScaleAtCenterGeoKey',
  3094: 'ProjAzimuthAngleGeoKey',
  3095: 'ProjStraightVertPoleLongGeoKey',
  3096: 'ProjRectifiedGridAngleGeoKey',
  4096: 'VerticalCSTypeGeoKey',
  4097: 'VerticalCitationGeoKey',
  4098: 'VerticalDatumGeoKey',
  4099: 'VerticalUnitsGeoKey'
};

var geoKeys = {};
for (key in geoKeyNames$1) {
  geoKeys[geoKeyNames$1[key]] = parseInt(key);
}

var parseXml;
// node.js version
if (typeof window === "undefined") {
  parseXml = function parseXml(xmlStr) {
    // requires xmldom module
    var DOMParser = domParser.DOMParser;
    return new DOMParser().parseFromString(xmlStr, "text/xml");
  };
} else if (typeof window.DOMParser !== "undefined") {
  parseXml = function parseXml(xmlStr) {
    return new window.DOMParser().parseFromString(xmlStr, "text/xml");
  };
} else if (typeof window.ActiveXObject !== "undefined" && new window.ActiveXObject("Microsoft.XMLDOM")) {
  parseXml = function parseXml(xmlStr) {
    var xmlDoc = new window.ActiveXObject("Microsoft.XMLDOM");
    xmlDoc.async = "false";
    xmlDoc.loadXML(xmlStr);
    return xmlDoc;
  };
}

var globals = {
  fieldTags: fieldTags,
  fieldTagNames: fieldTagNames$1,
  arrayFields: arrayFields$1,
  fieldTypes: fieldTypes$1,
  fieldTypeNames: fieldTypeNames,
  photometricInterpretations: photometricInterpretations,
  geoKeys: geoKeys,
  geoKeyNames: geoKeyNames$1,
  parseXml: parseXml
};

function fromWhiteIsZero(raster, max, width, height) {
  var rgbRaster = new Uint8Array(width * height * 3);
  var value;
  for (var i = 0, j = 0; i < raster.length; ++i, j += 3) {
    value = 256 - raster[i] / max * 256;
    rgbRaster[j] = value;
    rgbRaster[j + 1] = value;
    rgbRaster[j + 2] = value;
  }
  return rgbRaster;
}

function fromBlackIsZero(raster, max, width, height) {
  var rgbRaster = new Uint8Array(width * height * 3);
  var value;
  for (var i = 0, j = 0; i < raster.length; ++i, j += 3) {
    value = raster[i] / max * 256;
    rgbRaster[j] = value;
    rgbRaster[j + 1] = value;
    rgbRaster[j + 2] = value;
  }
  return rgbRaster;
}

function fromPalette(raster, colorMap, width, height) {
  var rgbRaster = new Uint8Array(width * height * 3);
  var greenOffset = colorMap.length / 3;
  var blueOffset = colorMap.length / 3 * 2;
  for (var i = 0, j = 0; i < raster.length; ++i, j += 3) {
    var mapIndex = raster[i];
    rgbRaster[j] = colorMap[mapIndex] / 65536 * 256;
    rgbRaster[j + 1] = colorMap[mapIndex + greenOffset] / 65536 * 256;
    rgbRaster[j + 2] = colorMap[mapIndex + blueOffset] / 65536 * 256;
  }
  return rgbRaster;
}

function fromCMYK(cmykRaster, width, height) {
  var rgbRaster = new Uint8Array(width * height * 3);
  var c, m, y, k;
  for (var i = 0, j = 0; i < cmykRaster.length; i += 4, j += 3) {
    c = cmykRaster[i];
    m = cmykRaster[i + 1];
    y = cmykRaster[i + 2];
    k = cmykRaster[i + 3];

    rgbRaster[j] = 255 * ((255 - c) / 256) * ((255 - k) / 256);
    rgbRaster[j + 1] = 255 * ((255 - m) / 256) * ((255 - k) / 256);
    rgbRaster[j + 2] = 255 * ((255 - y) / 256) * ((255 - k) / 256);
  }
  return rgbRaster;
}

function fromYCbCr(yCbCrRaster, width, height) {
  var rgbRaster = new Uint8Array(width * height * 3);
  var y, cb, cr;
  for (var i = 0, j = 0; i < yCbCrRaster.length; i += 3, j += 3) {
    y = yCbCrRaster[i];
    cb = yCbCrRaster[i + 1];
    cr = yCbCrRaster[i + 2];

    rgbRaster[j] = y + 1.40200 * (cr - 0x80);
    rgbRaster[j + 1] = y - 0.34414 * (cb - 0x80) - 0.71414 * (cr - 0x80);
    rgbRaster[j + 2] = y + 1.77200 * (cb - 0x80);
  }
  return rgbRaster;
}

// converted from here:
// http://de.mathworks.com/matlabcentral/fileexchange/24010-lab2rgb/content/Lab2RGB.m
// still buggy
function fromCIELab(cieLabRaster, width, height) {
  var T1 = 0.008856;
  var T2 = 0.206893;
  var MAT = [3.240479, -1.537150, -0.498535, -0.969256, 1.875992, 0.041556, 0.055648, -0.204043, 1.057311];
  var rgbRaster = new Uint8Array(width * height * 3);
  var L, a, b;
  var fX, fY, fZ, XT, YT, ZT, X, Y, Z;
  for (var i = 0, j = 0; i < cieLabRaster.length; i += 3, j += 3) {
    L = cieLabRaster[i];
    a = cieLabRaster[i + 1];
    b = cieLabRaster[i + 2];

    // Compute Y
    fY = Math.pow((L + 16) / 116, 3);
    YT = fY > T1;
    fY = (YT !== 0) * (L / 903.3) + YT * fY;
    Y = fY;

    fY = YT * Math.pow(fY, 1 / 3) + (YT !== 0) * (7.787 * fY + 16 / 116);

    // Compute X
    fX = a / 500 + fY;
    XT = fX > T2;
    X = XT * Math.pow(fX, 3) + (XT !== 0) * ((fX - 16 / 116) / 7.787);

    // Compute Z
    fZ = fY - b / 200;
    ZT = fZ > T2;
    Z = ZT * Math.pow(fZ, 3) + (ZT !== 0) * ((fZ - 16 / 116) / 7.787);

    // Normalize for D65 white point
    X = X * 0.950456;
    Z = Z * 1.088754;

    rgbRaster[j] = X * MAT[0] + Y * MAT[1] + Z * MAT[2];
    rgbRaster[j + 1] = X * MAT[3] + Y * MAT[4] + Z * MAT[5];
    rgbRaster[j + 2] = X * MAT[6] + Y * MAT[7] + Z * MAT[8];
  }
  return rgbRaster;
}

var rgb = {
  fromWhiteIsZero: fromWhiteIsZero,
  fromBlackIsZero: fromBlackIsZero,
  fromPalette: fromPalette,
  fromCMYK: fromCMYK,
  fromYCbCr: fromYCbCr,
  fromCIELab: fromCIELab
};

function AbstractDecoder() {}

AbstractDecoder.prototype = {
  isAsync: function isAsync() {
    // TODO: check if async reading func is enabled or not.
    return typeof this.decodeBlock === "undefined";
  }
};

var abstractdecoder = AbstractDecoder;

function RawDecoder() {}

RawDecoder.prototype = Object.create(abstractdecoder.prototype);
RawDecoder.prototype.constructor = RawDecoder;
RawDecoder.prototype.decodeBlock = function (buffer) {
  return buffer;
};

var raw = RawDecoder;

//var lzwCompress = require("lzwcompress");



var MIN_BITS = 9;
var MAX_BITS$2 = 12;
var CLEAR_CODE = 256; // clear code
var EOI_CODE = 257; // end of information

function LZW() {
  this.littleEndian = false;
  this.position = 0;

  this._makeEntryLookup = false;
  this.dictionary = [];
}

LZW.prototype = {
  constructor: LZW,
  initDictionary: function initDictionary() {
    this.dictionary = new Array(258);
    this.entryLookup = {};
    this.byteLength = MIN_BITS;
    for (var i = 0; i <= 257; i++) {
      // i really feal like i <= 257, but I get strange unknown words that way.
      this.dictionary[i] = [i];
      if (this._makeEntryLookup) {
        this.entryLookup[i] = i;
      }
    }
  },

  decompress: function decompress(input) {
    this._makeEntryLookup = false; // for speed
    this.initDictionary();
    this.position = 0;
    this.result = [];
    if (!input.buffer) {
      input = new Uint8Array(input);
    }
    var mydataview = new DataView(input.buffer);
    var code = this.getNext(mydataview);
    var oldCode;
    while (code !== EOI_CODE) {
      if (code === CLEAR_CODE) {
        this.initDictionary();
        code = this.getNext(mydataview);
        while (code === CLEAR_CODE) {
          code = this.getNext(mydataview);
        }
        if (code > CLEAR_CODE) {
          throw 'corrupted code at scanline ' + code;
        }
        if (code === EOI_CODE) {
          break;
        } else {
          var val = this.dictionary[code];
          this.appendArray(this.result, val);
          oldCode = code;
        }
      } else {
        if (this.dictionary[code] !== undefined) {
          var _val = this.dictionary[code];
          this.appendArray(this.result, _val);
          var newVal = this.dictionary[oldCode].concat(this.dictionary[code][0]);
          this.addToDictionary(newVal);
          oldCode = code;
        } else {
          var oldVal = this.dictionary[oldCode];
          if (!oldVal) {
            throw "Bogus entry. Not in dictionary, " + oldCode + " / " + this.dictionary.length + ", position: " + this.position;
          }
          var _newVal = oldVal.concat(this.dictionary[oldCode][0]);
          this.appendArray(this.result, _newVal);
          this.addToDictionary(_newVal);
          oldCode = code;
        }
      }
      // This is strange. It seems like the
      if (this.dictionary.length >= Math.pow(2, this.byteLength) - 1) {
        this.byteLength++;
      }
      code = this.getNext(mydataview);
    }
    return new Uint8Array(this.result);
  },

  appendArray: function appendArray(dest, source) {
    for (var i = 0; i < source.length; i++) {
      dest.push(source[i]);
    }
    return dest;
  },

  haveBytesChanged: function haveBytesChanged() {
    if (this.dictionary.length >= Math.pow(2, this.byteLength)) {
      this.byteLength++;
      return true;
    }
    return false;
  },

  addToDictionary: function addToDictionary(arr) {
    this.dictionary.push(arr);
    if (this._makeEntryLookup) {
      this.entryLookup[arr] = this.dictionary.length - 1;
    }
    this.haveBytesChanged();
    return this.dictionary.length - 1;
  },

  getNext: function getNext(dataview) {
    var byte = this.getByte(dataview, this.position, this.byteLength);
    this.position += this.byteLength;
    return byte;
  },

  // This binary representation might actually be as fast as the completely illegible bit shift approach
  //
  getByte: function getByte(dataview, position, length) {
    var d = position % 8;
    var a = Math.floor(position / 8);
    var de = 8 - d;
    var ef = position + length - (a + 1) * 8;
    var fg = 8 * (a + 2) - (position + length);
    var dg = (a + 2) * 8 - position;
    fg = Math.max(0, fg);
    if (a >= dataview.byteLength) {
      console.warn('ran off the end of the buffer before finding EOI_CODE (end on input code)');
      return EOI_CODE;
    }
    var chunk1 = dataview.getUint8(a, this.littleEndian) & Math.pow(2, 8 - d) - 1;
    chunk1 = chunk1 << length - de;
    var chunks = chunk1;
    if (a + 1 < dataview.byteLength) {
      var chunk2 = dataview.getUint8(a + 1, this.littleEndian) >>> fg;
      chunk2 = chunk2 << Math.max(0, length - dg);
      chunks += chunk2;
    }
    if (ef > 8 && a + 2 < dataview.byteLength) {
      var hi = (a + 3) * 8 - (position + length);
      var chunk3 = dataview.getUint8(a + 2, this.littleEndian) >>> hi;
      chunks += chunk3;
    }
    return chunks;
  },

  // compress has not been optimized and uses a uint8 array to hold binary values.
  compress: function compress(input) {
    this._makeEntryLookup = true;
    this.initDictionary();
    this.position = 0;
    var resultBits = [];
    var omega = [];
    resultBits = this.appendArray(resultBits, this.binaryFromByte(CLEAR_CODE, this.byteLength)); // resultBits.concat(Array.from(this.binaryFromByte(this.CLEAR_CODE, this.byteLength)))
    for (var i = 0; i < input.length; i++) {
      var k = [input[i]];
      var omk = omega.concat(k);
      if (this.entryLookup[omk] !== undefined) {
        omega = omk;
      } else {
        var _code = this.entryLookup[omega];
        var _bin = this.binaryFromByte(_code, this.byteLength);
        resultBits = this.appendArray(resultBits, _bin);
        this.addToDictionary(omk);
        omega = k;
        if (this.dictionary.length >= Math.pow(2, MAX_BITS$2)) {
          resultBits = this.appendArray(resultBits, this.binaryFromByte(CLEAR_CODE, this.byteLength));
          this.initDictionary();
        }
      }
    }
    var code = this.entryLookup[omega];
    var bin = this.binaryFromByte(code, this.byteLength);
    resultBits = this.appendArray(resultBits, bin);
    resultBits = resultBits = this.appendArray(resultBits, this.binaryFromByte(EOI_CODE, this.byteLength));
    this.binary = resultBits;
    this.result = this.binaryToUint8(resultBits);
    return this.result;
  },

  byteFromCode: function byteFromCode(code) {
    var res = this.dictionary[code];
    return res;
  },

  binaryFromByte: function binaryFromByte(byte) {
    var byteLength = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 8;

    var res = new Uint8Array(byteLength);
    for (var i = 0; i < res.length; i++) {
      var mask = Math.pow(2, i);
      var isOne = (byte & mask) > 0;
      res[res.length - 1 - i] = isOne;
    }
    return res;
  },

  binaryToNumber: function binaryToNumber(bin) {
    var res = 0;
    for (var i = 0; i < bin.length; i++) {
      res += Math.pow(2, bin.length - i - 1) * bin[i];
    }
    return res;
  },

  inputToBinary: function inputToBinary(input) {
    var inputByteLength = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 8;

    var res = new Uint8Array(input.length * inputByteLength);
    for (var i = 0; i < input.length; i++) {
      var bin = this.binaryFromByte(input[i], inputByteLength);
      res.set(bin, i * inputByteLength);
    }
    return res;
  },

  binaryToUint8: function binaryToUint8(bin) {
    var result = new Uint8Array(Math.ceil(bin.length / 8));
    var index = 0;
    for (var i = 0; i < bin.length; i += 8) {
      var val = 0;
      for (var j = 0; j < 8 && i + j < bin.length; j++) {
        val = val + bin[i + j] * Math.pow(2, 8 - j - 1);
      }
      result[index] = val;
      index++;
    }
    return result;
  }
};

// the actual decoder interface

function LZWDecoder() {
  this.decompressor = new LZW();
}

LZWDecoder.prototype = Object.create(abstractdecoder.prototype);
LZWDecoder.prototype.constructor = LZWDecoder;
LZWDecoder.prototype.decodeBlock = function (buffer) {
  return this.decompressor.decompress(buffer).buffer;
};

var lzw = LZWDecoder;

var pakoInflate = inflate_1.inflate;

function DeflateDecoder() {}

DeflateDecoder.prototype = Object.create(abstractdecoder.prototype);
DeflateDecoder.prototype.constructor = DeflateDecoder;
DeflateDecoder.prototype.decodeBlock = function (buffer) {
  return pakoInflate(new Uint8Array(buffer)).buffer;
};

var deflate$3 = DeflateDecoder;

function PackbitsDecoder() {}

PackbitsDecoder.prototype = Object.create(abstractdecoder.prototype);
PackbitsDecoder.prototype.constructor = PackbitsDecoder;
PackbitsDecoder.prototype.decodeBlock = function (buffer) {
  var dataView = new DataView(buffer);
  var out = [];
  var i, j;

  for (i = 0; i < buffer.byteLength; ++i) {
    var header = dataView.getInt8(i);
    if (header < 0) {
      var next = dataView.getUint8(i + 1);
      header = -header;
      for (j = 0; j <= header; ++j) {
        out.push(next);
      }
      i += 1;
    } else {
      for (j = 0; j <= header; ++j) {
        out.push(dataView.getUint8(i + j + 1));
      }
      i += header + 1;
    }
  }
  return new Uint8Array(out).buffer;
};

var packbits = PackbitsDecoder;

var sum = function sum(array, start, end) {
  var s = 0;
  for (var i = start; i < end; ++i) {
    s += array[i];
  }
  return s;
};

var arrayForType = function arrayForType(format, bitsPerSample, size) {
  switch (format) {
    case 1:
      // unsigned integer data
      switch (bitsPerSample) {
        case 8:
          return new Uint8Array(size);
        case 16:
          return new Uint16Array(size);
        case 32:
          return new Uint32Array(size);
      }
      break;
    case 2:
      // twos complement signed integer data
      switch (bitsPerSample) {
        case 8:
          return new Int8Array(size);
        case 16:
          return new Int16Array(size);
        case 32:
          return new Int32Array(size);
      }
      break;
    case 3:
      // floating point data
      switch (bitsPerSample) {
        case 32:
          return new Float32Array(size);
        case 64:
          return new Float64Array(size);
      }
      break;
  }
  throw Error("Unsupported data format/bitsPerSample");
};

/**
 * GeoTIFF sub-file image.
 * @constructor
 * @param {Object} fileDirectory The parsed file directory
 * @param {Object} geoKeys The parsed geo-keys
 * @param {DataView} dataView The DataView for the underlying file.
 * @param {Boolean} littleEndian Whether the file is encoded in little or big endian
 * @param {Boolean} cache Whether or not decoded tiles shall be cached
 */
function GeoTIFFImage(fileDirectory, geoKeys, dataView, littleEndian, cache) {
  this.fileDirectory = fileDirectory;
  this.geoKeys = geoKeys;
  this.dataView = dataView;
  this.littleEndian = littleEndian;
  this.tiles = cache ? {} : null;
  this.isTiled = fileDirectory.StripOffsets ? false : true;
  var planarConfiguration = fileDirectory.PlanarConfiguration;
  this.planarConfiguration = typeof planarConfiguration === "undefined" ? 1 : planarConfiguration;
  if (this.planarConfiguration !== 1 && this.planarConfiguration !== 2) {
    throw new Error("Invalid planar configuration.");
  }

  switch (this.fileDirectory.Compression) {
    case undefined:
    case 1:
      // no compression
      this.decoder = new raw();
      break;
    case 5:
      // LZW
      this.decoder = new lzw();
      break;
    case 6:
      // JPEG
      throw new Error("JPEG compression not supported.");
    case 8:
      // Deflate
      this.decoder = new deflate$3();
      break;
    //case 32946: // deflate ??
    //  throw new Error("Deflate compression not supported.");
    case 32773:
      // packbits
      this.decoder = new packbits();
      break;
    default:
      throw new Error("Unknown compresseion method identifier: " + this.fileDirectory.Compression);
  }
}

GeoTIFFImage.prototype = {
  /**
   * Returns the associated parsed file directory.
   * @returns {Object} the parsed file directory
   */
  getFileDirectory: function getFileDirectory() {
    return this.fileDirectory;
  },
  /**
  * Returns the associated parsed geo keys.
  * @returns {Object} the parsed geo keys
  */
  getGeoKeys: function getGeoKeys() {
    return this.geoKeys;
  },
  /**
   * Returns the width of the image.
   * @returns {Number} the width of the image
   */
  getWidth: function getWidth() {
    return this.fileDirectory.ImageWidth;
  },
  /**
   * Returns the height of the image.
   * @returns {Number} the height of the image
   */
  getHeight: function getHeight() {
    return this.fileDirectory.ImageLength;
  },
  /**
   * Returns the number of samples per pixel.
   * @returns {Number} the number of samples per pixel
   */
  getSamplesPerPixel: function getSamplesPerPixel() {
    return this.fileDirectory.SamplesPerPixel;
  },
  /**
   * Returns the width of each tile.
   * @returns {Number} the width of each tile
   */
  getTileWidth: function getTileWidth() {
    return this.isTiled ? this.fileDirectory.TileWidth : this.getWidth();
  },
  /**
   * Returns the height of each tile.
   * @returns {Number} the height of each tile
   */
  getTileHeight: function getTileHeight() {
    return this.isTiled ? this.fileDirectory.TileLength : this.fileDirectory.RowsPerStrip;
  },

  /**
   * Calculates the number of bytes for each pixel across all samples. Only full
   * bytes are supported, an exception is thrown when this is not the case.
   * @returns {Number} the bytes per pixel
   */
  getBytesPerPixel: function getBytesPerPixel() {
    var bitsPerSample = 0;
    for (var i = 0; i < this.fileDirectory.BitsPerSample.length; ++i) {
      var bits = this.fileDirectory.BitsPerSample[i];
      if (bits % 8 !== 0) {
        throw new Error("Sample bit-width of " + bits + " is not supported.");
      } else if (bits !== this.fileDirectory.BitsPerSample[0]) {
        throw new Error("Differing size of samples in a pixel are not supported.");
      }
      bitsPerSample += bits;
    }
    return bitsPerSample / 8;
  },

  getSampleByteSize: function getSampleByteSize(i) {
    if (i >= this.fileDirectory.BitsPerSample.length) {
      throw new RangeError("Sample index " + i + " is out of range.");
    }
    var bits = this.fileDirectory.BitsPerSample[i];
    if (bits % 8 !== 0) {
      throw new Error("Sample bit-width of " + bits + " is not supported.");
    }
    return bits / 8;
  },

  getReaderForSample: function getReaderForSample(sampleIndex) {
    var format = this.fileDirectory.SampleFormat ? this.fileDirectory.SampleFormat[sampleIndex] : 1;
    var bitsPerSample = this.fileDirectory.BitsPerSample[sampleIndex];
    switch (format) {
      case 1:
        // unsigned integer data
        switch (bitsPerSample) {
          case 8:
            return DataView.prototype.getUint8;
          case 16:
            return DataView.prototype.getUint16;
          case 32:
            return DataView.prototype.getUint32;
        }
        break;
      case 2:
        // twos complement signed integer data
        switch (bitsPerSample) {
          case 8:
            return DataView.prototype.getInt8;
          case 16:
            return DataView.prototype.getInt16;
          case 32:
            return DataView.prototype.getInt32;
        }
        break;
      case 3:
        switch (bitsPerSample) {
          case 32:
            return DataView.prototype.getFloat32;
          case 64:
            return DataView.prototype.getFloat64;
        }
        break;
    }
  },

  getArrayForSample: function getArrayForSample(sampleIndex, size) {
    var format = this.fileDirectory.SampleFormat ? this.fileDirectory.SampleFormat[sampleIndex] : 1;
    var bitsPerSample = this.fileDirectory.BitsPerSample[sampleIndex];
    return arrayForType(format, bitsPerSample, size);
  },

  getDecoder: function getDecoder() {
    return this.decoder;
  },

  /**
   * Returns the decoded strip or tile.
   * @param {Number} x the strip or tile x-offset
   * @param {Number} y the tile y-offset (0 for stripped images)
   * @param {Number} plane the planar configuration (1: "chunky", 2: "separate samples")
   * @returns {(Int8Array|Uint8Array|Int16Array|Uint16Array|Int32Array|Uint32Array|Float32Array|Float64Array)}
   */
  getTileOrStrip: function getTileOrStrip(x, y, sample, callback) {
    var numTilesPerRow = Math.ceil(this.getWidth() / this.getTileWidth());
    var numTilesPerCol = Math.ceil(this.getHeight() / this.getTileHeight());
    var index;
    var tiles = this.tiles;
    if (this.planarConfiguration === 1) {
      index = y * numTilesPerRow + x;
    } else if (this.planarConfiguration === 2) {
      index = sample * numTilesPerRow * numTilesPerCol + y * numTilesPerRow + x;
    }

    if (tiles !== null && index in tiles) {
      if (callback) {
        return callback(null, { x: x, y: y, sample: sample, data: tiles[index] });
      }
      return tiles[index];
    } else {
      var offset, byteCount;
      if (this.isTiled) {
        offset = this.fileDirectory.TileOffsets[index];
        byteCount = this.fileDirectory.TileByteCounts[index];
      } else {
        offset = this.fileDirectory.StripOffsets[index];
        byteCount = this.fileDirectory.StripByteCounts[index];
      }
      var slice = this.dataView.buffer.slice(offset, offset + byteCount);
      if (callback) {
        return this.getDecoder().decodeBlockAsync(slice, function (error, data) {
          if (!error && tiles !== null) {
            tiles[index] = data;
          }
          callback(error, { x: x, y: y, sample: sample, data: data });
        });
      }
      var block = this.getDecoder().decodeBlock(slice);
      if (tiles !== null) {
        tiles[index] = block;
      }
      return block;
    }
  },

  _readRasterAsync: function _readRasterAsync(imageWindow, samples, valueArrays, interleave, callback, callbackError) {
    var tileWidth = this.getTileWidth();
    var tileHeight = this.getTileHeight();

    var minXTile = Math.floor(imageWindow[0] / tileWidth);
    var maxXTile = Math.ceil(imageWindow[2] / tileWidth);
    var minYTile = Math.floor(imageWindow[1] / tileHeight);
    var maxYTile = Math.ceil(imageWindow[3] / tileHeight);

    var numTilesPerRow = Math.ceil(this.getWidth() / tileWidth);

    var windowWidth = imageWindow[2] - imageWindow[0];
    var windowHeight = imageWindow[3] - imageWindow[1];

    var bytesPerPixel = this.getBytesPerPixel();
    var imageWidth = this.getWidth();

    var predictor = this.fileDirectory.Predictor || 1;

    var srcSampleOffsets = [];
    var sampleReaders = [];
    for (var i = 0; i < samples.length; ++i) {
      if (this.planarConfiguration === 1) {
        srcSampleOffsets.push(sum(this.fileDirectory.BitsPerSample, 0, samples[i]) / 8);
      } else {
        srcSampleOffsets.push(0);
      }
      sampleReaders.push(this.getReaderForSample(samples[i]));
    }

    var allStacked = false;
    var unfinishedTiles = 0;
    var littleEndian = this.littleEndian;
    var globalError = null;

    function checkFinished() {
      if (allStacked && unfinishedTiles === 0) {
        if (globalError) {
          callbackError(globalError);
        } else {
          callback(valueArrays);
        }
      }
    }

    function onTileGot(error, tile) {
      if (!error) {
        var dataView = new DataView(tile.data);

        var firstLine = tile.y * tileHeight;
        var firstCol = tile.x * tileWidth;
        var lastLine = (tile.y + 1) * tileHeight;
        var lastCol = (tile.x + 1) * tileWidth;
        var sampleIndex = tile.sample;

        for (var y = Math.max(0, imageWindow[1] - firstLine); y < Math.min(tileHeight, tileHeight - (lastLine - imageWindow[3])); ++y) {
          for (var x = Math.max(0, imageWindow[0] - firstCol); x < Math.min(tileWidth, tileWidth - (lastCol - imageWindow[2])); ++x) {
            var pixelOffset = (y * tileWidth + x) * bytesPerPixel;
            var value = sampleReaders[sampleIndex].call(dataView, pixelOffset + srcSampleOffsets[sampleIndex], littleEndian);
            var windowCoordinate;
            if (interleave) {
              if (predictor !== 1 && x > 0) {
                windowCoordinate = (y + firstLine - imageWindow[1]) * windowWidth * samples.length + (x + firstCol - imageWindow[0] - 1) * samples.length + sampleIndex;
                value += valueArrays[windowCoordinate];
              }

              windowCoordinate = (y + firstLine - imageWindow[1]) * windowWidth * samples.length + (x + firstCol - imageWindow[0]) * samples.length + sampleIndex;
              valueArrays[windowCoordinate] = value;
            } else {
              if (predictor !== 1 && x > 0) {
                windowCoordinate = (y + firstLine - imageWindow[1]) * windowWidth + x - 1 + firstCol - imageWindow[0];
                value += valueArrays[sampleIndex][windowCoordinate];
              }

              windowCoordinate = (y + firstLine - imageWindow[1]) * windowWidth + x + firstCol - imageWindow[0];
              valueArrays[sampleIndex][windowCoordinate] = value;
            }
          }
        }
      } else {
        globalError = error;
      }

      // check end condition and call callbacks
      unfinishedTiles -= 1;
      checkFinished();
    }

    for (var yTile = minYTile; yTile <= maxYTile; ++yTile) {
      for (var xTile = minXTile; xTile <= maxXTile; ++xTile) {
        for (var sampleIndex = 0; sampleIndex < samples.length; ++sampleIndex) {
          var sample = samples[sampleIndex];
          if (this.planarConfiguration === 2) {
            bytesPerPixel = this.getSampleByteSize(sample);
          }
          var _sampleIndex = sampleIndex;
          unfinishedTiles += 1;
          this.getTileOrStrip(xTile, yTile, sample, onTileGot);
        }
      }
    }
    allStacked = true;
    checkFinished();
  },

  _readRaster: function _readRaster(imageWindow, samples, valueArrays, interleave, callback, callbackError) {
    try {
      var tileWidth = this.getTileWidth();
      var tileHeight = this.getTileHeight();

      var minXTile = Math.floor(imageWindow[0] / tileWidth);
      var maxXTile = Math.ceil(imageWindow[2] / tileWidth);
      var minYTile = Math.floor(imageWindow[1] / tileHeight);
      var maxYTile = Math.ceil(imageWindow[3] / tileHeight);

      var numTilesPerRow = Math.ceil(this.getWidth() / tileWidth);

      var windowWidth = imageWindow[2] - imageWindow[0];
      var windowHeight = imageWindow[3] - imageWindow[1];

      var bytesPerPixel = this.getBytesPerPixel();
      var imageWidth = this.getWidth();

      var predictor = this.fileDirectory.Predictor || 1;

      var srcSampleOffsets = [];
      var sampleReaders = [];
      for (var i = 0; i < samples.length; ++i) {
        if (this.planarConfiguration === 1) {
          srcSampleOffsets.push(sum(this.fileDirectory.BitsPerSample, 0, samples[i]) / 8);
        } else {
          srcSampleOffsets.push(0);
        }
        sampleReaders.push(this.getReaderForSample(samples[i]));
      }

      for (var yTile = minYTile; yTile < maxYTile; ++yTile) {
        for (var xTile = minXTile; xTile < maxXTile; ++xTile) {
          var firstLine = yTile * tileHeight;
          var firstCol = xTile * tileWidth;
          var lastLine = (yTile + 1) * tileHeight;
          var lastCol = (xTile + 1) * tileWidth;

          for (var sampleIndex = 0; sampleIndex < samples.length; ++sampleIndex) {
            var sample = samples[sampleIndex];
            if (this.planarConfiguration === 2) {
              bytesPerPixel = this.getSampleByteSize(sample);
            }
            var tile = new DataView(this.getTileOrStrip(xTile, yTile, sample));

            var reader = sampleReaders[sampleIndex];
            var ymax = Math.min(tileHeight, tileHeight - (lastLine - imageWindow[3]));
            var xmax = Math.min(tileWidth, tileWidth - (lastCol - imageWindow[2]));
            var totalbytes = (ymax * tileWidth + xmax) * bytesPerPixel;
            var tileLength = new Uint8Array(tile.buffer).length;
            if (2 * tileLength !== totalbytes && this._debugMessages) {
              console.warn('dimension mismatch', tileLength, totalbytes);
            }
            for (var y = Math.max(0, imageWindow[1] - firstLine); y < ymax; ++y) {
              for (var x = Math.max(0, imageWindow[0] - firstCol); x < xmax; ++x) {
                var pixelOffset = (y * tileWidth + x) * bytesPerPixel;
                var value = 0;
                if (pixelOffset < tileLength - 1) {
                  value = reader.call(tile, pixelOffset + srcSampleOffsets[sampleIndex], this.littleEndian);
                }

                var windowCoordinate;
                if (interleave) {
                  if (predictor !== 1 && x > 0) {
                    windowCoordinate = (y + firstLine - imageWindow[1]) * windowWidth * samples.length + (x + firstCol - imageWindow[0] - 1) * samples.length + sampleIndex;
                    value += valueArrays[windowCoordinate];
                  }

                  windowCoordinate = (y + firstLine - imageWindow[1]) * windowWidth * samples.length + (x + firstCol - imageWindow[0]) * samples.length + sampleIndex;
                  valueArrays[windowCoordinate] = value;
                } else {
                  if (predictor !== 1 && x > 0) {
                    windowCoordinate = (y + firstLine - imageWindow[1]) * windowWidth + x - 1 + firstCol - imageWindow[0];
                    value += valueArrays[sampleIndex][windowCoordinate];
                  }

                  windowCoordinate = (y + firstLine - imageWindow[1]) * windowWidth + x + firstCol - imageWindow[0];
                  valueArrays[sampleIndex][windowCoordinate] = value;
                }
              }
            }
          }
        }
      }
      callback(valueArrays);
      return valueArrays;
    } catch (error) {
      return callbackError(error);
    }
  },

  /**
   * This callback is called upon successful reading of a GeoTIFF image. The
   * resulting arrays are passed as a single argument.
   * @callback GeoTIFFImage~readCallback
   * @param {(TypedArray|TypedArray[])} array the requested data as a either a
   *                                          single typed array or a list of
   *                                          typed arrays, depending on the
   *                                          'interleave' option.
   */

  /**
   * This callback is called upon encountering an error while reading of a
   * GeoTIFF image
   * @callback GeoTIFFImage~readErrorCallback
   * @param {Error} error the encountered error
   */

  /**
   * Reads raster data from the image. This function reads all selected samples
   * into separate arrays of the correct type for that sample. When provided,
   * only a subset of the raster is read for each sample.
   *
   * @param {Object} [options] optional parameters
   * @param {Array} [options.window=whole image] the subset to read data from.
   * @param {Array} [options.samples=all samples] the selection of samples to read from.
   * @param {Boolean} [options.interleave=false] whether the data shall be read
   *                                             in one single array or separate
   *                                             arrays.
   * @param {GeoTIFFImage~readCallback} [callback] the success callback. this
   *                                               parameter is mandatory for
   *                                               asynchronous decoders (some
   *                                               compression mechanisms).
   * @param {GeoTIFFImage~readErrorCallback} [callbackError] the error callback
   * @returns {(TypedArray|TypedArray[]|null)} in synchonous cases, the decoded
   *                                           array(s) is/are returned. In
   *                                           asynchronous cases, nothing is
   *                                           returned.
   */
  readRasters: function readRasters() /* arguments are read via the 'arguments' object */{
    // parse the arguments
    var options, callback, callbackError;
    switch (arguments.length) {
      case 0:
        break;
      case 1:
        if (typeof arguments[0] === "function") {
          callback = arguments[0];
        } else {
          options = arguments[0];
        }
        break;
      case 2:
        if (typeof arguments[0] === "function") {
          callback = arguments[0];
          callbackError = arguments[1];
        } else {
          options = arguments[0];
          callback = arguments[1];
        }
        break;
      case 3:
        options = arguments[0];
        callback = arguments[1];
        callbackError = arguments[2];
        break;
      default:
        throw new Error("Invalid number of arguments passed.");
    }

    // set up default arguments
    options = options || {};
    callbackError = callbackError || function (error) {
      console.error(error);
    };

    var imageWindow = options.window || [0, 0, this.getWidth(), this.getHeight()],
        samples = options.samples,
        interleave = options.interleave;

    // check parameters
    if (imageWindow[0] < 0 || imageWindow[1] < 0 || imageWindow[2] > this.getWidth() || imageWindow[3] > this.getHeight()) {
      throw new Error("Select window is out of image bounds.");
    } else if (imageWindow[0] > imageWindow[2] || imageWindow[1] > imageWindow[3]) {
      throw new Error("Invalid subsets");
    }

    var imageWindowWidth = imageWindow[2] - imageWindow[0];
    var imageWindowHeight = imageWindow[3] - imageWindow[1];
    var numPixels = imageWindowWidth * imageWindowHeight;
    var i;

    if (!samples) {
      samples = [];
      for (i = 0; i < this.fileDirectory.SamplesPerPixel; ++i) {
        samples.push(i);
      }
    } else {
      for (i = 0; i < samples.length; ++i) {
        if (samples[i] >= this.fileDirectory.SamplesPerPixel) {
          throw new RangeError("Invalid sample index '" + samples[i] + "'.");
        }
      }
    }
    var valueArrays;
    if (interleave) {
      var format = this.fileDirectory.SampleFormat ? Math.max.apply(null, this.fileDirectory.SampleFormat) : 1,
          bitsPerSample = Math.max.apply(null, this.fileDirectory.BitsPerSample);
      valueArrays = arrayForType(format, bitsPerSample, numPixels * samples.length);
    } else {
      valueArrays = [];
      for (i = 0; i < samples.length; ++i) {
        valueArrays.push(this.getArrayForSample(samples[i], numPixels));
      }
    }

    // start reading data, sync or async
    var decoder = this.getDecoder();
    if (decoder.isAsync()) {
      if (!callback) {
        throw new Error("No callback specified for asynchronous raster reading.");
      }
      return this._readRasterAsync(imageWindow, samples, valueArrays, interleave, callback, callbackError);
    } else {
      callback = callback || function () {};
      return this._readRaster(imageWindow, samples, valueArrays, interleave, callback, callbackError);
    }
  },

  /**
   * Reads raster data from the image as RGB. The result is always an
   * interleaved typed array.
   * Colorspaces other than RGB will be transformed to RGB, color maps expanded.
   * When no other method is applicable, the first sample is used to produce a
   * greayscale image.
   * When provided, only a subset of the raster is read for each sample.
   *
   * @param {Object} [options] optional parameters
   * @param {Array} [options.window=whole image] the subset to read data from.
   * @param {GeoTIFFImage~readCallback} callback the success callback. this
   *                                             parameter is mandatory.
   * @param {GeoTIFFImage~readErrorCallback} [callbackError] the error callback
   */
  readRGB: function readRGB() {
    // parse the arguments
    var options = null,
        callback = null,
        callbackError = null;
    switch (arguments.length) {
      case 0:
        break;
      case 1:
        if (typeof arguments[0] === "function") {
          callback = arguments[0];
        } else {
          options = arguments[0];
        }
        break;
      case 2:
        if (typeof arguments[0] === "function") {
          callback = arguments[0];
          callbackError = arguments[1];
        } else {
          options = arguments[0];
          callback = arguments[1];
        }
        break;
      case 3:
        options = arguments[0];
        callback = arguments[1];
        callbackError = arguments[2];
        break;
      default:
        throw new Error("Invalid number of arguments passed.");
    }

    // set up default arguments
    options = options || {};
    callbackError = callbackError || function (error) {
      console.error(error);
    };

    var imageWindow = options.window || [0, 0, this.getWidth(), this.getHeight()];

    // check parameters
    if (imageWindow[0] < 0 || imageWindow[1] < 0 || imageWindow[2] > this.getWidth() || imageWindow[3] > this.getHeight()) {
      throw new Error("Select window is out of image bounds.");
    } else if (imageWindow[0] > imageWindow[2] || imageWindow[1] > imageWindow[3]) {
      throw new Error("Invalid subsets");
    }

    var width = imageWindow[2] - imageWindow[0];
    var height = imageWindow[3] - imageWindow[1];

    var pi = this.fileDirectory.PhotometricInterpretation;

    var bits = this.fileDirectory.BitsPerSample[0];
    var max = Math.pow(2, bits);

    if (pi === globals.photometricInterpretations.RGB) {
      return this.readRasters({
        window: options.window,
        interleave: true
      }, callback, callbackError);
    }

    var samples;
    switch (pi) {
      case globals.photometricInterpretations.WhiteIsZero:
      case globals.photometricInterpretations.BlackIsZero:
      case globals.photometricInterpretations.Palette:
        samples = [0];
        break;
      case globals.photometricInterpretations.CMYK:
        samples = [0, 1, 2, 3];
        break;
      case globals.photometricInterpretations.YCbCr:
      case globals.photometricInterpretations.CIELab:
        samples = [0, 1, 2];
        break;
      default:
        throw new Error("Invalid or unsupported photometric interpretation.");
    }

    var subOptions = {
      window: options.window,
      interleave: true,
      samples: samples
    };
    var fileDirectory = this.fileDirectory;
    return this.readRasters(subOptions, function (raster) {
      switch (pi) {
        case globals.photometricInterpretations.WhiteIsZero:
          return callback(rgb.fromWhiteIsZero(raster, max, width, height));
        case globals.photometricInterpretations.BlackIsZero:
          return callback(rgb.fromBlackIsZero(raster, max, width, height));
        case globals.photometricInterpretations.Palette:
          return callback(rgb.fromPalette(raster, fileDirectory.ColorMap, width, height));
        case globals.photometricInterpretations.CMYK:
          return callback(rgb.fromCMYK(raster, width, height));
        case globals.photometricInterpretations.YCbCr:
          return callback(rgb.fromYCbCr(raster, width, height));
        case globals.photometricInterpretations.CIELab:
          return callback(rgb.fromCIELab(raster, width, height));
      }
    }, callbackError);
  },

  /**
   * Returns an array of tiepoints.
   * @returns {Object[]}
   */
  getTiePoints: function getTiePoints() {
    if (!this.fileDirectory.ModelTiepoint) {
      return [];
    }

    var tiePoints = [];
    for (var i = 0; i < this.fileDirectory.ModelTiepoint.length; i += 6) {
      tiePoints.push({
        i: this.fileDirectory.ModelTiepoint[i],
        j: this.fileDirectory.ModelTiepoint[i + 1],
        k: this.fileDirectory.ModelTiepoint[i + 2],
        x: this.fileDirectory.ModelTiepoint[i + 3],
        y: this.fileDirectory.ModelTiepoint[i + 4],
        z: this.fileDirectory.ModelTiepoint[i + 5]
      });
    }
    return tiePoints;
  },

  /**
   * Returns the parsed GDAL metadata items.
   * @returns {Object}
   */
  getGDALMetadata: function getGDALMetadata() {
    var metadata = {};
    if (!this.fileDirectory.GDAL_METADATA) {
      return null;
    }
    var string = this.fileDirectory.GDAL_METADATA;
    var xmlDom = globals.parseXml(string.substring(0, string.length - 1));
    var result = xmlDom.evaluate("GDALMetadata/Item", xmlDom, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
    for (var i = 0; i < result.snapshotLength; ++i) {
      var node = result.snapshotItem(i);
      metadata[node.getAttribute("name")] = node.textContent;
    }
    return metadata;
  },

  /**
   * Returns the image origin as a XYZ-vector. When the image has no affine
   * transformation, then an exception is thrown.
   * @returns {Array} The origin as a vector
   */
  getOrigin: function getOrigin() {
    var tiePoints = this.fileDirectory.ModelTiepoint;
    if (!tiePoints || tiePoints.length !== 6) {
      throw new Error("The image does not have an affine transformation.");
    }

    return [tiePoints[3], tiePoints[4], tiePoints[5]];
  },

  /**
   * Returns the image resolution as a XYZ-vector. When the image has no affine
   * transformation, then an exception is thrown.
   * @returns {Array} The resolution as a vector
   */
  getResolution: function getResolution() {
    if (!this.fileDirectory.ModelPixelScale) {
      throw new Error("The image does not have an affine transformation.");
    }

    return [this.fileDirectory.ModelPixelScale[0], this.fileDirectory.ModelPixelScale[1], this.fileDirectory.ModelPixelScale[2]];
  },

  /**
   * Returns whether or not the pixels of the image depict an area (or point).
   * @returns {Boolean} Whether the pixels are a point
   */
  pixelIsArea: function pixelIsArea() {
    return this.geoKeys.GTRasterTypeGeoKey === 1;
  },

  /**
   * Returns the image bounding box as an array of 4 values: min-x, min-y,
   * max-x and max-y. When the image has no affine transformation, then an
   * exception is thrown.
   * @returns {Array} The bounding box
   */
  getBoundingBox: function getBoundingBox() {
    var origin = this.getOrigin();
    var resolution = this.getResolution();

    var x1 = origin[0];
    var y1 = origin[1];

    var x2 = x1 + resolution[0] * this.getWidth();
    var y2 = y1 + resolution[1] * this.getHeight();

    return [Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2)];
  }
};

var geotiffimage = GeoTIFFImage;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var DataView64 = function () {
  function DataView64(arrayBuffer) {
    _classCallCheck(this, DataView64);

    this._dataView = new DataView(arrayBuffer);
  }

  _createClass(DataView64, [{
    key: "getUint64",
    value: function getUint64(offset, littleEndian) {
      var left = this.getUint32(offset, littleEndian);
      var right = this.getUint32(offset + 4, littleEndian);
      if (littleEndian) {
        return left << 32 | right;
      }
      return right << 32 | left;
    }
  }, {
    key: "getInt64",
    value: function getInt64(offset, littleEndian) {
      var left, right;
      if (littleEndian) {
        left = this.getInt32(offset, littleEndian);
        right = this.getUint32(offset + 4, littleEndian);

        return left << 32 | right;
      }
      left = this.getUint32(offset, littleEndian);
      right = this.getInt32(offset + 4, littleEndian);
      return right << 32 | left;
    }
  }, {
    key: "getUint8",
    value: function getUint8(offset, littleEndian) {
      return this._dataView.getUint8(offset, littleEndian);
    }
  }, {
    key: "getInt8",
    value: function getInt8(offset, littleEndian) {
      return this._dataView.getInt8(offset, littleEndian);
    }
  }, {
    key: "getUint16",
    value: function getUint16(offset, littleEndian) {
      return this._dataView.getUint16(offset, littleEndian);
    }
  }, {
    key: "getInt16",
    value: function getInt16(offset, littleEndian) {
      return this._dataView.getInt16(offset, littleEndian);
    }
  }, {
    key: "getUint32",
    value: function getUint32(offset, littleEndian) {
      return this._dataView.getUint32(offset, littleEndian);
    }
  }, {
    key: "getInt32",
    value: function getInt32(offset, littleEndian) {
      return this._dataView.getInt32(offset, littleEndian);
    }
  }, {
    key: "getFloat32",
    value: function getFloat32(offset, littleEndian) {
      return this._dataView.getFloat32(offset, littleEndian);
    }
  }, {
    key: "getFloat64",
    value: function getFloat64(offset, littleEndian) {
      return this._dataView.getFloat64(offset, littleEndian);
    }
  }, {
    key: "buffer",
    get: function get() {
      return this._dataView.buffer;
    }
  }]);

  return DataView64;
}();

var dataview64 = DataView64;

var fieldTypes = globals.fieldTypes;
var fieldTagNames = globals.fieldTagNames;
var arrayFields = globals.arrayFields;
var geoKeyNames = globals.geoKeyNames;

/**
 * The abstraction for a whole GeoTIFF file.
 * @constructor
 * @param {ArrayBuffer} rawData the raw data stream of the file as an ArrayBuffer.
 * @param {Object} [options] further options.
 * @param {Boolean} [options.cache=false] whether or not decoded tiles shall be cached.
 */
function GeoTIFF(rawData, options) {
  this.dataView = new dataview64(rawData);
  options = options || {};
  this.cache = options.cache || false;

  var BOM = this.dataView.getUint16(0, 0);
  if (BOM === 0x4949) {
    this.littleEndian = true;
  } else if (BOM === 0x4D4D) {
    this.littleEndian = false;
  } else {
    throw new TypeError("Invalid byte order value.");
  }

  var magicNumber = this.dataView.getUint16(2, this.littleEndian);
  if (this.dataView.getUint16(2, this.littleEndian) === 42) {
    this.bigTiff = false;
  } else if (magicNumber === 43) {
    this.bigTiff = true;
    var offsetBytesize = this.dataView.getUint16(4, this.littleEndian);
    if (offsetBytesize !== 8) {
      throw new Error("Unsupported offset byte-size.");
    }
  } else {
    throw new TypeError("Invalid magic number.");
  }

  this.fileDirectories = this.parseFileDirectories(this.getOffset(this.bigTiff ? 8 : 4));
}

GeoTIFF.prototype = {
  getOffset: function getOffset(offset) {
    if (this.bigTiff) {
      return this.dataView.getUint64(offset, this.littleEndian);
    }
    return this.dataView.getUint32(offset, this.littleEndian);
  },

  getFieldTypeLength: function getFieldTypeLength(fieldType) {
    switch (fieldType) {
      case fieldTypes.BYTE:case fieldTypes.ASCII:case fieldTypes.SBYTE:case fieldTypes.UNDEFINED:
        return 1;
      case fieldTypes.SHORT:case fieldTypes.SSHORT:
        return 2;
      case fieldTypes.LONG:case fieldTypes.SLONG:case fieldTypes.FLOAT:
        return 4;
      case fieldTypes.RATIONAL:case fieldTypes.SRATIONAL:case fieldTypes.DOUBLE:
      case fieldTypes.LONG8:case fieldTypes.SLONG8:case fieldTypes.IFD8:
        return 8;
      default:
        throw new RangeError("Invalid field type: " + fieldType);
    }
  },

  getValues: function getValues(fieldType, count, offset) {
    var values = null;
    var readMethod = null;
    var fieldTypeLength = this.getFieldTypeLength(fieldType);
    var i;

    switch (fieldType) {
      case fieldTypes.BYTE:case fieldTypes.ASCII:case fieldTypes.UNDEFINED:
        values = new Uint8Array(count);readMethod = this.dataView.getUint8;
        break;
      case fieldTypes.SBYTE:
        values = new Int8Array(count);readMethod = this.dataView.getInt8;
        break;
      case fieldTypes.SHORT:
        values = new Uint16Array(count);readMethod = this.dataView.getUint16;
        break;
      case fieldTypes.SSHORT:
        values = new Int16Array(count);readMethod = this.dataView.getInt16;
        break;
      case fieldTypes.LONG:
        values = new Uint32Array(count);readMethod = this.dataView.getUint32;
        break;
      case fieldTypes.SLONG:
        values = new Int32Array(count);readMethod = this.dataView.getInt32;
        break;
      case fieldTypes.LONG8:case fieldTypes.IFD8:
        values = new Array(count);readMethod = this.dataView.getUint64;
        break;
      case fieldTypes.SLONG8:
        values = new Array(count);readMethod = this.dataView.getInt64;
        break;
      case fieldTypes.RATIONAL:
        values = new Uint32Array(count * 2);readMethod = this.dataView.getUint32;
        break;
      case fieldTypes.SRATIONAL:
        values = new Int32Array(count * 2);readMethod = this.dataView.getInt32;
        break;
      case fieldTypes.FLOAT:
        values = new Float32Array(count);readMethod = this.dataView.getFloat32;
        break;
      case fieldTypes.DOUBLE:
        values = new Float64Array(count);readMethod = this.dataView.getFloat64;
        break;
      default:
        throw new RangeError("Invalid field type: " + fieldType);
    }

    // normal fields
    if (!(fieldType === fieldTypes.RATIONAL || fieldType === fieldTypes.SRATIONAL)) {
      for (i = 0; i < count; ++i) {
        values[i] = readMethod.call(this.dataView, offset + i * fieldTypeLength, this.littleEndian);
      }
    }
    // RATIONAL or SRATIONAL
    else {
        for (i = 0; i < count; i += 2) {
          values[i] = readMethod.call(this.dataView, offset + i * fieldTypeLength, this.littleEndian);
          values[i + 1] = readMethod.call(this.dataView, offset + (i * fieldTypeLength + 4), this.littleEndian);
        }
      }

    if (fieldType === fieldTypes.ASCII) {
      return String.fromCharCode.apply(null, values);
    }
    return values;
  },

  getFieldValues: function getFieldValues(fieldTag, fieldType, typeCount, valueOffset) {
    var fieldValues;
    var fieldTypeLength = this.getFieldTypeLength(fieldType);

    if (fieldTypeLength * typeCount <= (this.bigTiff ? 8 : 4)) {
      fieldValues = this.getValues(fieldType, typeCount, valueOffset);
    } else {
      var actualOffset = this.getOffset(valueOffset);
      fieldValues = this.getValues(fieldType, typeCount, actualOffset);
    }

    if (typeCount === 1 && arrayFields.indexOf(fieldTag) === -1 && !(fieldType === fieldTypes.RATIONAL || fieldType === fieldTypes.SRATIONAL)) {
      return fieldValues[0];
    }

    return fieldValues;
  },

  parseGeoKeyDirectory: function parseGeoKeyDirectory(fileDirectory) {
    var rawGeoKeyDirectory = fileDirectory.GeoKeyDirectory;
    if (!rawGeoKeyDirectory) {
      return null;
    }

    var geoKeyDirectory = {};
    for (var i = 4; i < rawGeoKeyDirectory[3] * 4; i += 4) {
      var key = geoKeyNames[rawGeoKeyDirectory[i]],
          location = rawGeoKeyDirectory[i + 1] ? fieldTagNames[rawGeoKeyDirectory[i + 1]] : null,
          count = rawGeoKeyDirectory[i + 2],
          offset = rawGeoKeyDirectory[i + 3];

      var value = null;
      if (!location) {
        value = offset;
      } else {
        value = fileDirectory[location];
        if (typeof value === "undefined" || value === null) {
          throw new Error("Could not get value of geoKey '" + key + "'.");
        } else if (typeof value === "string") {
          value = value.substring(offset, offset + count - 1);
        } else if (value.subarray) {
          value = value.subarray(offset, offset + count - 1);
        }
      }
      geoKeyDirectory[key] = value;
    }
    return geoKeyDirectory;
  },

  parseFileDirectories: function parseFileDirectories(byteOffset) {
    var nextIFDByteOffset = byteOffset;
    var fileDirectories = [];

    while (nextIFDByteOffset !== 0x00000000) {
      var numDirEntries = this.bigTiff ? this.dataView.getUint64(nextIFDByteOffset, this.littleEndian) : this.dataView.getUint16(nextIFDByteOffset, this.littleEndian);

      var fileDirectory = {};
      var i = nextIFDByteOffset + (this.bigTiff ? 8 : 2);
      for (var entryCount = 0; entryCount < numDirEntries; i += this.bigTiff ? 20 : 12, ++entryCount) {
        var fieldTag = this.dataView.getUint16(i, this.littleEndian);
        var fieldType = this.dataView.getUint16(i + 2, this.littleEndian);
        var typeCount = this.bigTiff ? this.dataView.getUint64(i + 4, this.littleEndian) : this.dataView.getUint32(i + 4, this.littleEndian);

        fileDirectory[fieldTagNames[fieldTag]] = this.getFieldValues(fieldTag, fieldType, typeCount, i + (this.bigTiff ? 12 : 8));
      }
      fileDirectories.push([fileDirectory, this.parseGeoKeyDirectory(fileDirectory)]);

      nextIFDByteOffset = this.getOffset(i);
    }
    return fileDirectories;
  },

  /**
   * Get the n-th internal subfile a an image. By default, the first is returned.
   *
   * @param {Number} [index=0] the index of the image to return.
   * @returns {GeoTIFFImage} the image at the given index
   */
  getImage: function getImage(index) {
    index = index || 0;
    var fileDirectoryAndGeoKey = this.fileDirectories[index];
    if (!fileDirectoryAndGeoKey) {
      throw new RangeError("Invalid image index");
    }
    return new geotiffimage(fileDirectoryAndGeoKey[0], fileDirectoryAndGeoKey[1], this.dataView, this.littleEndian, this.cache);
  },

  /**
   * Returns the count of the internal subfiles.
   *
   * @returns {Number} the number of internal subfile images
   */
  getImageCount: function getImageCount() {
    return this.fileDirectories.length;
  }
};

var geotiff$1 = GeoTIFF;

var main = createCommonjsModule(function (module) {
"use strict";



/**
 * Main parsing function for GeoTIFF files.
 * @param {(string|ArrayBuffer)} data Raw data to parse the GeoTIFF from.
 * @param {Object} [options] further options.
 * @param {Boolean} [options.cache=false] whether or not decoded tiles shall be cached.
 * @returns {GeoTIFF} the parsed geotiff file.
 */
var parse = function parse(data, options) {
  var rawData, i, strLen, view;
  if (typeof data === "string" || data instanceof String) {
    rawData = new ArrayBuffer(data.length * 2); // 2 bytes for each char
    view = new Uint16Array(rawData);
    for (i = 0, strLen = data.length; i < strLen; ++i) {
      view[i] = data.charCodeAt(i);
    }
  } else if (data instanceof ArrayBuffer) {
    rawData = data;
  } else {
    throw new Error("Invalid input data given.");
  }
  return new geotiff$1(rawData, options);
};

{
  module.exports.parse = parse;
}
if (typeof window !== "undefined") {
  window["GeoTIFF"] = { parse: parse };
}
});

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

/**
* Read and decode Tiff format. The decoder for BigTiff is experimental.
* Takes an ArrayBuffer of a tiff file as input and the TiffDecoder outputs an Image2D.
* Tiff format is very broad and this decoder, thanks to the Geotiff npm package
* is compatible with single or multiband images, with or without compression, using
* various bith depth and types (8bits, 32bits, etc.)
*
* Info: Tiff 6.0 specification http://www.npes.org/pdf/TIFF-v6.pdf
*
* **Usage**
* - [examples/fileToTiff.html](../examples/fileToTiff.html)
*
*/
class TiffDecoder extends Filter {
  constructor() {
    super();
    this.addInputValidator(0, ArrayBuffer);
  }
  
  _run(){

    var inputBuffer = this._getInput(0);

    if(!inputBuffer){
      console.warn("TiffDecoder requires an ArrayBuffer as input \"0\". Unable to continue.");
      return;
    }
    
    var success = false;
    
    var tiffData = main.parse(inputBuffer);
    var tiffImage = tiffData.getImage();
    
    var data = tiffImage.readRasters( {interleave: true} );
    var width = tiffImage.getWidth();
    var height = tiffImage.getHeight();
    var ncpp = tiffImage.getSamplesPerPixel();
    
    if(ncpp == (data.length / (width*height))){
      success = true;
    }
    
    if( success ){
      var outputImg = this._addOutput( Image2D );
      outputImg.setData( data, width, height, ncpp);
    }else{
      console.warn("Tiff support is experimental and this file is not compatible.");
    }
    
  }
  
  
} /* END of class TiffDecoder */

/*
* Author    Jonathan Lurie - http://me.jonahanlurie.fr
* License   MIT
* Link      https://github.com/jonathanlurie/es6module
* Lab       MCIN - http://mcin.ca/ - Montreal Neurological Institute
*/


/**
* An instance of QeegModFileParser can be used to parse several file
* (you don't need to create a QeegModFileParser instance per file to parse).
* The Qeeg MOD file usually have the .MOD extension, though this parser does not
* need the filename or the extension.
*
*/
class QeegModFileParser {
  constructor(){
    this._rawData = null;
  }
  
  /**
  * Feed the parser with raw data to be parsed
  * @param {ArrayBuffer} data - the raw data
  */
  setRawData( data ){
    this._rawData = data;
  }
  
  
  /**
  * Launch the parsing of the ArrayBuffer that was given with the method setRawData
  * @return {Object} - the MOD file data in a readable format
  */
  parse(){
    var qeegData = null;
    try{
      qeegData = this._parseNoException();
    }catch(e){
      //console.error( e );
      console.warn("This file is not compatible.");
    }
    
    return qeegData;
  }
  
  
  /**
  * [PRIVATE]
  * This method parses the data without caring of potential exception to be raised,
  * it does not handle them. Thus, this method is unsafe to use as is and should
  * no be used directly.
  * @return {Object} - the MOD file data in a readable format
  */
  _parseNoException(){
    if( !this._rawData ){
      console.warn("The input buffer is null. Nothing to be parsed here.");
      return null;
    }
    
    var inputBuffer = this._rawData;
    
    var view = new DataView( inputBuffer );
    var littleEndian = true;
    
    // ------------- DECODING HEADER -------------------
    
    var header = {};
    
    // Protection Mask
    // Offset: 0, length: 2
    header.protectionMask = view.getUint16(0, littleEndian);
    
    // Comment (first byte is the real length)
    // Offset: 2, length: 81
    var commentRealLength = view.getUint8(2);
    var commentBytes = new Uint8Array(inputBuffer, 3, commentRealLength);
    header.comment = String.fromCharCode.apply(String, commentBytes);
    
    // Measure (M) Size
    // Offset: 83, length: 2
    header.measureSize = view.getUint16(83, littleEndian);
    
    // Duration (D) Size
    // Offset: 85, length: 2
    header.durationSize = view.getUint16(85, littleEndian);
    
    // First space (F) Size
    // Offset: 87, length: 2
    header.firstSpaceSize = view.getUint16(87, littleEndian);
    
    // Second space (S) Size
    // Offset: 89, length: 2
    header.secondSpaceSize = view.getUint16(89, littleEndian);
    
    // Reserved bytes
    // Offset: 91, length: 2
    header.reservedBytes = view.getUint16(91, littleEndian);
    
    // Data size
    // Offset: 93, length: 2
    header.dataSize = view.getUint16(93, littleEndian);
    
    // ------------- DECODING MATRIX -------------------
    var matrixOffset = 95;
    
    var matrixSizeElements =  header.measureSize * 
                              header.durationSize * 
                              header.firstSpaceSize * 
                              header.secondSpaceSize;
                              
    var matrixSizeBytes = matrixSizeElements * header.dataSize;
                          
    var matrixData = new Float32Array(matrixSizeElements);
    
    for(var i=0; i<matrixSizeElements; i++){
      matrixData[i] = view.getFloat32(matrixOffset + i * header.dataSize, littleEndian); 
    }
    
    // ------------- DECODING RESERVED BYTE SECTION -------------------
    var reservedBytesSectionOffset = matrixOffset + matrixSizeBytes;
    // we dont care about this section - we wont use it
    
    // ------------- DECODING INFO SECTION -------------------
    // This info section is lways corrupted - we wont use it
    var infoSectionOffset = reservedBytesSectionOffset + header.reservedBytes;
    var infoRealLength = view.getUint8(infoSectionOffset);
    var infoBytes = new Uint8Array(inputBuffer, infoSectionOffset+1, infoRealLength);
    var info = String.fromCharCode.apply(String, infoBytes);
    
    // ------------- DECODING HEADER OF LIST SECTION -------------------
    var headerOfListOffset = infoSectionOffset + 9;
    
    var listSize = 8;
    var offsetByteSize = 4;
    var totalByteSize = 2;
    var headerOfList = new Array(listSize);
    
    for(var i=0; i<listSize; i++){
      var record = {
        // !! IMPORTANT !! there is a known BUG in the offset value
        //offset: view.getInt16(headerOfListOffset + i * (offsetByteSize+totalByteSize), littleEndian),
        total: view.getUint16(headerOfListOffset + i * (offsetByteSize+totalByteSize) + offsetByteSize, littleEndian),
        labels: null
      };
      headerOfList[i] = record;
    }
    
    headerOfList[0].description = "list of labels for measure dimension";
    headerOfList[1].description = "list of labels for duration dimension";
    headerOfList[2].description = "list of labels for first space dimension";
    headerOfList[3].description = "list of labels for second space dimension";
    headerOfList[4].description = "list of scales";
    headerOfList[5].description = "list of units";
    headerOfList[6].description = "list of transformations";
    headerOfList[7].description = "list of contexts";
    
    var infoSection2Offset = headerOfListOffset + 48;
    var localOffset = infoSection2Offset;

    // list 1 to 6 (0 to 5 on out 0-indexed array)
    for(var i=0; i<headerOfList.length - 2; i++){
      var nbOfElem = headerOfList[i].total;
      
      headerOfList[i].labels = nbOfElem ? new Array( nbOfElem ).fill("") : 0;
      
      for(var j=0; j<nbOfElem; j++){
        var strByteLength = view.getUint8(localOffset);
        
        if( strByteLength ){
          var strBytes = new Uint8Array(inputBuffer, localOffset+1, strByteLength );
          //var str = String.fromCharCode.apply(String, strBytes);
          var str = String.fromCharCode(...strBytes);
          // some ASCII charcode are wrong, hopefully always in the same way
          headerOfList[i].labels[j] = str.replace("æ", "µ").replace("ý", "²"); 
        }
        
        localOffset += strByteLength + 1;
      }
      
    }

    // particular case for list 7 (6 on our 0-indexed array) -- the transformations
    // the total value is not the length but the actual value to consider
    var transformation = view.getUint8(localOffset);
    headerOfList[6].labels = transformation;
    localOffset += headerOfList[6].total*(transformation + 1);
    
    // ------------- DECODING THE LIST OF CONTEXT -------------------
    
    // parsing the list of contexts
    var listOfContexts = headerOfList[ headerOfList.length - 1];
    listOfContexts.contextsByteLength = new Array( listOfContexts.total );
    listOfContexts.types = new Array( listOfContexts.total );
    listOfContexts.values = new Array( listOfContexts.total );
    
    const regexTypeDetection = /[a-zA-Z ]*\:{1}([a-zA-Z]*)[\[]?\d*[\]]?/;
    
    listOfContexts.labels = new Array( listOfContexts.total ).fill("");
    
    for(var iCtx=0; iCtx<listOfContexts.total; iCtx++){
      var strByteLength = view.getUint8(localOffset);
      var strBytes = new Uint8Array(inputBuffer, localOffset+1, strByteLength );
      var str = String.fromCharCode.apply(String, strBytes);
      listOfContexts.labels[iCtx] = str.split(":")[0];
      listOfContexts.contextsByteLength[iCtx] = view.getUint16(localOffset + strByteLength + 1, littleEndian);
      
      var typeMatch = regexTypeDetection.exec( str );
      if(typeMatch){
        listOfContexts.types[iCtx] = typeMatch[1].toLowerCase();
      }else{
        listOfContexts.types[iCtx] = null;
      }
      
      localOffset += strByteLength + 3;
    }
    
    // getting the values for the contexts
    for(var iCtx=0; iCtx<listOfContexts.total; iCtx++){
      var value = null;
      if( listOfContexts.types[iCtx] === "single" ){
        // single precision floats are on 4 bytes
        value = view.getFloat32(localOffset, littleEndian);
        
      }else if(listOfContexts.types[iCtx] === "boolean"){
        value = new Array(listOfContexts.contextsByteLength[iCtx]);
        for(var b=0; b<value.length; b++){
          value[b] = !!view.getUint8(localOffset + b);
        }
        
      }else if(listOfContexts.types[iCtx] === "string"){
        var strByteLength = view.getUint8(localOffset);
        var strBytes = new Uint8Array(inputBuffer, localOffset+1, strByteLength );
        value = String.fromCharCode.apply(String, strBytes);
      }
      
      localOffset += listOfContexts.contextsByteLength[iCtx];
      listOfContexts.values[ iCtx ] = value;
    }
    
    // ------------- CLEANING HEADER OF LIST -------------------
    
    for(var i=0; i<headerOfList.length; i++){
      delete headerOfList[i].total;
    }
    
    delete headerOfList[7].contextsByteLength;
    delete headerOfList[7].types;
    
    var modEeg = {
      metadata: {
        comment: header.comment,
        sizes: {
          measure: header.measureSize,
          duration: header.durationSize,
          firstSpace: header.firstSpaceSize,
          secondSpace: header.secondSpaceSize,
        },
        informationList: headerOfList
      },
      
      data: matrixData
    };
    
    return modEeg;
  }
  
  
} /* END of QeegModFileParser */

class EegModDecoder extends Filter {

  constructor() {
    super();
    this.addInputValidator(0, ArrayBuffer);
    this.setMetadata("debug", false);

    // a soon-to-be DataView to read the input buffer
    this._view = null;
  }

  _run(){
    var inputBuffer = this._getInput(0);

    if(!inputBuffer){
      console.warn("EegModDecoder requires an ArrayBuffer as input \"0\". Unable to continue.");
      return;
    }

    var modParser = new QeegModFileParser();
    modParser.setRawData( inputBuffer );
    var qeegData = modParser.parse();

    if( qeegData ){
      this._output[0] = qeegData;
    }

  }

} /* END of class EegModDecoder */

/*
* Author    Jonathan Lurie - http://me.jonahanlurie.fr
*
* License   MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

//import JSZip from "jszip";
/**
* A PixBinEncoder instance takes an Image2D or Image3D as input with `addInput(...)`
* and encode it so that it can be saved as a *.pixp file.
* An output filename can be specified using `.setMetadata("filename", "yourName.pixp");`,
* by default, the name is "untitled.pixp".
* When `update()` is called, a gzip blog is prepared as output[0] and can then be downloaded
* when calling the method `.download()`. The gzip blob could also be sent over AJAX
* using a third party library.
*
* **Usage**
* - [examples/savePixpFile.html](../examples/savePixpFile.html)
*/
class PixBinEncoder extends Filter {
  constructor(){
    super();
    this.setMetadata("filename", "untitled.pixb");
    this.setMetadata("extension", "pixb");

  }


  /**
  * [PRIVATE]
  * overwrite the original from Filter
  * Only accept Image2D and Image3D
  */
  hasValidInput(){
    var input = this._getInput();
    return input && ( input.isOfType(Image2D.TYPE()) || input.isOfType(Image3D.TYPE()) );
  }


  _run(){

    if(! this.hasValidInput() ){
      console.warn("PixBinEncoder can only encode Image2D and Image3D.");
      return;
    }

    var input = this._getInput();

    var pixBinMetadata = {
      dataType: input.getData().constructor.name, // typed array type
      pixpipeType: input.constructor.name, // most likely "Image2D", "Image3D", "MniVolume", "LineString", etc.
      metadata: input.getMetadataCopy(),  // Image2D/Image3D._metadata
    };

    // this is a typed array
    var data = input.getData();
    
    var metadataJsonString = JSON.stringify( pixBinMetadata );
    var metadataByteArray = new Uint8Array( metadataJsonString.length );
    
    // converting the json string into a byte stream
    for(var i = 0; i < metadataJsonString.length; ++i)
      metadataByteArray[i] = metadataJsonString.charCodeAt(i);

    // creating the buffer
    var metadataBuffer = new ArrayBuffer( 4 + metadataByteArray.length );

    // the data view is used to write into the buffer
    var view = new DataView( metadataBuffer );
    
    var offsetFromHere = 0;
    
    // write the size of the metadata string
    view.setUint32(offsetFromHere, metadataByteArray.length );
    
    // write the metadata themselves
    offsetFromHere += 4;
    for(var i=0; i<metadataByteArray.length; i++){
      view.setUint8(offsetFromHere, metadataByteArray[i] );
      offsetFromHere++;
    }

    // making a blob to be saved
    this._output[0] = new Blob([metadataBuffer, data], {type: 'application/octet-binary'} );
  }


  /**
  * Download the generated file
  */
  download(){
    var output = this.getOutput();

    if(output){
      FileSaver.saveAs( this.getOutput(), this.getMetadata("filename"));
    }else{
      console.warn("No output computed yet.");
    }
  }

} /* END of class PixBinEncoder */

/*
  Copyright (c) 2008, Adobe Systems Incorporated
  All rights reserved.

  Redistribution and use in source and binary forms, with or without 
  modification, are permitted provided that the following conditions are
  met:

  * Redistributions of source code must retain the above copyright notice, 
    this list of conditions and the following disclaimer.
  
  * Redistributions in binary form must reproduce the above copyright
    notice, this list of conditions and the following disclaimer in the 
    documentation and/or other materials provided with the distribution.
  
  * Neither the name of Adobe Systems Incorporated nor the names of its 
    contributors may be used to endorse or promote products derived from 
    this software without specific prior written permission.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
  IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
  THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
  PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR 
  CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
  EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
  PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
  SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
/*
JPEG encoder ported to JavaScript and optimized by Andreas Ritter, www.bytestrom.eu, 11/2009

Basic GUI blocking jpeg encoder
*/

var btoa = btoa || function(buf) {
  return new Buffer(buf).toString('base64');
};

function JPEGEncoder(quality) {
  var self = this;
	var fround = Math.round;
	var ffloor = Math.floor;
	var YTable = new Array(64);
	var UVTable = new Array(64);
	var fdtbl_Y = new Array(64);
	var fdtbl_UV = new Array(64);
	var YDC_HT;
	var UVDC_HT;
	var YAC_HT;
	var UVAC_HT;
	
	var bitcode = new Array(65535);
	var category = new Array(65535);
	var outputfDCTQuant = new Array(64);
	var DU = new Array(64);
	var byteout = [];
	var bytenew = 0;
	var bytepos = 7;
	
	var YDU = new Array(64);
	var UDU = new Array(64);
	var VDU = new Array(64);
	var clt = new Array(256);
	var RGB_YUV_TABLE = new Array(2048);
	var currentQuality;
	
	var ZigZag = [
			 0, 1, 5, 6,14,15,27,28,
			 2, 4, 7,13,16,26,29,42,
			 3, 8,12,17,25,30,41,43,
			 9,11,18,24,31,40,44,53,
			10,19,23,32,39,45,52,54,
			20,22,33,38,46,51,55,60,
			21,34,37,47,50,56,59,61,
			35,36,48,49,57,58,62,63
		];
	
	var std_dc_luminance_nrcodes = [0,0,1,5,1,1,1,1,1,1,0,0,0,0,0,0,0];
	var std_dc_luminance_values = [0,1,2,3,4,5,6,7,8,9,10,11];
	var std_ac_luminance_nrcodes = [0,0,2,1,3,3,2,4,3,5,5,4,4,0,0,1,0x7d];
	var std_ac_luminance_values = [
			0x01,0x02,0x03,0x00,0x04,0x11,0x05,0x12,
			0x21,0x31,0x41,0x06,0x13,0x51,0x61,0x07,
			0x22,0x71,0x14,0x32,0x81,0x91,0xa1,0x08,
			0x23,0x42,0xb1,0xc1,0x15,0x52,0xd1,0xf0,
			0x24,0x33,0x62,0x72,0x82,0x09,0x0a,0x16,
			0x17,0x18,0x19,0x1a,0x25,0x26,0x27,0x28,
			0x29,0x2a,0x34,0x35,0x36,0x37,0x38,0x39,
			0x3a,0x43,0x44,0x45,0x46,0x47,0x48,0x49,
			0x4a,0x53,0x54,0x55,0x56,0x57,0x58,0x59,
			0x5a,0x63,0x64,0x65,0x66,0x67,0x68,0x69,
			0x6a,0x73,0x74,0x75,0x76,0x77,0x78,0x79,
			0x7a,0x83,0x84,0x85,0x86,0x87,0x88,0x89,
			0x8a,0x92,0x93,0x94,0x95,0x96,0x97,0x98,
			0x99,0x9a,0xa2,0xa3,0xa4,0xa5,0xa6,0xa7,
			0xa8,0xa9,0xaa,0xb2,0xb3,0xb4,0xb5,0xb6,
			0xb7,0xb8,0xb9,0xba,0xc2,0xc3,0xc4,0xc5,
			0xc6,0xc7,0xc8,0xc9,0xca,0xd2,0xd3,0xd4,
			0xd5,0xd6,0xd7,0xd8,0xd9,0xda,0xe1,0xe2,
			0xe3,0xe4,0xe5,0xe6,0xe7,0xe8,0xe9,0xea,
			0xf1,0xf2,0xf3,0xf4,0xf5,0xf6,0xf7,0xf8,
			0xf9,0xfa
		];
	
	var std_dc_chrominance_nrcodes = [0,0,3,1,1,1,1,1,1,1,1,1,0,0,0,0,0];
	var std_dc_chrominance_values = [0,1,2,3,4,5,6,7,8,9,10,11];
	var std_ac_chrominance_nrcodes = [0,0,2,1,2,4,4,3,4,7,5,4,4,0,1,2,0x77];
	var std_ac_chrominance_values = [
			0x00,0x01,0x02,0x03,0x11,0x04,0x05,0x21,
			0x31,0x06,0x12,0x41,0x51,0x07,0x61,0x71,
			0x13,0x22,0x32,0x81,0x08,0x14,0x42,0x91,
			0xa1,0xb1,0xc1,0x09,0x23,0x33,0x52,0xf0,
			0x15,0x62,0x72,0xd1,0x0a,0x16,0x24,0x34,
			0xe1,0x25,0xf1,0x17,0x18,0x19,0x1a,0x26,
			0x27,0x28,0x29,0x2a,0x35,0x36,0x37,0x38,
			0x39,0x3a,0x43,0x44,0x45,0x46,0x47,0x48,
			0x49,0x4a,0x53,0x54,0x55,0x56,0x57,0x58,
			0x59,0x5a,0x63,0x64,0x65,0x66,0x67,0x68,
			0x69,0x6a,0x73,0x74,0x75,0x76,0x77,0x78,
			0x79,0x7a,0x82,0x83,0x84,0x85,0x86,0x87,
			0x88,0x89,0x8a,0x92,0x93,0x94,0x95,0x96,
			0x97,0x98,0x99,0x9a,0xa2,0xa3,0xa4,0xa5,
			0xa6,0xa7,0xa8,0xa9,0xaa,0xb2,0xb3,0xb4,
			0xb5,0xb6,0xb7,0xb8,0xb9,0xba,0xc2,0xc3,
			0xc4,0xc5,0xc6,0xc7,0xc8,0xc9,0xca,0xd2,
			0xd3,0xd4,0xd5,0xd6,0xd7,0xd8,0xd9,0xda,
			0xe2,0xe3,0xe4,0xe5,0xe6,0xe7,0xe8,0xe9,
			0xea,0xf2,0xf3,0xf4,0xf5,0xf6,0xf7,0xf8,
			0xf9,0xfa
		];
	
	function initQuantTables(sf){
			var YQT = [
				16, 11, 10, 16, 24, 40, 51, 61,
				12, 12, 14, 19, 26, 58, 60, 55,
				14, 13, 16, 24, 40, 57, 69, 56,
				14, 17, 22, 29, 51, 87, 80, 62,
				18, 22, 37, 56, 68,109,103, 77,
				24, 35, 55, 64, 81,104,113, 92,
				49, 64, 78, 87,103,121,120,101,
				72, 92, 95, 98,112,100,103, 99
			];
			
			for (var i = 0; i < 64; i++) {
				var t = ffloor((YQT[i]*sf+50)/100);
				if (t < 1) {
					t = 1;
				} else if (t > 255) {
					t = 255;
				}
				YTable[ZigZag[i]] = t;
			}
			var UVQT = [
				17, 18, 24, 47, 99, 99, 99, 99,
				18, 21, 26, 66, 99, 99, 99, 99,
				24, 26, 56, 99, 99, 99, 99, 99,
				47, 66, 99, 99, 99, 99, 99, 99,
				99, 99, 99, 99, 99, 99, 99, 99,
				99, 99, 99, 99, 99, 99, 99, 99,
				99, 99, 99, 99, 99, 99, 99, 99,
				99, 99, 99, 99, 99, 99, 99, 99
			];
			for (var j = 0; j < 64; j++) {
				var u = ffloor((UVQT[j]*sf+50)/100);
				if (u < 1) {
					u = 1;
				} else if (u > 255) {
					u = 255;
				}
				UVTable[ZigZag[j]] = u;
			}
			var aasf = [
				1.0, 1.387039845, 1.306562965, 1.175875602,
				1.0, 0.785694958, 0.541196100, 0.275899379
			];
			var k = 0;
			for (var row = 0; row < 8; row++)
			{
				for (var col = 0; col < 8; col++)
				{
					fdtbl_Y[k]  = (1.0 / (YTable [ZigZag[k]] * aasf[row] * aasf[col] * 8.0));
					fdtbl_UV[k] = (1.0 / (UVTable[ZigZag[k]] * aasf[row] * aasf[col] * 8.0));
					k++;
				}
			}
		}
		
		function computeHuffmanTbl(nrcodes, std_table){
			var codevalue = 0;
			var pos_in_table = 0;
			var HT = new Array();
			for (var k = 1; k <= 16; k++) {
				for (var j = 1; j <= nrcodes[k]; j++) {
					HT[std_table[pos_in_table]] = [];
					HT[std_table[pos_in_table]][0] = codevalue;
					HT[std_table[pos_in_table]][1] = k;
					pos_in_table++;
					codevalue++;
				}
				codevalue*=2;
			}
			return HT;
		}
		
		function initHuffmanTbl()
		{
			YDC_HT = computeHuffmanTbl(std_dc_luminance_nrcodes,std_dc_luminance_values);
			UVDC_HT = computeHuffmanTbl(std_dc_chrominance_nrcodes,std_dc_chrominance_values);
			YAC_HT = computeHuffmanTbl(std_ac_luminance_nrcodes,std_ac_luminance_values);
			UVAC_HT = computeHuffmanTbl(std_ac_chrominance_nrcodes,std_ac_chrominance_values);
		}
	
		function initCategoryNumber()
		{
			var nrlower = 1;
			var nrupper = 2;
			for (var cat = 1; cat <= 15; cat++) {
				//Positive numbers
				for (var nr = nrlower; nr<nrupper; nr++) {
					category[32767+nr] = cat;
					bitcode[32767+nr] = [];
					bitcode[32767+nr][1] = cat;
					bitcode[32767+nr][0] = nr;
				}
				//Negative numbers
				for (var nrneg =-(nrupper-1); nrneg<=-nrlower; nrneg++) {
					category[32767+nrneg] = cat;
					bitcode[32767+nrneg] = [];
					bitcode[32767+nrneg][1] = cat;
					bitcode[32767+nrneg][0] = nrupper-1+nrneg;
				}
				nrlower <<= 1;
				nrupper <<= 1;
			}
		}
		
		function initRGBYUVTable() {
			for(var i = 0; i < 256;i++) {
				RGB_YUV_TABLE[i]      		=  19595 * i;
				RGB_YUV_TABLE[(i+ 256)>>0] 	=  38470 * i;
				RGB_YUV_TABLE[(i+ 512)>>0] 	=   7471 * i + 0x8000;
				RGB_YUV_TABLE[(i+ 768)>>0] 	= -11059 * i;
				RGB_YUV_TABLE[(i+1024)>>0] 	= -21709 * i;
				RGB_YUV_TABLE[(i+1280)>>0] 	=  32768 * i + 0x807FFF;
				RGB_YUV_TABLE[(i+1536)>>0] 	= -27439 * i;
				RGB_YUV_TABLE[(i+1792)>>0] 	= - 5329 * i;
			}
		}
		
		// IO functions
		function writeBits(bs)
		{
			var value = bs[0];
			var posval = bs[1]-1;
			while ( posval >= 0 ) {
				if (value & (1 << posval) ) {
					bytenew |= (1 << bytepos);
				}
				posval--;
				bytepos--;
				if (bytepos < 0) {
					if (bytenew == 0xFF) {
						writeByte(0xFF);
						writeByte(0);
					}
					else {
						writeByte(bytenew);
					}
					bytepos=7;
					bytenew=0;
				}
			}
		}
	
		function writeByte(value)
		{
			//byteout.push(clt[value]); // write char directly instead of converting later
      byteout.push(value);
		}
	
		function writeWord(value)
		{
			writeByte((value>>8)&0xFF);
			writeByte((value   )&0xFF);
		}
		
		// DCT & quantization core
		function fDCTQuant(data, fdtbl)
		{
			var d0, d1, d2, d3, d4, d5, d6, d7;
			/* Pass 1: process rows. */
			var dataOff=0;
			var i;
			var I8 = 8;
			var I64 = 64;
			for (i=0; i<I8; ++i)
			{
				d0 = data[dataOff];
				d1 = data[dataOff+1];
				d2 = data[dataOff+2];
				d3 = data[dataOff+3];
				d4 = data[dataOff+4];
				d5 = data[dataOff+5];
				d6 = data[dataOff+6];
				d7 = data[dataOff+7];
				
				var tmp0 = d0 + d7;
				var tmp7 = d0 - d7;
				var tmp1 = d1 + d6;
				var tmp6 = d1 - d6;
				var tmp2 = d2 + d5;
				var tmp5 = d2 - d5;
				var tmp3 = d3 + d4;
				var tmp4 = d3 - d4;
	
				/* Even part */
				var tmp10 = tmp0 + tmp3;	/* phase 2 */
				var tmp13 = tmp0 - tmp3;
				var tmp11 = tmp1 + tmp2;
				var tmp12 = tmp1 - tmp2;
	
				data[dataOff] = tmp10 + tmp11; /* phase 3 */
				data[dataOff+4] = tmp10 - tmp11;
	
				var z1 = (tmp12 + tmp13) * 0.707106781; /* c4 */
				data[dataOff+2] = tmp13 + z1; /* phase 5 */
				data[dataOff+6] = tmp13 - z1;
	
				/* Odd part */
				tmp10 = tmp4 + tmp5; /* phase 2 */
				tmp11 = tmp5 + tmp6;
				tmp12 = tmp6 + tmp7;
	
				/* The rotator is modified from fig 4-8 to avoid extra negations. */
				var z5 = (tmp10 - tmp12) * 0.382683433; /* c6 */
				var z2 = 0.541196100 * tmp10 + z5; /* c2-c6 */
				var z4 = 1.306562965 * tmp12 + z5; /* c2+c6 */
				var z3 = tmp11 * 0.707106781; /* c4 */
	
				var z11 = tmp7 + z3;	/* phase 5 */
				var z13 = tmp7 - z3;
	
				data[dataOff+5] = z13 + z2;	/* phase 6 */
				data[dataOff+3] = z13 - z2;
				data[dataOff+1] = z11 + z4;
				data[dataOff+7] = z11 - z4;
	
				dataOff += 8; /* advance pointer to next row */
			}
	
			/* Pass 2: process columns. */
			dataOff = 0;
			for (i=0; i<I8; ++i)
			{
				d0 = data[dataOff];
				d1 = data[dataOff + 8];
				d2 = data[dataOff + 16];
				d3 = data[dataOff + 24];
				d4 = data[dataOff + 32];
				d5 = data[dataOff + 40];
				d6 = data[dataOff + 48];
				d7 = data[dataOff + 56];
				
				var tmp0p2 = d0 + d7;
				var tmp7p2 = d0 - d7;
				var tmp1p2 = d1 + d6;
				var tmp6p2 = d1 - d6;
				var tmp2p2 = d2 + d5;
				var tmp5p2 = d2 - d5;
				var tmp3p2 = d3 + d4;
				var tmp4p2 = d3 - d4;
	
				/* Even part */
				var tmp10p2 = tmp0p2 + tmp3p2;	/* phase 2 */
				var tmp13p2 = tmp0p2 - tmp3p2;
				var tmp11p2 = tmp1p2 + tmp2p2;
				var tmp12p2 = tmp1p2 - tmp2p2;
	
				data[dataOff] = tmp10p2 + tmp11p2; /* phase 3 */
				data[dataOff+32] = tmp10p2 - tmp11p2;
	
				var z1p2 = (tmp12p2 + tmp13p2) * 0.707106781; /* c4 */
				data[dataOff+16] = tmp13p2 + z1p2; /* phase 5 */
				data[dataOff+48] = tmp13p2 - z1p2;
	
				/* Odd part */
				tmp10p2 = tmp4p2 + tmp5p2; /* phase 2 */
				tmp11p2 = tmp5p2 + tmp6p2;
				tmp12p2 = tmp6p2 + tmp7p2;
	
				/* The rotator is modified from fig 4-8 to avoid extra negations. */
				var z5p2 = (tmp10p2 - tmp12p2) * 0.382683433; /* c6 */
				var z2p2 = 0.541196100 * tmp10p2 + z5p2; /* c2-c6 */
				var z4p2 = 1.306562965 * tmp12p2 + z5p2; /* c2+c6 */
				var z3p2 = tmp11p2 * 0.707106781; /* c4 */
	
				var z11p2 = tmp7p2 + z3p2;	/* phase 5 */
				var z13p2 = tmp7p2 - z3p2;
	
				data[dataOff+40] = z13p2 + z2p2; /* phase 6 */
				data[dataOff+24] = z13p2 - z2p2;
				data[dataOff+ 8] = z11p2 + z4p2;
				data[dataOff+56] = z11p2 - z4p2;
	
				dataOff++; /* advance pointer to next column */
			}
	
			// Quantize/descale the coefficients
			var fDCTQuant;
			for (i=0; i<I64; ++i)
			{
				// Apply the quantization and scaling factor & Round to nearest integer
				fDCTQuant = data[i]*fdtbl[i];
				outputfDCTQuant[i] = (fDCTQuant > 0.0) ? ((fDCTQuant + 0.5)|0) : ((fDCTQuant - 0.5)|0);
				//outputfDCTQuant[i] = fround(fDCTQuant);

			}
			return outputfDCTQuant;
		}
		
		function writeAPP0()
		{
			writeWord(0xFFE0); // marker
			writeWord(16); // length
			writeByte(0x4A); // J
			writeByte(0x46); // F
			writeByte(0x49); // I
			writeByte(0x46); // F
			writeByte(0); // = "JFIF",'\0'
			writeByte(1); // versionhi
			writeByte(1); // versionlo
			writeByte(0); // xyunits
			writeWord(1); // xdensity
			writeWord(1); // ydensity
			writeByte(0); // thumbnwidth
			writeByte(0); // thumbnheight
		}
	
		function writeSOF0(width, height)
		{
			writeWord(0xFFC0); // marker
			writeWord(17);   // length, truecolor YUV JPG
			writeByte(8);    // precision
			writeWord(height);
			writeWord(width);
			writeByte(3);    // nrofcomponents
			writeByte(1);    // IdY
			writeByte(0x11); // HVY
			writeByte(0);    // QTY
			writeByte(2);    // IdU
			writeByte(0x11); // HVU
			writeByte(1);    // QTU
			writeByte(3);    // IdV
			writeByte(0x11); // HVV
			writeByte(1);    // QTV
		}
	
		function writeDQT()
		{
			writeWord(0xFFDB); // marker
			writeWord(132);	   // length
			writeByte(0);
			for (var i=0; i<64; i++) {
				writeByte(YTable[i]);
			}
			writeByte(1);
			for (var j=0; j<64; j++) {
				writeByte(UVTable[j]);
			}
		}
	
		function writeDHT()
		{
			writeWord(0xFFC4); // marker
			writeWord(0x01A2); // length
	
			writeByte(0); // HTYDCinfo
			for (var i=0; i<16; i++) {
				writeByte(std_dc_luminance_nrcodes[i+1]);
			}
			for (var j=0; j<=11; j++) {
				writeByte(std_dc_luminance_values[j]);
			}
	
			writeByte(0x10); // HTYACinfo
			for (var k=0; k<16; k++) {
				writeByte(std_ac_luminance_nrcodes[k+1]);
			}
			for (var l=0; l<=161; l++) {
				writeByte(std_ac_luminance_values[l]);
			}
	
			writeByte(1); // HTUDCinfo
			for (var m=0; m<16; m++) {
				writeByte(std_dc_chrominance_nrcodes[m+1]);
			}
			for (var n=0; n<=11; n++) {
				writeByte(std_dc_chrominance_values[n]);
			}
	
			writeByte(0x11); // HTUACinfo
			for (var o=0; o<16; o++) {
				writeByte(std_ac_chrominance_nrcodes[o+1]);
			}
			for (var p=0; p<=161; p++) {
				writeByte(std_ac_chrominance_values[p]);
			}
		}
	
		function writeSOS()
		{
			writeWord(0xFFDA); // marker
			writeWord(12); // length
			writeByte(3); // nrofcomponents
			writeByte(1); // IdY
			writeByte(0); // HTY
			writeByte(2); // IdU
			writeByte(0x11); // HTU
			writeByte(3); // IdV
			writeByte(0x11); // HTV
			writeByte(0); // Ss
			writeByte(0x3f); // Se
			writeByte(0); // Bf
		}
		
		function processDU(CDU, fdtbl, DC, HTDC, HTAC){
			var EOB = HTAC[0x00];
			var M16zeroes = HTAC[0xF0];
			var pos;
			var I16 = 16;
			var I63 = 63;
			var I64 = 64;
			var DU_DCT = fDCTQuant(CDU, fdtbl);
			//ZigZag reorder
			for (var j=0;j<I64;++j) {
				DU[ZigZag[j]]=DU_DCT[j];
			}
			var Diff = DU[0] - DC; DC = DU[0];
			//Encode DC
			if (Diff==0) {
				writeBits(HTDC[0]); // Diff might be 0
			} else {
				pos = 32767+Diff;
				writeBits(HTDC[category[pos]]);
				writeBits(bitcode[pos]);
			}
			//Encode ACs
			var end0pos = 63; // was const... which is crazy
			for (; (end0pos>0)&&(DU[end0pos]==0); end0pos--) {}
			//end0pos = first element in reverse order !=0
			if ( end0pos == 0) {
				writeBits(EOB);
				return DC;
			}
			var i = 1;
			var lng;
			while ( i <= end0pos ) {
				var startpos = i;
				for (; (DU[i]==0) && (i<=end0pos); ++i) {}
				var nrzeroes = i-startpos;
				if ( nrzeroes >= I16 ) {
					lng = nrzeroes>>4;
					for (var nrmarker=1; nrmarker <= lng; ++nrmarker)
						writeBits(M16zeroes);
					nrzeroes = nrzeroes&0xF;
				}
				pos = 32767+DU[i];
				writeBits(HTAC[(nrzeroes<<4)+category[pos]]);
				writeBits(bitcode[pos]);
				i++;
			}
			if ( end0pos != I63 ) {
				writeBits(EOB);
			}
			return DC;
		}

		function initCharLookupTable(){
			var sfcc = String.fromCharCode;
			for(var i=0; i < 256; i++){ ///// ACHTUNG // 255
				clt[i] = sfcc(i);
			}
		}
		
		this.encode = function(image,quality) // image data object
		{
			var time_start = new Date().getTime();
			
			if(quality) setQuality(quality);
			
			// Initialize bit writer
			byteout = new Array();
			bytenew=0;
			bytepos=7;
	
			// Add JPEG headers
			writeWord(0xFFD8); // SOI
			writeAPP0();
			writeDQT();
			writeSOF0(image.width,image.height);
			writeDHT();
			writeSOS();

	
			// Encode 8x8 macroblocks
			var DCY=0;
			var DCU=0;
			var DCV=0;
			
			bytenew=0;
			bytepos=7;
			
			
			this.encode.displayName = "_encode_";

			var imageData = image.data;
			var width = image.width;
			var height = image.height;

			var quadWidth = width*4;
			var tripleWidth = width*3;
			
			var x, y = 0;
			var r, g, b;
			var start,p, col,row,pos;
			while(y < height){
				x = 0;
				while(x < quadWidth){
				start = quadWidth * y + x;
				p = start;
				col = -1;
				row = 0;
				
				for(pos=0; pos < 64; pos++){
					row = pos >> 3;// /8
					col = ( pos & 7 ) * 4; // %8
					p = start + ( row * quadWidth ) + col;		
					
					if(y+row >= height){ // padding bottom
						p-= (quadWidth*(y+1+row-height));
					}

					if(x+col >= quadWidth){ // padding right	
						p-= ((x+col) - quadWidth +4);
					}
					
					r = imageData[ p++ ];
					g = imageData[ p++ ];
					b = imageData[ p++ ];
					
					
					/* // calculate YUV values dynamically
					YDU[pos]=((( 0.29900)*r+( 0.58700)*g+( 0.11400)*b))-128; //-0x80
					UDU[pos]=(((-0.16874)*r+(-0.33126)*g+( 0.50000)*b));
					VDU[pos]=((( 0.50000)*r+(-0.41869)*g+(-0.08131)*b));
					*/
					
					// use lookup table (slightly faster)
					YDU[pos] = ((RGB_YUV_TABLE[r]             + RGB_YUV_TABLE[(g +  256)>>0] + RGB_YUV_TABLE[(b +  512)>>0]) >> 16)-128;
					UDU[pos] = ((RGB_YUV_TABLE[(r +  768)>>0] + RGB_YUV_TABLE[(g + 1024)>>0] + RGB_YUV_TABLE[(b + 1280)>>0]) >> 16)-128;
					VDU[pos] = ((RGB_YUV_TABLE[(r + 1280)>>0] + RGB_YUV_TABLE[(g + 1536)>>0] + RGB_YUV_TABLE[(b + 1792)>>0]) >> 16)-128;

				}
				
				DCY = processDU(YDU, fdtbl_Y, DCY, YDC_HT, YAC_HT);
				DCU = processDU(UDU, fdtbl_UV, DCU, UVDC_HT, UVAC_HT);
				DCV = processDU(VDU, fdtbl_UV, DCV, UVDC_HT, UVAC_HT);
				x+=32;
				}
				y+=8;
			}
			
			
			////////////////////////////////////////////////////////////////
	
			// Do the bit alignment of the EOI marker
			if ( bytepos >= 0 ) {
				var fillbits = [];
				fillbits[1] = bytepos+1;
				fillbits[0] = (1<<(bytepos+1))-1;
				writeBits(fillbits);
			}
	
			writeWord(0xFFD9); //EOI

      //return new Uint8Array(byteout);
      return new Buffer(byteout);

			var jpegDataUri = 'data:image/jpeg;base64,' + btoa(byteout.join(''));
			
			byteout = [];
			
			// benchmarking
			var duration = new Date().getTime() - time_start;
    		//console.log('Encoding time: '+ duration + 'ms');
    		//
			
			return jpegDataUri			
	};
	
	function setQuality(quality){
		if (quality <= 0) {
			quality = 1;
		}
		if (quality > 100) {
			quality = 100;
		}
		
		if(currentQuality == quality) return // don't recalc if unchanged
		
		var sf = 0;
		if (quality < 50) {
			sf = Math.floor(5000 / quality);
		} else {
			sf = Math.floor(200 - quality*2);
		}
		
		initQuantTables(sf);
		currentQuality = quality;
		//console.log('Quality set to: '+quality +'%');
	}
	
	function init(){
		var time_start = new Date().getTime();
		if(!quality) quality = 50;
		// Create tables
		initCharLookupTable();
		initHuffmanTbl();
		initCategoryNumber();
		initRGBYUVTable();
		
		setQuality(quality);
		var duration = new Date().getTime() - time_start;
    	//console.log('Initialization '+ duration + 'ms');
	}
	
	init();
	
}
var encoder = encode;

function encode(imgData, qu) {
  if (typeof qu === 'undefined') qu = 50;
  var encoder = new JPEGEncoder(qu);
	var data = encoder.encode(imgData, qu);
  return {
    data: data,
    width: imgData.width,
    height: imgData.height
  };
}

/* -*- tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/*
   Copyright 2011 notmasteryet

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

// - The JPEG specification can be found in the ITU CCITT Recommendation T.81
//   (www.w3.org/Graphics/JPEG/itu-t81.pdf)
// - The JFIF specification can be found in the JPEG File Interchange Format
//   (www.w3.org/Graphics/JPEG/jfif3.pdf)
// - The Adobe Application-Specific JPEG markers in the Supporting the DCT Filters
//   in PostScript Level 2, Technical Note #5116
//   (partners.adobe.com/public/developer/en/ps/sdk/5116.DCT_Filter.pdf)

var JpegImage = (function jpegImage() {
  "use strict";
  var dctZigZag = new Int32Array([
     0,
     1,  8,
    16,  9,  2,
     3, 10, 17, 24,
    32, 25, 18, 11, 4,
     5, 12, 19, 26, 33, 40,
    48, 41, 34, 27, 20, 13,  6,
     7, 14, 21, 28, 35, 42, 49, 56,
    57, 50, 43, 36, 29, 22, 15,
    23, 30, 37, 44, 51, 58,
    59, 52, 45, 38, 31,
    39, 46, 53, 60,
    61, 54, 47,
    55, 62,
    63
  ]);

  var dctCos1  =  4017;   // cos(pi/16)
  var dctSin1  =   799;   // sin(pi/16)
  var dctCos3  =  3406;   // cos(3*pi/16)
  var dctSin3  =  2276;   // sin(3*pi/16)
  var dctCos6  =  1567;   // cos(6*pi/16)
  var dctSin6  =  3784;   // sin(6*pi/16)
  var dctSqrt2 =  5793;   // sqrt(2)
  var dctSqrt1d2 = 2896;  // sqrt(2) / 2

  function constructor() {
  }

  function buildHuffmanTable(codeLengths, values) {
    var k = 0, code = [], i, j, length = 16;
    while (length > 0 && !codeLengths[length - 1])
      length--;
    code.push({children: [], index: 0});
    var p = code[0], q;
    for (i = 0; i < length; i++) {
      for (j = 0; j < codeLengths[i]; j++) {
        p = code.pop();
        p.children[p.index] = values[k];
        while (p.index > 0) {
          p = code.pop();
        }
        p.index++;
        code.push(p);
        while (code.length <= i) {
          code.push(q = {children: [], index: 0});
          p.children[p.index] = q.children;
          p = q;
        }
        k++;
      }
      if (i + 1 < length) {
        // p here points to last code
        code.push(q = {children: [], index: 0});
        p.children[p.index] = q.children;
        p = q;
      }
    }
    return code[0].children;
  }

  function decodeScan(data, offset,
                      frame, components, resetInterval,
                      spectralStart, spectralEnd,
                      successivePrev, successive) {
    var precision = frame.precision;
    var samplesPerLine = frame.samplesPerLine;
    var scanLines = frame.scanLines;
    var mcusPerLine = frame.mcusPerLine;
    var progressive = frame.progressive;
    var maxH = frame.maxH, maxV = frame.maxV;

    var startOffset = offset, bitsData = 0, bitsCount = 0;
    function readBit() {
      if (bitsCount > 0) {
        bitsCount--;
        return (bitsData >> bitsCount) & 1;
      }
      bitsData = data[offset++];
      if (bitsData == 0xFF) {
        var nextByte = data[offset++];
        if (nextByte) {
          throw new Error("unexpected marker: " + ((bitsData << 8) | nextByte).toString(16));
        }
        // unstuff 0
      }
      bitsCount = 7;
      return bitsData >>> 7;
    }
    function decodeHuffman(tree) {
      var node = tree, bit;
      while ((bit = readBit()) !== null) {
        node = node[bit];
        if (typeof node === 'number')
          return node;
        if (typeof node !== 'object')
          throw new Error("invalid huffman sequence");
      }
      return null;
    }
    function receive(length) {
      var n = 0;
      while (length > 0) {
        var bit = readBit();
        if (bit === null) return;
        n = (n << 1) | bit;
        length--;
      }
      return n;
    }
    function receiveAndExtend(length) {
      var n = receive(length);
      if (n >= 1 << (length - 1))
        return n;
      return n + (-1 << length) + 1;
    }
    function decodeBaseline(component, zz) {
      var t = decodeHuffman(component.huffmanTableDC);
      var diff = t === 0 ? 0 : receiveAndExtend(t);
      zz[0]= (component.pred += diff);
      var k = 1;
      while (k < 64) {
        var rs = decodeHuffman(component.huffmanTableAC);
        var s = rs & 15, r = rs >> 4;
        if (s === 0) {
          if (r < 15)
            break;
          k += 16;
          continue;
        }
        k += r;
        var z = dctZigZag[k];
        zz[z] = receiveAndExtend(s);
        k++;
      }
    }
    function decodeDCFirst(component, zz) {
      var t = decodeHuffman(component.huffmanTableDC);
      var diff = t === 0 ? 0 : (receiveAndExtend(t) << successive);
      zz[0] = (component.pred += diff);
    }
    function decodeDCSuccessive(component, zz) {
      zz[0] |= readBit() << successive;
    }
    var eobrun = 0;
    function decodeACFirst(component, zz) {
      if (eobrun > 0) {
        eobrun--;
        return;
      }
      var k = spectralStart, e = spectralEnd;
      while (k <= e) {
        var rs = decodeHuffman(component.huffmanTableAC);
        var s = rs & 15, r = rs >> 4;
        if (s === 0) {
          if (r < 15) {
            eobrun = receive(r) + (1 << r) - 1;
            break;
          }
          k += 16;
          continue;
        }
        k += r;
        var z = dctZigZag[k];
        zz[z] = receiveAndExtend(s) * (1 << successive);
        k++;
      }
    }
    var successiveACState = 0, successiveACNextValue;
    function decodeACSuccessive(component, zz) {
      var k = spectralStart, e = spectralEnd, r = 0;
      while (k <= e) {
        var z = dctZigZag[k];
        var direction = zz[z] < 0 ? -1 : 1;
        switch (successiveACState) {
        case 0: // initial state
          var rs = decodeHuffman(component.huffmanTableAC);
          var s = rs & 15, r = rs >> 4;
          if (s === 0) {
            if (r < 15) {
              eobrun = receive(r) + (1 << r);
              successiveACState = 4;
            } else {
              r = 16;
              successiveACState = 1;
            }
          } else {
            if (s !== 1)
              throw new Error("invalid ACn encoding");
            successiveACNextValue = receiveAndExtend(s);
            successiveACState = r ? 2 : 3;
          }
          continue;
        case 1: // skipping r zero items
        case 2:
          if (zz[z])
            zz[z] += (readBit() << successive) * direction;
          else {
            r--;
            if (r === 0)
              successiveACState = successiveACState == 2 ? 3 : 0;
          }
          break;
        case 3: // set value for a zero item
          if (zz[z])
            zz[z] += (readBit() << successive) * direction;
          else {
            zz[z] = successiveACNextValue << successive;
            successiveACState = 0;
          }
          break;
        case 4: // eob
          if (zz[z])
            zz[z] += (readBit() << successive) * direction;
          break;
        }
        k++;
      }
      if (successiveACState === 4) {
        eobrun--;
        if (eobrun === 0)
          successiveACState = 0;
      }
    }
    function decodeMcu(component, decode, mcu, row, col) {
      var mcuRow = (mcu / mcusPerLine) | 0;
      var mcuCol = mcu % mcusPerLine;
      var blockRow = mcuRow * component.v + row;
      var blockCol = mcuCol * component.h + col;
      decode(component, component.blocks[blockRow][blockCol]);
    }
    function decodeBlock(component, decode, mcu) {
      var blockRow = (mcu / component.blocksPerLine) | 0;
      var blockCol = mcu % component.blocksPerLine;
      decode(component, component.blocks[blockRow][blockCol]);
    }

    var componentsLength = components.length;
    var component, i, j, k, n;
    var decodeFn;
    if (progressive) {
      if (spectralStart === 0)
        decodeFn = successivePrev === 0 ? decodeDCFirst : decodeDCSuccessive;
      else
        decodeFn = successivePrev === 0 ? decodeACFirst : decodeACSuccessive;
    } else {
      decodeFn = decodeBaseline;
    }

    var mcu = 0, marker;
    var mcuExpected;
    if (componentsLength == 1) {
      mcuExpected = components[0].blocksPerLine * components[0].blocksPerColumn;
    } else {
      mcuExpected = mcusPerLine * frame.mcusPerColumn;
    }
    if (!resetInterval) resetInterval = mcuExpected;

    var h, v;
    while (mcu < mcuExpected) {
      // reset interval stuff
      for (i = 0; i < componentsLength; i++)
        components[i].pred = 0;
      eobrun = 0;

      if (componentsLength == 1) {
        component = components[0];
        for (n = 0; n < resetInterval; n++) {
          decodeBlock(component, decodeFn, mcu);
          mcu++;
        }
      } else {
        for (n = 0; n < resetInterval; n++) {
          for (i = 0; i < componentsLength; i++) {
            component = components[i];
            h = component.h;
            v = component.v;
            for (j = 0; j < v; j++) {
              for (k = 0; k < h; k++) {
                decodeMcu(component, decodeFn, mcu, j, k);
              }
            }
          }
          mcu++;

          // If we've reached our expected MCU's, stop decoding
          if (mcu === mcuExpected) break;
        }
      }

      // find marker
      bitsCount = 0;
      marker = (data[offset] << 8) | data[offset + 1];
      if (marker < 0xFF00) {
        throw new Error("marker was not found");
      }

      if (marker >= 0xFFD0 && marker <= 0xFFD7) { // RSTx
        offset += 2;
      }
      else
        break;
    }

    return offset - startOffset;
  }

  function buildComponentData(frame, component) {
    var lines = [];
    var blocksPerLine = component.blocksPerLine;
    var blocksPerColumn = component.blocksPerColumn;
    var samplesPerLine = blocksPerLine << 3;
    var R = new Int32Array(64), r = new Uint8Array(64);

    // A port of poppler's IDCT method which in turn is taken from:
    //   Christoph Loeffler, Adriaan Ligtenberg, George S. Moschytz,
    //   "Practical Fast 1-D DCT Algorithms with 11 Multiplications",
    //   IEEE Intl. Conf. on Acoustics, Speech & Signal Processing, 1989,
    //   988-991.
    function quantizeAndInverse(zz, dataOut, dataIn) {
      var qt = component.quantizationTable;
      var v0, v1, v2, v3, v4, v5, v6, v7, t;
      var p = dataIn;
      var i;

      // dequant
      for (i = 0; i < 64; i++)
        p[i] = zz[i] * qt[i];

      // inverse DCT on rows
      for (i = 0; i < 8; ++i) {
        var row = 8 * i;

        // check for all-zero AC coefficients
        if (p[1 + row] == 0 && p[2 + row] == 0 && p[3 + row] == 0 &&
            p[4 + row] == 0 && p[5 + row] == 0 && p[6 + row] == 0 &&
            p[7 + row] == 0) {
          t = (dctSqrt2 * p[0 + row] + 512) >> 10;
          p[0 + row] = t;
          p[1 + row] = t;
          p[2 + row] = t;
          p[3 + row] = t;
          p[4 + row] = t;
          p[5 + row] = t;
          p[6 + row] = t;
          p[7 + row] = t;
          continue;
        }

        // stage 4
        v0 = (dctSqrt2 * p[0 + row] + 128) >> 8;
        v1 = (dctSqrt2 * p[4 + row] + 128) >> 8;
        v2 = p[2 + row];
        v3 = p[6 + row];
        v4 = (dctSqrt1d2 * (p[1 + row] - p[7 + row]) + 128) >> 8;
        v7 = (dctSqrt1d2 * (p[1 + row] + p[7 + row]) + 128) >> 8;
        v5 = p[3 + row] << 4;
        v6 = p[5 + row] << 4;

        // stage 3
        t = (v0 - v1+ 1) >> 1;
        v0 = (v0 + v1 + 1) >> 1;
        v1 = t;
        t = (v2 * dctSin6 + v3 * dctCos6 + 128) >> 8;
        v2 = (v2 * dctCos6 - v3 * dctSin6 + 128) >> 8;
        v3 = t;
        t = (v4 - v6 + 1) >> 1;
        v4 = (v4 + v6 + 1) >> 1;
        v6 = t;
        t = (v7 + v5 + 1) >> 1;
        v5 = (v7 - v5 + 1) >> 1;
        v7 = t;

        // stage 2
        t = (v0 - v3 + 1) >> 1;
        v0 = (v0 + v3 + 1) >> 1;
        v3 = t;
        t = (v1 - v2 + 1) >> 1;
        v1 = (v1 + v2 + 1) >> 1;
        v2 = t;
        t = (v4 * dctSin3 + v7 * dctCos3 + 2048) >> 12;
        v4 = (v4 * dctCos3 - v7 * dctSin3 + 2048) >> 12;
        v7 = t;
        t = (v5 * dctSin1 + v6 * dctCos1 + 2048) >> 12;
        v5 = (v5 * dctCos1 - v6 * dctSin1 + 2048) >> 12;
        v6 = t;

        // stage 1
        p[0 + row] = v0 + v7;
        p[7 + row] = v0 - v7;
        p[1 + row] = v1 + v6;
        p[6 + row] = v1 - v6;
        p[2 + row] = v2 + v5;
        p[5 + row] = v2 - v5;
        p[3 + row] = v3 + v4;
        p[4 + row] = v3 - v4;
      }

      // inverse DCT on columns
      for (i = 0; i < 8; ++i) {
        var col = i;

        // check for all-zero AC coefficients
        if (p[1*8 + col] == 0 && p[2*8 + col] == 0 && p[3*8 + col] == 0 &&
            p[4*8 + col] == 0 && p[5*8 + col] == 0 && p[6*8 + col] == 0 &&
            p[7*8 + col] == 0) {
          t = (dctSqrt2 * dataIn[i+0] + 8192) >> 14;
          p[0*8 + col] = t;
          p[1*8 + col] = t;
          p[2*8 + col] = t;
          p[3*8 + col] = t;
          p[4*8 + col] = t;
          p[5*8 + col] = t;
          p[6*8 + col] = t;
          p[7*8 + col] = t;
          continue;
        }

        // stage 4
        v0 = (dctSqrt2 * p[0*8 + col] + 2048) >> 12;
        v1 = (dctSqrt2 * p[4*8 + col] + 2048) >> 12;
        v2 = p[2*8 + col];
        v3 = p[6*8 + col];
        v4 = (dctSqrt1d2 * (p[1*8 + col] - p[7*8 + col]) + 2048) >> 12;
        v7 = (dctSqrt1d2 * (p[1*8 + col] + p[7*8 + col]) + 2048) >> 12;
        v5 = p[3*8 + col];
        v6 = p[5*8 + col];

        // stage 3
        t = (v0 - v1 + 1) >> 1;
        v0 = (v0 + v1 + 1) >> 1;
        v1 = t;
        t = (v2 * dctSin6 + v3 * dctCos6 + 2048) >> 12;
        v2 = (v2 * dctCos6 - v3 * dctSin6 + 2048) >> 12;
        v3 = t;
        t = (v4 - v6 + 1) >> 1;
        v4 = (v4 + v6 + 1) >> 1;
        v6 = t;
        t = (v7 + v5 + 1) >> 1;
        v5 = (v7 - v5 + 1) >> 1;
        v7 = t;

        // stage 2
        t = (v0 - v3 + 1) >> 1;
        v0 = (v0 + v3 + 1) >> 1;
        v3 = t;
        t = (v1 - v2 + 1) >> 1;
        v1 = (v1 + v2 + 1) >> 1;
        v2 = t;
        t = (v4 * dctSin3 + v7 * dctCos3 + 2048) >> 12;
        v4 = (v4 * dctCos3 - v7 * dctSin3 + 2048) >> 12;
        v7 = t;
        t = (v5 * dctSin1 + v6 * dctCos1 + 2048) >> 12;
        v5 = (v5 * dctCos1 - v6 * dctSin1 + 2048) >> 12;
        v6 = t;

        // stage 1
        p[0*8 + col] = v0 + v7;
        p[7*8 + col] = v0 - v7;
        p[1*8 + col] = v1 + v6;
        p[6*8 + col] = v1 - v6;
        p[2*8 + col] = v2 + v5;
        p[5*8 + col] = v2 - v5;
        p[3*8 + col] = v3 + v4;
        p[4*8 + col] = v3 - v4;
      }

      // convert to 8-bit integers
      for (i = 0; i < 64; ++i) {
        var sample = 128 + ((p[i] + 8) >> 4);
        dataOut[i] = sample < 0 ? 0 : sample > 0xFF ? 0xFF : sample;
      }
    }

    var i, j;
    for (var blockRow = 0; blockRow < blocksPerColumn; blockRow++) {
      var scanLine = blockRow << 3;
      for (i = 0; i < 8; i++)
        lines.push(new Uint8Array(samplesPerLine));
      for (var blockCol = 0; blockCol < blocksPerLine; blockCol++) {
        quantizeAndInverse(component.blocks[blockRow][blockCol], r, R);

        var offset = 0, sample = blockCol << 3;
        for (j = 0; j < 8; j++) {
          var line = lines[scanLine + j];
          for (i = 0; i < 8; i++)
            line[sample + i] = r[offset++];
        }
      }
    }
    return lines;
  }

  function clampTo8bit(a) {
    return a < 0 ? 0 : a > 255 ? 255 : a;
  }

  constructor.prototype = {
    load: function load(path) {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", path, true);
      xhr.responseType = "arraybuffer";
      xhr.onload = (function() {
        // TODO catch parse error
        var data = new Uint8Array(xhr.response || xhr.mozResponseArrayBuffer);
        this.parse(data);
        if (this.onload)
          this.onload();
      }).bind(this);
      xhr.send(null);
    },
    parse: function parse(data) {
      var offset = 0, length = data.length;
      function readUint16() {
        var value = (data[offset] << 8) | data[offset + 1];
        offset += 2;
        return value;
      }
      function readDataBlock() {
        var length = readUint16();
        var array = data.subarray(offset, offset + length - 2);
        offset += array.length;
        return array;
      }
      function prepareComponents(frame) {
        var maxH = 0, maxV = 0;
        var component, componentId;
        for (componentId in frame.components) {
          if (frame.components.hasOwnProperty(componentId)) {
            component = frame.components[componentId];
            if (maxH < component.h) maxH = component.h;
            if (maxV < component.v) maxV = component.v;
          }
        }
        var mcusPerLine = Math.ceil(frame.samplesPerLine / 8 / maxH);
        var mcusPerColumn = Math.ceil(frame.scanLines / 8 / maxV);
        for (componentId in frame.components) {
          if (frame.components.hasOwnProperty(componentId)) {
            component = frame.components[componentId];
            var blocksPerLine = Math.ceil(Math.ceil(frame.samplesPerLine / 8) * component.h / maxH);
            var blocksPerColumn = Math.ceil(Math.ceil(frame.scanLines  / 8) * component.v / maxV);
            var blocksPerLineForMcu = mcusPerLine * component.h;
            var blocksPerColumnForMcu = mcusPerColumn * component.v;
            var blocks = [];
            for (var i = 0; i < blocksPerColumnForMcu; i++) {
              var row = [];
              for (var j = 0; j < blocksPerLineForMcu; j++)
                row.push(new Int32Array(64));
              blocks.push(row);
            }
            component.blocksPerLine = blocksPerLine;
            component.blocksPerColumn = blocksPerColumn;
            component.blocks = blocks;
          }
        }
        frame.maxH = maxH;
        frame.maxV = maxV;
        frame.mcusPerLine = mcusPerLine;
        frame.mcusPerColumn = mcusPerColumn;
      }
      var jfif = null;
      var adobe = null;
      var pixels = null;
      var frame, resetInterval;
      var quantizationTables = [], frames = [];
      var huffmanTablesAC = [], huffmanTablesDC = [];
      var fileMarker = readUint16();
      if (fileMarker != 0xFFD8) { // SOI (Start of Image)
        throw new Error("SOI not found");
      }

      fileMarker = readUint16();
      while (fileMarker != 0xFFD9) { // EOI (End of image)
        var i, j, l;
        switch(fileMarker) {
          case 0xFF00: break;
          case 0xFFE0: // APP0 (Application Specific)
          case 0xFFE1: // APP1
          case 0xFFE2: // APP2
          case 0xFFE3: // APP3
          case 0xFFE4: // APP4
          case 0xFFE5: // APP5
          case 0xFFE6: // APP6
          case 0xFFE7: // APP7
          case 0xFFE8: // APP8
          case 0xFFE9: // APP9
          case 0xFFEA: // APP10
          case 0xFFEB: // APP11
          case 0xFFEC: // APP12
          case 0xFFED: // APP13
          case 0xFFEE: // APP14
          case 0xFFEF: // APP15
          case 0xFFFE: // COM (Comment)
            var appData = readDataBlock();

            if (fileMarker === 0xFFE0) {
              if (appData[0] === 0x4A && appData[1] === 0x46 && appData[2] === 0x49 &&
                appData[3] === 0x46 && appData[4] === 0) { // 'JFIF\x00'
                jfif = {
                  version: { major: appData[5], minor: appData[6] },
                  densityUnits: appData[7],
                  xDensity: (appData[8] << 8) | appData[9],
                  yDensity: (appData[10] << 8) | appData[11],
                  thumbWidth: appData[12],
                  thumbHeight: appData[13],
                  thumbData: appData.subarray(14, 14 + 3 * appData[12] * appData[13])
                };
              }
            }
            // TODO APP1 - Exif
            if (fileMarker === 0xFFEE) {
              if (appData[0] === 0x41 && appData[1] === 0x64 && appData[2] === 0x6F &&
                appData[3] === 0x62 && appData[4] === 0x65 && appData[5] === 0) { // 'Adobe\x00'
                adobe = {
                  version: appData[6],
                  flags0: (appData[7] << 8) | appData[8],
                  flags1: (appData[9] << 8) | appData[10],
                  transformCode: appData[11]
                };
              }
            }
            break;

          case 0xFFDB: // DQT (Define Quantization Tables)
            var quantizationTablesLength = readUint16();
            var quantizationTablesEnd = quantizationTablesLength + offset - 2;
            while (offset < quantizationTablesEnd) {
              var quantizationTableSpec = data[offset++];
              var tableData = new Int32Array(64);
              if ((quantizationTableSpec >> 4) === 0) { // 8 bit values
                for (j = 0; j < 64; j++) {
                  var z = dctZigZag[j];
                  tableData[z] = data[offset++];
                }
              } else if ((quantizationTableSpec >> 4) === 1) { //16 bit
                for (j = 0; j < 64; j++) {
                  var z = dctZigZag[j];
                  tableData[z] = readUint16();
                }
              } else
                throw new Error("DQT: invalid table spec");
              quantizationTables[quantizationTableSpec & 15] = tableData;
            }
            break;

          case 0xFFC0: // SOF0 (Start of Frame, Baseline DCT)
          case 0xFFC1: // SOF1 (Start of Frame, Extended DCT)
          case 0xFFC2: // SOF2 (Start of Frame, Progressive DCT)
            readUint16(); // skip data length
            frame = {};
            frame.extended = (fileMarker === 0xFFC1);
            frame.progressive = (fileMarker === 0xFFC2);
            frame.precision = data[offset++];
            frame.scanLines = readUint16();
            frame.samplesPerLine = readUint16();
            frame.components = {};
            frame.componentsOrder = [];
            var componentsCount = data[offset++], componentId;
            var maxH = 0, maxV = 0;
            for (i = 0; i < componentsCount; i++) {
              componentId = data[offset];
              var h = data[offset + 1] >> 4;
              var v = data[offset + 1] & 15;
              var qId = data[offset + 2];
              frame.componentsOrder.push(componentId);
              frame.components[componentId] = {
                h: h,
                v: v,
                quantizationIdx: qId
              };
              offset += 3;
            }
            prepareComponents(frame);
            frames.push(frame);
            break;

          case 0xFFC4: // DHT (Define Huffman Tables)
            var huffmanLength = readUint16();
            for (i = 2; i < huffmanLength;) {
              var huffmanTableSpec = data[offset++];
              var codeLengths = new Uint8Array(16);
              var codeLengthSum = 0;
              for (j = 0; j < 16; j++, offset++)
                codeLengthSum += (codeLengths[j] = data[offset]);
              var huffmanValues = new Uint8Array(codeLengthSum);
              for (j = 0; j < codeLengthSum; j++, offset++)
                huffmanValues[j] = data[offset];
              i += 17 + codeLengthSum;

              ((huffmanTableSpec >> 4) === 0 ?
                huffmanTablesDC : huffmanTablesAC)[huffmanTableSpec & 15] =
                buildHuffmanTable(codeLengths, huffmanValues);
            }
            break;

          case 0xFFDD: // DRI (Define Restart Interval)
            readUint16(); // skip data length
            resetInterval = readUint16();
            break;

          case 0xFFDA: // SOS (Start of Scan)
            var scanLength = readUint16();
            var selectorsCount = data[offset++];
            var components = [], component;
            for (i = 0; i < selectorsCount; i++) {
              component = frame.components[data[offset++]];
              var tableSpec = data[offset++];
              component.huffmanTableDC = huffmanTablesDC[tableSpec >> 4];
              component.huffmanTableAC = huffmanTablesAC[tableSpec & 15];
              components.push(component);
            }
            var spectralStart = data[offset++];
            var spectralEnd = data[offset++];
            var successiveApproximation = data[offset++];
            var processed = decodeScan(data, offset,
              frame, components, resetInterval,
              spectralStart, spectralEnd,
              successiveApproximation >> 4, successiveApproximation & 15);
            offset += processed;
            break;
          default:
            if (data[offset - 3] == 0xFF &&
                data[offset - 2] >= 0xC0 && data[offset - 2] <= 0xFE) {
              // could be incorrect encoding -- last 0xFF byte of the previous
              // block was eaten by the encoder
              offset -= 3;
              break;
            }
            throw new Error("unknown JPEG marker " + fileMarker.toString(16));
        }
        fileMarker = readUint16();
      }
      if (frames.length != 1)
        throw new Error("only single frame JPEGs supported");

      // set each frame's components quantization table
      for (var i = 0; i < frames.length; i++) {
        var cp = frames[i].components;
        for (var j in cp) {
          cp[j].quantizationTable = quantizationTables[cp[j].quantizationIdx];
          delete cp[j].quantizationIdx;
        }
      }

      this.width = frame.samplesPerLine;
      this.height = frame.scanLines;
      this.jfif = jfif;
      this.adobe = adobe;
      this.components = [];
      for (var i = 0; i < frame.componentsOrder.length; i++) {
        var component = frame.components[frame.componentsOrder[i]];
        this.components.push({
          lines: buildComponentData(frame, component),
          scaleX: component.h / frame.maxH,
          scaleY: component.v / frame.maxV
        });
      }
    },
    getData: function getData(width, height) {
      var scaleX = this.width / width, scaleY = this.height / height;

      var component1, component2, component3, component4;
      var component1Line, component2Line, component3Line, component4Line;
      var x, y;
      var offset = 0;
      var Y, Cb, Cr, K, C, M, Ye, R, G, B;
      var colorTransform;
      var dataLength = width * height * this.components.length;
      var data = new Uint8Array(dataLength);
      switch (this.components.length) {
        case 1:
          component1 = this.components[0];
          for (y = 0; y < height; y++) {
            component1Line = component1.lines[0 | (y * component1.scaleY * scaleY)];
            for (x = 0; x < width; x++) {
              Y = component1Line[0 | (x * component1.scaleX * scaleX)];

              data[offset++] = Y;
            }
          }
          break;
        case 2:
          // PDF might compress two component data in custom colorspace
          component1 = this.components[0];
          component2 = this.components[1];
          for (y = 0; y < height; y++) {
            component1Line = component1.lines[0 | (y * component1.scaleY * scaleY)];
            component2Line = component2.lines[0 | (y * component2.scaleY * scaleY)];
            for (x = 0; x < width; x++) {
              Y = component1Line[0 | (x * component1.scaleX * scaleX)];
              data[offset++] = Y;
              Y = component2Line[0 | (x * component2.scaleX * scaleX)];
              data[offset++] = Y;
            }
          }
          break;
        case 3:
          // The default transform for three components is true
          colorTransform = true;
          // The adobe transform marker overrides any previous setting
          if (this.adobe && this.adobe.transformCode)
            colorTransform = true;
          else if (typeof this.colorTransform !== 'undefined')
            colorTransform = !!this.colorTransform;

          component1 = this.components[0];
          component2 = this.components[1];
          component3 = this.components[2];
          for (y = 0; y < height; y++) {
            component1Line = component1.lines[0 | (y * component1.scaleY * scaleY)];
            component2Line = component2.lines[0 | (y * component2.scaleY * scaleY)];
            component3Line = component3.lines[0 | (y * component3.scaleY * scaleY)];
            for (x = 0; x < width; x++) {
              if (!colorTransform) {
                R = component1Line[0 | (x * component1.scaleX * scaleX)];
                G = component2Line[0 | (x * component2.scaleX * scaleX)];
                B = component3Line[0 | (x * component3.scaleX * scaleX)];
              } else {
                Y = component1Line[0 | (x * component1.scaleX * scaleX)];
                Cb = component2Line[0 | (x * component2.scaleX * scaleX)];
                Cr = component3Line[0 | (x * component3.scaleX * scaleX)];

                R = clampTo8bit(Y + 1.402 * (Cr - 128));
                G = clampTo8bit(Y - 0.3441363 * (Cb - 128) - 0.71413636 * (Cr - 128));
                B = clampTo8bit(Y + 1.772 * (Cb - 128));
              }

              data[offset++] = R;
              data[offset++] = G;
              data[offset++] = B;
            }
          }
          break;
        case 4:
          if (!this.adobe)
            throw 'Unsupported color mode (4 components)';
          // The default transform for four components is false
          colorTransform = false;
          // The adobe transform marker overrides any previous setting
          if (this.adobe && this.adobe.transformCode)
            colorTransform = true;
          else if (typeof this.colorTransform !== 'undefined')
            colorTransform = !!this.colorTransform;

          component1 = this.components[0];
          component2 = this.components[1];
          component3 = this.components[2];
          component4 = this.components[3];
          for (y = 0; y < height; y++) {
            component1Line = component1.lines[0 | (y * component1.scaleY * scaleY)];
            component2Line = component2.lines[0 | (y * component2.scaleY * scaleY)];
            component3Line = component3.lines[0 | (y * component3.scaleY * scaleY)];
            component4Line = component4.lines[0 | (y * component4.scaleY * scaleY)];
            for (x = 0; x < width; x++) {
              if (!colorTransform) {
                C = component1Line[0 | (x * component1.scaleX * scaleX)];
                M = component2Line[0 | (x * component2.scaleX * scaleX)];
                Ye = component3Line[0 | (x * component3.scaleX * scaleX)];
                K = component4Line[0 | (x * component4.scaleX * scaleX)];
              } else {
                Y = component1Line[0 | (x * component1.scaleX * scaleX)];
                Cb = component2Line[0 | (x * component2.scaleX * scaleX)];
                Cr = component3Line[0 | (x * component3.scaleX * scaleX)];
                K = component4Line[0 | (x * component4.scaleX * scaleX)];

                C = 255 - clampTo8bit(Y + 1.402 * (Cr - 128));
                M = 255 - clampTo8bit(Y - 0.3441363 * (Cb - 128) - 0.71413636 * (Cr - 128));
                Ye = 255 - clampTo8bit(Y + 1.772 * (Cb - 128));
              }
              data[offset++] = 255-C;
              data[offset++] = 255-M;
              data[offset++] = 255-Ye;
              data[offset++] = 255-K;
            }
          }
          break;
        default:
          throw 'Unsupported color mode';
      }
      return data;
    },
    copyToImageData: function copyToImageData(imageData) {
      var width = imageData.width, height = imageData.height;
      var imageDataArray = imageData.data;
      var data = this.getData(width, height);
      var i = 0, j = 0, x, y;
      var Y, K, C, M, R, G, B;
      switch (this.components.length) {
        case 1:
          for (y = 0; y < height; y++) {
            for (x = 0; x < width; x++) {
              Y = data[i++];

              imageDataArray[j++] = Y;
              imageDataArray[j++] = Y;
              imageDataArray[j++] = Y;
              imageDataArray[j++] = 255;
            }
          }
          break;
        case 3:
          for (y = 0; y < height; y++) {
            for (x = 0; x < width; x++) {
              R = data[i++];
              G = data[i++];
              B = data[i++];

              imageDataArray[j++] = R;
              imageDataArray[j++] = G;
              imageDataArray[j++] = B;
              imageDataArray[j++] = 255;
            }
          }
          break;
        case 4:
          for (y = 0; y < height; y++) {
            for (x = 0; x < width; x++) {
              C = data[i++];
              M = data[i++];
              Y = data[i++];
              K = data[i++];

              R = 255 - clampTo8bit(C * (1 - K / 255) + K);
              G = 255 - clampTo8bit(M * (1 - K / 255) + K);
              B = 255 - clampTo8bit(Y * (1 - K / 255) + K);

              imageDataArray[j++] = R;
              imageDataArray[j++] = G;
              imageDataArray[j++] = B;
              imageDataArray[j++] = 255;
            }
          }
          break;
        default:
          throw 'Unsupported color mode';
      }
    }
  };

  return constructor;
})();
var decoder = decode;

function decode(jpegData, useTArray) {
  var arr = new Uint8Array(jpegData);
  var decoder = new JpegImage();
  decoder.parse(arr);

  var image = {
    width: decoder.width,
    height: decoder.height,
    data: useTArray ?
      new Uint8Array(decoder.width * decoder.height * 4) :
      new Buffer(decoder.width * decoder.height * 4)
  };

  decoder.copyToImageData(image);

  return image;
}

var index$2 = {
  encode: encoder,
  decode: decoder
};

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link     https://github.com/jonathanlurie/pixpipejs
* Lab      MCIN - Montreal Neurological Institute
*/

/**
* An instance of JpegDecoder will decode a JPEG image in native Javascript and
* output an Image2D. This is of course slower than using `io/FileImageReader.js`
* but this is compatible with Node and not rely on HTML5 Canvas.
*
* **Usage**
* - [examples/fileToJpeg.html](../examples/fileToJpeg.html)
*/
class JpegDecoder extends Filter {
  constructor() {
    super();
    this.addInputValidator(0, ArrayBuffer);
  }
  
  _run(){

    var inputBuffer = this._getInput(0);

    if(!inputBuffer){
      console.warn("JpegDecoder requires an ArrayBuffer as input \"0\". Unable to continue.");
      return;
    }
  
    try{
      var jpegData = index$2.decode( inputBuffer );
      var ncpp = jpegData.data.length / (jpegData.width*jpegData.height);
      var outputImage = new Image2D();
      var pixelData = new Uint8Array( jpegData.data.buffer );
      
      outputImage.setData( pixelData, jpegData.width, jpegData.height, ncpp);
      this._output[ 0 ] = outputImage;
    }catch(e){
      //console.warn(e);
      //console.warn("This is not a JPEG file, unable to decode this file.");
    }
  }
} /* JpegDecoder */

var UPNG = createCommonjsModule(function (module) {
(function(){
var UPNG = {};

// Make available for import by `require()`
{module.exports = UPNG;}

var pako;
if (typeof commonjsRequire == "function") {pako = index$1;}
else {pako = window.pako;}

function log() { if (typeof process=="undefined" || process.env.NODE_ENV=="development") console.log.apply(console, arguments);  }

(function(UPNG, pako){

UPNG.toRGBA8 = function(out)
{
	//console.log(out.ctype, out.depth);
	var w = out.width, h = out.height, area = w*h, bpp = UPNG.decode._getBPP(out);
	var bpl = Math.ceil(w*bpp/8);	// bytes per line

	var bf = new Uint8Array(area*4), bf32 = new Uint32Array(bf.buffer);
	var data = out.data, ctype = out.ctype, depth = out.depth;
	var rs = UPNG._bin.readUshort;

	if     (ctype==6) { // RGB + alpha
		var qarea = area<<2;
		if(depth== 8) for(var i=0; i<qarea;i++) {  bf[i] = data[i];  /*if((i&3)==3) bf[i]=255;*/  }
		if(depth==16) for(var i=0; i<qarea;i++) {  bf[i] = data[i<<1];  }
	}
	else if(ctype==2) {	// RGB
		var ts=out.tabs["tRNS"], tr=-1, tg=-1, tb=-1;
		if(ts) {  tr=ts[0];  tg=ts[1];  tb=ts[2];  }
		if(depth== 8) for(var i=0; i<area; i++) {  var qi=i<<2, ti=i*3;  bf[qi] = data[ti];  bf[qi+1] = data[ti+1];  bf[qi+2] = data[ti+2];  bf[qi+3] = 255;
			if(tr!=-1 && data[ti]   ==tr && data[ti+1]   ==tg && data[ti+2]   ==tb) bf[qi+3] = 0;  }
		if(depth==16) for(var i=0; i<area; i++) {  var qi=i<<2, ti=i*6;  bf[qi] = data[ti];  bf[qi+1] = data[ti+2];  bf[qi+2] = data[ti+4];  bf[qi+3] = 255;
			if(tr!=-1 && rs(data,ti)==tr && rs(data,ti+2)==tg && rs(data,ti+4)==tb) bf[qi+3] = 0;  }
	}
	else if(ctype==3) {	// palette
		var p=out.tabs["PLTE"], ap=out.tabs["tRNS"], tl=ap?ap.length:0;
		if(depth==1) for(var y=0; y<h; y++) {  var s0 = y*bpl, t0 = y*w;
			for(var i=0; i<w; i++) { var qi=(t0+i)<<2, j=((data[s0+(i>>3)]>>(7-((i&7)<<0)))& 1), cj=3*j;  bf[qi]=p[cj];  bf[qi+1]=p[cj+1];  bf[qi+2]=p[cj+2];  bf[qi+3]=(j<tl)?ap[j]:255;  }
		}
		if(depth==2) for(var y=0; y<h; y++) {  var s0 = y*bpl, t0 = y*w;
			for(var i=0; i<w; i++) { var qi=(t0+i)<<2, j=((data[s0+(i>>2)]>>(6-((i&3)<<1)))& 3), cj=3*j;  bf[qi]=p[cj];  bf[qi+1]=p[cj+1];  bf[qi+2]=p[cj+2];  bf[qi+3]=(j<tl)?ap[j]:255;  }
		}
		if(depth==4) for(var y=0; y<h; y++) {  var s0 = y*bpl, t0 = y*w;
			for(var i=0; i<w; i++) { var qi=(t0+i)<<2, j=((data[s0+(i>>1)]>>(4-((i&1)<<2)))&15), cj=3*j;  bf[qi]=p[cj];  bf[qi+1]=p[cj+1];  bf[qi+2]=p[cj+2];  bf[qi+3]=(j<tl)?ap[j]:255;  }
		}
		if(depth==8) for(var i=0; i<area; i++ ) {  var qi=i<<2, j=data[i]                      , cj=3*j;  bf[qi]=p[cj];  bf[qi+1]=p[cj+1];  bf[qi+2]=p[cj+2];  bf[qi+3]=(j<tl)?ap[j]:255;  }
	}
	else if(ctype==4) {	// gray + alpha
		if(depth== 8)  for(var i=0; i<area; i++) {  var qi=i<<2, di=i<<1, gr=data[di];  bf[qi]=gr;  bf[qi+1]=gr;  bf[qi+2]=gr;  bf[qi+3]=data[di+1];  }
		if(depth==16)  for(var i=0; i<area; i++) {  var qi=i<<2, di=i<<2, gr=data[di];  bf[qi]=gr;  bf[qi+1]=gr;  bf[qi+2]=gr;  bf[qi+3]=data[di+2];  }
	}
	else if(ctype==0) {	// gray
		var tr = out.tabs["tRNS"] ? out.tabs["tRNS"] : -1;
		if(depth== 1) for(var i=0; i<area; i++) {  var gr=255*((data[i>>3]>>(7 -((i&7)   )))& 1), al=(gr==tr*255)?0:255;  bf32[i]=(al<<24)|(gr<<16)|(gr<<8)|gr;  }
		if(depth== 2) for(var i=0; i<area; i++) {  var gr= 85*((data[i>>2]>>(6 -((i&3)<<1)))& 3), al=(gr==tr* 85)?0:255;  bf32[i]=(al<<24)|(gr<<16)|(gr<<8)|gr;  }
		if(depth== 4) for(var i=0; i<area; i++) {  var gr= 17*((data[i>>1]>>(4 -((i&1)<<2)))&15), al=(gr==tr* 17)?0:255;  bf32[i]=(al<<24)|(gr<<16)|(gr<<8)|gr;  }
		if(depth== 8) for(var i=0; i<area; i++) {  var gr=data[i  ] , al=(gr           ==tr)?0:255;  bf32[i]=(al<<24)|(gr<<16)|(gr<<8)|gr;  }
		if(depth==16) for(var i=0; i<area; i++) {  var gr=data[i<<1], al=(rs(data,i<<1)==tr)?0:255;  bf32[i]=(al<<24)|(gr<<16)|(gr<<8)|gr;  }
	}
	else log("unsupported color type", ctype);
	return bf;
};

UPNG.encode = function(buff, w, h, ps)
{
	if(ps==null) ps=0;
	var img = new Uint8Array(buff);
	var data = new Uint8Array(img.length+100);
	var wr=[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
	for(var i=0; i<8; i++) data[i]=wr[i];
	var offset = 8,  bin = UPNG._bin, crc = UPNG.crc.crc;

	var nimg = UPNG.encode.compress(img, w, h, ps);

	bin.writeUint (data,offset, 13);     offset+=4;
	bin.writeASCII(data,offset,"IHDR");  offset+=4;
	bin.writeUint (data,offset,w);  offset+=4;
	bin.writeUint (data,offset,h);  offset+=4;
	data[offset] = nimg.depth;  offset++;  // depth
	data[offset] = nimg.ctype;  offset++;  // ctype
	data[offset] = 0;  offset++;  // compress
	data[offset] = 0;  offset++;  // filter
	data[offset] = 0;  offset++;  // interlace
	bin.writeUint (data,offset,crc(data,offset-17,17));  offset+=4; // crc

	// 9 bytes to say, that it is sRGB
	bin.writeUint (data,offset, 1);      offset+=4;
	bin.writeASCII(data,offset,"sRGB");  offset+=4;
	data[offset] = 1;  offset++;
	bin.writeUint (data,offset,crc(data,offset-5,5));  offset+=4; // crc


	if(nimg.ctype==3) {
		var dl = nimg.plte.length;
		bin.writeUint (data,offset, dl*3);  offset+=4;
		bin.writeASCII(data,offset,"PLTE");  offset+=4;
		for(var i=0; i<dl; i++){
			var ti=i*3, c=nimg.plte[i], r=(c)&255, g=(c>>8)&255, b=(c>>16)&255;
			data[offset+ti+0]=r;  data[offset+ti+1]=g;  data[offset+ti+2]=b;
		}
		offset+=dl*3;
		bin.writeUint (data,offset,crc(data,offset-dl*3-4,dl*3+4));  offset+=4; // crc

		if(nimg.gotAlpha) {
			bin.writeUint (data,offset, dl);  offset+=4;
			bin.writeASCII(data,offset,"tRNS");  offset+=4;
			for(var i=0; i<dl; i++)  data[offset+i]=(nimg.plte[i]>>24)&255;
			offset+=dl;
			bin.writeUint (data,offset,crc(data,offset-dl-4,dl+4));  offset+=4; // crc
		}
	}

	var dl = nimg.data.length;
	bin.writeUint (data,offset, dl);     offset+=4;
	bin.writeASCII(data,offset,"IDAT");  offset+=4;
	for(var i=0; i<dl; i++) data[offset+i] = nimg.data[i];
	offset += dl;
	bin.writeUint (data,offset,crc(data,offset-dl-4,dl+4));  offset+=4; // crc

	bin.writeUint (data,offset, 0);     offset+=4;
	bin.writeASCII(data,offset,"IEND");  offset+=4;
	bin.writeUint (data,offset,crc(data,offset-4,4));  offset+=4; // crc

	return data.buffer.slice(0,offset);
};

UPNG.encode.compress = function(img, w, h, ps)
{
	if(ps!=0) img = UPNG.quantize(img, w, h, ps);

	var ctype = 6, depth = 8, plte=[], bpp = 4, bpl = 4*w;
	var img32 = new Uint32Array(img.buffer);
	var gotAlpha=false, cmap=[];
	for(var i=0; i<img.length; i+=4) {
		var c = img32[i>>2];  if(plte.length<600 && cmap[c]==null) {  cmap[c]=plte.length;  plte.push(c);  }
		if(img[i+3]!=255) gotAlpha = true;
	}
	var cc=plte.length;
	if(cc<=256) {
		if(cc<= 2) depth=1;  else if(cc<= 4) depth=2;  else if(cc<=16) depth=4;  else depth=8;
		bpl = Math.ceil(depth*w/8), nimg = new Uint8Array(bpl*h);
		for(var y=0; y<h; y++) {  var i=y*bpl, ii=y*w;
			if(depth==1) for(var x=0; x<w; x++) nimg[i+(x>>3)]  |=  (cmap[img32[ii+x]]<<(7-(x&7)  ));
			if(depth==2) for(var x=0; x<w; x++) nimg[i+(x>>2)]  |=  (cmap[img32[ii+x]]<<(6-(x&3)*2));
			if(depth==4) for(var x=0; x<w; x++) nimg[i+(x>>1)]  |=  (cmap[img32[ii+x]]<<(4-(x&1)*4));
			if(depth==8) for(var x=0; x<w; x++) nimg[i+ x    ]   =   cmap[img32[ii+x]];
		}
		img=nimg;  ctype=3;  bpp=1;
	}
	else if(gotAlpha==false) {
		var nimg = new Uint8Array(w*h*3), area=w*h;
		for(var i=0; i<area; i++) { var ti=i*3, qi=i*4;  nimg[ti]=img[qi];  nimg[ti+1]=img[qi+1];  nimg[ti+2]=img[qi+2];  }
		img=nimg;  ctype=2;  bpp=3;  bpl=3*w;
	}

	var data = new Uint8Array(w*h*bpp+h);
	return {ctype:ctype, depth:depth, plte:plte, gotAlpha:gotAlpha, data: UPNG.encode._filterZero(img,h,bpp,bpl,data)  };
};

UPNG.encode._filterZero = function(img,h,bpp,bpl,data)
{
	var fls = [];
	for(var t=0; t<5; t++) {  if(h*bpl>500000 && (t==2 || t==3 || t==4)) continue;
		for(var y=0; y<h; y++) UPNG.encode._filterLine(data, img, y, bpl, bpp, t);
		fls.push(pako["deflate"](data));  if(bpp==1) break;
	}
	var ti, tsize=1e9;
	for(var i=0; i<fls.length; i++) if(fls[i].length<tsize) {  ti=i;  tsize=fls[i].length;  }
	//log("top filter", ti);
	return fls[ti];
};
UPNG.encode._filterLine = function(data, img, y, bpl, bpp, type)
{
	var i = y*bpl, di = i+y, paeth = UPNG.decode._paeth;
	data[di]=type;  di++;

	if(type==0) for(var x=0; x<bpl; x++) data[di+x] = img[i+x];
	else if(type==1) {
		for(var x=  0; x<bpp; x++) data[di+x] =  img[i+x];
		for(var x=bpp; x<bpl; x++) data[di+x] = (img[i+x]-img[i+x-bpp]+256)&255;
	}
	else if(y==0) {
		for(var x=  0; x<bpp; x++) data[di+x] = img[i+x];

		if(type==2) for(var x=bpp; x<bpl; x++) data[di+x] = img[i+x];
		if(type==3) for(var x=bpp; x<bpl; x++) data[di+x] = (img[i+x] - (img[i+x-bpp]>>1) +256)&255;
		if(type==4) for(var x=bpp; x<bpl; x++) data[di+x] = (img[i+x] - paeth(img[i+x-bpp], 0, 0) +256)&255;
	}
	else {
		if(type==2) { for(var x=  0; x<bpl; x++) data[di+x] = (img[i+x]+256 - img[i+x-bpl])&255;  }
		if(type==3) { for(var x=  0; x<bpp; x++) data[di+x] = (img[i+x]+256 - (img[i+x-bpl]>>1))&255;
					  for(var x=bpp; x<bpl; x++) data[di+x] = (img[i+x]+256 - ((img[i+x-bpl]+img[i+x-bpp])>>1))&255;  }
		if(type==4) { for(var x=  0; x<bpp; x++) data[di+x] = (img[i+x]+256 - paeth(0, img[i+x-bpl], 0))&255;
					  for(var x=bpp; x<bpl; x++) data[di+x] = (img[i+x]+256 - paeth(img[i+x-bpp], img[i+x-bpl], img[i+x-bpp-bpl]))&255;  }
	}
};

UPNG.crc = {
	table : ( function() {
	   var tab = new Uint32Array(256);
	   for (var n=0; n<256; n++) {
			var c = n;
			for (var k=0; k<8; k++) {
				if (c & 1)  c = 0xedb88320 ^ (c >>> 1);
				else        c = c >>> 1;
			}
			tab[n] = c;  }
		return tab;  })(),
	update : function(c, buf, off$$1, len) {
		for (var i=0; i<len; i++)  c = UPNG.crc.table[(c ^ buf[off$$1+i]) & 0xff] ^ (c >>> 8);
		return c;
	},
	crc : function(b,o,l)  {  return UPNG.crc.update(0xffffffff,b,o,l) ^ 0xffffffff;  }
};

UPNG.quantize = function(img, w, h, ps)
{
	var nimg = new Uint8Array(img.length), pind = new Uint16Array(w*h), area=w*h, edist=UPNG.quantize.dist;
	for(var i=0; i<area; i++) {
		var qi=i<<2, a=img[qi+3]/255;
		nimg[qi+0] = img[qi+0]*a;  nimg[qi+1] = img[qi+1]*a;  nimg[qi+2] = img[qi+2]*a;  nimg[qi+3] = img[qi+3];
	}
	var plte=[], used=[], pr=0, plim = Math.max(100, 10*ps);
	while(true) {
		used=[];  plte=[];
		var msk = 0xff - ((1<<pr)-1), add = ((1<<pr))>>1;
		for(var i=0; i<area; i++) {  var qi=i<<2;  var r=nimg[qi],g=nimg[qi+1],b=nimg[qi+2],a=nimg[qi+3];
			var nr=(r&msk)+add, ng=(g&msk)+add, nb=(b&msk)+add, na=(a&msk)+add, key=(na<<24)|(nb<<16)|(ng<<8)|nr;
			if(used[key]) {  var pv=plte[used[key]];  pv.occ++;  }
			else {  used[key]=plte.length;  plte.push(  {occ:1, r:nr,g:ng,b:nb,a:na}  );  }
			if(plte.length>plim) break;
		}
		if(plte.length>plim) {  pr++;  continue;  }
		break;
	}
	if(pr==0 && plte.length<=ps) return img;
	plte.sort(function(a,b) {return b.occ-a.occ;});

	ps = Math.min(ps, plte.length);
	var nplte = new Uint8Array(ps*4);
	for(var i=0; i<ps; i++) {  var qi=i<<2,c=plte[i];  nplte[qi]=c.r;  nplte[qi+1]=c.g;  nplte[qi+2]=c.b;  nplte[qi+3]=c.a;  }
	plte = nplte;  //*/

	var icnt = Math.max(1, Math.min(10, Math.floor(1024/ps)));
	for(var it=0; it<icnt; it++)
	{
		var hist=new Uint32Array(ps), nplt=new Uint32Array(ps*4);
		var ndst=new Uint32Array(ps), nind=new Uint32Array(ps  );
		for(var i=0; i<ps; i++) { var qi=i<<2;
			var r=plte[qi], g=plte[qi+1], b=plte[qi+2], a=plte[qi+3];
			var ci=0; cd=1e9;
			for(var j=0; j<ps; j++) {  if(j==i) continue;
				var dst = edist(r,g,b,a,plte,j<<2);
				if(dst<cd) {  ci=j;  cd=dst;  }
			}
			ndst[i]=cd;  nind[i]=ci;
		}
		for(var i=0; i<area; i++) {  var qi=i<<2;
			var r=nimg[qi], g=nimg[qi+1], b=nimg[qi+2], a=nimg[qi+3];
			var ci=0, cd=1e9;
			ci=pind[i];  cd=edist(r,g,b,a,plte,ci<<2);  if(cd<=(ndst[ci]>>1)) {}  else
			for(var j=0; j<ps; j++) {
				var dst = edist(r,g,b,a,plte,j<<2);
				if(dst<cd) {  ci=j;  cd=dst;
					if(dst<=(ndst[ci]>>1)) break;
					var dst = edist(r,g,b,a,plte,nind[j]<<2);
					if(dst<=(ndst[ci]>>1)) {  ci=nind[j];  break;  }
				}
			}
			pind[i]=ci;  hist[ci]++;  var qci=ci<<2;
			nplt[qci]+=r;  nplt[qci+1]+=g;  nplt[qci+2]+=b;  nplt[qci+3]+=a;
		}
		for(var i=0; i<ps; i++) {  var qi=i<<2, den=1/hist[i];
			plte[qi]=nplt[qi]*den;  plte[qi+1]=nplt[qi+1]*den;  plte[qi+2]=nplt[qi+2]*den;  plte[qi+3]=nplt[qi+3]*den;
		}
	}
	//UPNG.quantize.dither(nimg, w,h, pind,plte, ps);  // I think that (current) dithering is not worth it
	for(var i=0; i<area; i++) {
		var qi=i<<2, ci=pind[i], qci=ci<<2, ia = plte[qci+3]==0 ? 0 : 255/plte[qci+3];
		nimg[qi+0] = plte[qci+0]*ia;  nimg[qi+1] = plte[qci+1]*ia;  nimg[qi+2] = plte[qci+2]*ia;  nimg[qi+3] = plte[qci+3];
	}
	return nimg;
};
UPNG.quantize.dist = function(r,g,b,a,ba,bi)
{
	var pr=ba[bi], pg=ba[bi+1], pb=ba[bi+2], pa=ba[bi+3];
	return (pr-r)*(pr-r)+(pg-g)*(pg-g)+(pb-b)*(pb-b)+(pa-a)*(pa-a);
};
UPNG.quantize.dither = function(nimg, w, h, pind, plte, ps)
{
	var err = new Float32Array(w*h*4), i16 = 1/16;
	var edist = UPNG.quantize.dist, round=Math.round, qw=w<<2;
	for(var y=0; y<h; y++)
		for(var x=0; x<w; x++) {
			var i = y*w+x, qi=i<<2;
			for(var j=0; j<4; j++) err[qi+j] = Math.max(-8, Math.min(8, err[qi+j]));
			var r=round(nimg[qi]+err[qi]), g=round(nimg[qi+1]+err[qi+1]), b=round(nimg[qi+2]+err[qi+2]), a=round(nimg[qi+3]+err[qi+3]);
			var ci=0, cd=1e9;
			for(var j=0; j<ps; j++) {
				var dst = edist(r,g,b,a,plte,j<<2);
				if(dst<cd) {  ci=j;  cd=dst;  }
			}
			pind[i]=ci;
			var ciq = ci<<2;
			var dr=r-plte[ciq], dg=g-plte[ciq+1], db=b-plte[ciq+2], da=a-plte[ciq+3];

			err[qi   +4+0] += (7*dr*i16);  err[qi   +4+1] += (7*dg*i16);  err[qi   +4+2] += (7*db*i16);  err[qi   +4+3] += (7*da*i16);
			err[qi+qw-4+0] += (3*dr*i16);  err[qi+qw-4+1] += (3*dg*i16);  err[qi+qw-4+2] += (3*db*i16);  err[qi+qw-4+3] += (3*da*i16);
			err[qi+qw  +0] += (5*dr*i16);  err[qi+qw  +1] += (5*dg*i16);  err[qi+qw  +2] += (5*db*i16);  err[qi+qw  +3] += (5*da*i16);
			err[qi+qw+4+0] += (1*dr*i16);  err[qi+qw+4+1] += (1*dg*i16);  err[qi+qw+4+2] += (1*db*i16);  err[qi+qw+4+3] += (1*da*i16);
		}
};

UPNG.decode = function(buff)
{
	var data = new Uint8Array(buff), offset = 8, bin = UPNG._bin, rUs = bin.readUshort;
	var out = {tabs:{}};
	var dd = new Uint8Array(data.length), doff = 0;	 // put all IDAT data into it

	while(true)
	{
		var len = bin.readUint(data, offset);  offset += 4;
		var type = bin.readASCII(data, offset, 4);  offset += 4;
		//log(offset, len, type);

		if     (type=="IHDR")  {  UPNG.decode._IHDR(data, offset, out);  }
		else if(type=="IDAT") {
			for(var i=0; i<len; i++) dd[doff+i] = data[offset+i];
			doff += len;
		}
		else if(type=="pHYs") {
			out.tabs[type] = [bin.readUint(data, offset), bin.readUint(data, offset+4), data[offset+8]];
		}
		else if(type=="cHRM") {
			out.tabs[type] = [];
			for(var i=0; i<8; i++) out.tabs[type].push(bin.readUint(data, offset+i*4));
		}
		else if(type=="tEXt") {
			if(out.tabs[type]==null) out.tabs[type] = {};
			var nz = bin.nextZero(data, offset);
			var keyw = bin.readASCII(data, offset, nz-offset);
			var text = bin.readASCII(data, nz+1, offset+len-nz-1);
			out.tabs[type][keyw] = text;
		}
		else if(type=="iTXt") {
			if(out.tabs[type]==null) out.tabs[type] = {};
			var nz = 0, off$$1 = offset;
			nz = bin.nextZero(data, off$$1);
			var keyw = bin.readASCII(data, off$$1, nz-off$$1);  off$$1 = nz + 1;
			var cflag = data[off$$1], cmeth = data[off$$1+1];  off$$1+=2;
			nz = bin.nextZero(data, off$$1);
			var ltag = bin.readASCII(data, off$$1, nz-off$$1);  off$$1 = nz + 1;
			nz = bin.nextZero(data, off$$1);
			var tkeyw = bin.readUTF8(data, off$$1, nz-off$$1);  off$$1 = nz + 1;
			var text = bin.readUTF8(data, off$$1, len-(off$$1-offset));
			out.tabs[type][keyw] = text;
		}
		else if(type=="PLTE") {
			out.tabs[type] = bin.readBytes(data, offset, len);
		}
		else if(type=="hIST") {
			var pl = out.tabs["PLTE"].length/3;
			out.tabs[type] = [];  for(var i=0; i<pl; i++) out.tabs[type].push(rUs(data, offset+i*2));
		}
		else if(type=="tRNS") {
			if     (out.ctype==3) out.tabs[type] = bin.readBytes(data, offset, len);
			else if(out.ctype==0) out.tabs[type] = rUs(data, offset);
			else if(out.ctype==2) out.tabs[type] = [ rUs(data,offset),rUs(data,offset+2),rUs(data,offset+4) ];
			else log("tRNS for unsupported color type",out.ctype, len);
		}
		else if(type=="gAMA") out.tabs[type] = bin.readUint(data, offset)/100000;
		else if(type=="sRGB") out.tabs[type] = data[offset];
		else if(type=="bKGD")
		{
			if     (out.ctype==0 || out.ctype==4) out.tabs[type] = [rUs(data, offset)];
			else if(out.ctype==2 || out.ctype==6) out.tabs[type] = [rUs(data, offset), rUs(data, offset+2), rUs(data, offset+4)];
			else if(out.ctype==3) out.tabs[type] = data[offset];
		}
		else if(type=="IEND") {
			if(out.compress ==0) dd = UPNG.decode._inflate(dd);
			else log("unsupported compression method:", out.interlace);

			if(out.filter!=0) log("unsupported filter method:", out.filter);

			if(out.interlace==0) out.data = UPNG.decode._filterZero(dd, out, 0, out.width, out.height);
			else if(out.interlace==1) out.data = UPNG.decode._readInterlace(dd, out);
			else log("unsupported interlace method:", out.interlace);

			break;
		}
		else {  log("unknown chunk type", type, len);  }
		offset += len;
		var crc = bin.readUint(data, offset);  offset += 4;
	}
	delete out.compress;  delete out.interlace;  delete out.filter;
	return out;
};

UPNG.decode._inflate = function(data) {  return pako["inflate"](data);  };

UPNG.decode._readInterlace = function(data, out)
{
	var w = out.width, h = out.height;
	var bpp = UPNG.decode._getBPP(out), cbpp = bpp>>3, bpl = Math.ceil(w*bpp/8);
	var img = new Uint8Array( h * bpl );
	var di = 0;

	var starting_row  = [ 0, 0, 4, 0, 2, 0, 1 ];
	var starting_col  = [ 0, 4, 0, 2, 0, 1, 0 ];
	var row_increment = [ 8, 8, 8, 4, 4, 2, 2 ];
	var col_increment = [ 8, 8, 4, 4, 2, 2, 1 ];

	var pass=0;
	while(pass<7)
	{
		var ri = row_increment[pass], ci = col_increment[pass];
		var sw = 0, sh = 0;
		var cr = starting_row[pass];  while(cr<h) {  cr+=ri;  sh++;  }
		var cc = starting_col[pass];  while(cc<w) {  cc+=ci;  sw++;  }
		var bpll = Math.ceil(sw*bpp/8);
		UPNG.decode._filterZero(data, out, di, sw, sh);

		var y=0, row = starting_row[pass];
		while(row<h)
		{
			var col = starting_col[pass];
			var cdi = (di+y*bpll)<<3;

			while(col<w)
			{
				if(bpp==1) {
					var val = data[cdi>>3];  val = (val>>(7-(cdi&7)))&1;
					img[row*bpl + (col>>3)] |= (val << (7-((col&3)<<0)));
				}
				if(bpp==2) {
					var val = data[cdi>>3];  val = (val>>(6-(cdi&7)))&3;
					img[row*bpl + (col>>2)] |= (val << (6-((col&3)<<1)));
				}
				if(bpp==4) {
					var val = data[cdi>>3];  val = (val>>(4-(cdi&7)))&15;
					img[row*bpl + (col>>1)] |= (val << (4-((col&1)<<2)));
				}
				if(bpp>=8) {
					var ii = row*bpl+col*cbpp;
					for(var j=0; j<cbpp; j++) img[ii+j] = data[(cdi>>3)+j];
				}
				cdi+=bpp;  col+=ci;
			}
			y++;  row += ri;
		}
		if(sw*sh!=0) di += sh * (1 + bpll);
		pass = pass + 1;
	}
	return img;
};

UPNG.decode._getBPP = function(out) {
	var noc = [1,null,3,1,2,null,4][out.ctype];
	if(noc==null) log("unsupported color type", out.ctype);
	return noc * out.depth;
};

UPNG.decode._filterZero = function(data, out, off$$1, w, h)
{
	var bpp = UPNG.decode._getBPP(out), bpl = Math.ceil(w*bpp/8), paeth = UPNG.decode._paeth;
	bpp = Math.ceil(bpp/8);

	for(var y=0; y<h; y++)  {
		var i = off$$1+y*bpl, di = i+y+1;
		var type = data[di-1];

		if     (type==0) for(var x=  0; x<bpl; x++) data[i+x] = data[di+x];
		else if(type==1) {
			for(var x=  0; x<bpp; x++) data[i+x] = data[di+x];
			for(var x=bpp; x<bpl; x++) data[i+x] = (data[di+x] + data[i+x-bpp])&255;
		}
		else if(y==0) {
			for(var x=  0; x<bpp; x++) data[i+x] = data[di+x];
			if(type==2) for(var x=bpp; x<bpl; x++) data[i+x] = (data[di+x])&255;
			if(type==3) for(var x=bpp; x<bpl; x++) data[i+x] = (data[di+x] + (data[i+x-bpp]>>1) )&255;
			if(type==4) for(var x=bpp; x<bpl; x++) data[i+x] = (data[di+x] + paeth(data[i+x-bpp], 0, 0) )&255;
		}
		else {
			if(type==2) { for(var x=  0; x<bpl; x++) data[i+x] = (data[di+x] + data[i+x-bpl])&255;  }

			if(type==3) { for(var x=  0; x<bpp; x++) data[i+x] = (data[di+x] + (data[i+x-bpl]>>1))&255;
			              for(var x=bpp; x<bpl; x++) data[i+x] = (data[di+x] + ((data[i+x-bpl]+data[i+x-bpp])>>1) )&255;  }

			if(type==4) { for(var x=  0; x<bpp; x++) data[i+x] = (data[di+x] + paeth(0, data[i+x-bpl], 0))&255;
						  for(var x=bpp; x<bpl; x++) data[i+x] = (data[di+x] + paeth(data[i+x-bpp], data[i+x-bpl], data[i+x-bpp-bpl]) )&255;  }
		}
	}
	return data;
};

UPNG.decode._paeth = function(a,b,c)
{
	var p = a+b-c, pa = Math.abs(p-a), pb = Math.abs(p-b), pc = Math.abs(p-c);
	if (pa <= pb && pa <= pc)  return a;
	else if (pb <= pc)  return b;
	return c;
};

UPNG.decode._IHDR = function(data, offset, out)
{
	var bin = UPNG._bin;
	out.width  = bin.readUint(data, offset);  offset += 4;
	out.height = bin.readUint(data, offset);  offset += 4;
	out.depth     = data[offset];  offset++;
	out.ctype     = data[offset];  offset++;
	out.compress  = data[offset];  offset++;
	out.filter    = data[offset];  offset++;
	out.interlace = data[offset];  offset++;
};

UPNG._bin = {
	nextZero   : function(data,p)  {  while(data[p]!=0) p++;  return p;  },
	readUshort : function(buff,p)  {  return (buff[p]<< 8) | buff[p+1];  },
	writeUshort: function(buff,p,n){  buff[p] = (n>>8)&255;  buff[p+1] = n&255;  },
	readUint   : function(buff,p)  {  return (buff[p]*(256*256*256)) + ((buff[p+1]<<16) | (buff[p+2]<< 8) | buff[p+3]);  },
	writeUint  : function(buff,p,n){  buff[p]=(n>>24)&255;  buff[p+1]=(n>>16)&255;  buff[p+2]=(n>>8)&255;  buff[p+3]=n&255;  },
	readASCII  : function(buff,p,l){  var s = "";  for(var i=0; i<l; i++) s += String.fromCharCode(buff[p+i]);  return s;    },
	writeASCII : function(data,p,s){  for(var i=0; i<s.length; i++) data[p+i] = s.charCodeAt(i);  },
	readBytes  : function(buff,p,l){  var arr = [];   for(var i=0; i<l; i++) arr.push(buff[p+i]);   return arr;  },
	pad : function(n) { return n.length < 2 ? "0" + n : n; },
	readUTF8 : function(buff, p, l) {
		var s = "", ns;
		for(var i=0; i<l; i++) s += "%" + UPNG._bin.pad(buff[p+i].toString(16));
		try {  ns = decodeURIComponent(s); }
		catch(e) {  return UPNG._bin.readASCII(buff, p, l);  }
		return  ns;
	}
};

})(UPNG, pako);
})();
});

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link     https://github.com/jonathanlurie/pixpipejs
* Lab      MCIN - Montreal Neurological Institute
*/



//import pngjs from 'pngjs'; // ependency issues
/**
* An instance of PngDecoder will decode a PNG image in native Javascript and
* output an Image2D. This is of course slower than using `io/FileImageReader.js`
* but this is compatible with Node and not rely on HTML5 Canvas.
*
* **Usage**
* - [examples/fileToPng.html](../examples/fileToPng.html)
*/
class PngDecoder extends Filter {
  constructor() {
    super();
    this.addInputValidator(0, ArrayBuffer);
  }
  
  _run(){
    var inputBuffer = this._getInput(0);

    if(!inputBuffer){
      console.warn("PngDecoder requires an ArrayBuffer as input \"0\". Unable to continue.");
      return;
    }
    
    if( !this._isPng( inputBuffer ) ){
      console.warn("This is not a PNG file, unable to decode this file.");
      return;
    }
    
    // The decode method uses Pako to uncompress the data. Pako outputs a larger array
    // than the expected size, so we have to cut it - It seems a bit cumbersome or being
    // kindof manual work, but it's 2x faster than using upng.toRGBA8()
    try{
      var pngData = UPNG.decode( inputBuffer );
      var ncpp = Math.round(pngData.data.length / (pngData.width*pngData.height) );
      var outputImage = new Image2D();
      var croppedArray = new pngData.data.constructor( pngData.data.buffer, 0, pngData.width * pngData.height * ncpp);
      outputImage.setData(croppedArray, pngData.width, pngData.height, ncpp);
      this._output[ 0 ] = outputImage;
    }catch(e){
      console.warn(e);
    }
    
  }
  
  
  /**
  * Checks if the input buffer is of a png file
  * @param {ArrayBuffer} buffer - an array buffer inside which a PNG could be hiding!
  * @return {Boolean} true if the buffer is a valid PNG buffer, false if not
  */
  _isPng( buffer ){
    var first8Bytes = new Uint8Array( buffer, 0, 8);
    var validSequence = new Uint8Array( [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    
    for(var i=0; i<first8Bytes.length; i++){
      if(first8Bytes[i] != validSequence[i])
        return false;
    }
    
    return true;
  }
  
  
} /* PngDecoder */

function iota(n) {
  var result = new Array(n);
  for(var i=0; i<n; ++i) {
    result[i] = i;
  }
  return result
}

var iota_1 = iota;

/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
var index$3 = function (obj) {
  return obj != null && (isBuffer$1(obj) || isSlowBuffer$1(obj) || !!obj._isBuffer)
};

function isBuffer$1 (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer$1 (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer$1(obj.slice(0, 0))
}

var hasTypedArrays  = ((typeof Float64Array) !== "undefined");

function compare1st(a, b) {
  return a[0] - b[0]
}

function order() {
  var stride = this.stride;
  var terms = new Array(stride.length);
  var i;
  for(i=0; i<terms.length; ++i) {
    terms[i] = [Math.abs(stride[i]), i];
  }
  terms.sort(compare1st);
  var result = new Array(terms.length);
  for(i=0; i<result.length; ++i) {
    result[i] = terms[i][1];
  }
  return result
}

function compileConstructor(dtype, dimension) {
  var className = ["View", dimension, "d", dtype].join("");
  if(dimension < 0) {
    className = "View_Nil" + dtype;
  }
  var useGetters = (dtype === "generic");

  if(dimension === -1) {
    //Special case for trivial arrays
    var code =
      "function "+className+"(a){this.data=a;};\
var proto="+className+".prototype;\
proto.dtype='"+dtype+"';\
proto.index=function(){return -1};\
proto.size=0;\
proto.dimension=-1;\
proto.shape=proto.stride=proto.order=[];\
proto.lo=proto.hi=proto.transpose=proto.step=\
function(){return new "+className+"(this.data);};\
proto.get=proto.set=function(){};\
proto.pick=function(){return null};\
return function construct_"+className+"(a){return new "+className+"(a);}";
    var procedure = new Function(code);
    return procedure()
  } else if(dimension === 0) {
    //Special case for 0d arrays
    var code =
      "function "+className+"(a,d) {\
this.data = a;\
this.offset = d\
};\
var proto="+className+".prototype;\
proto.dtype='"+dtype+"';\
proto.index=function(){return this.offset};\
proto.dimension=0;\
proto.size=1;\
proto.shape=\
proto.stride=\
proto.order=[];\
proto.lo=\
proto.hi=\
proto.transpose=\
proto.step=function "+className+"_copy() {\
return new "+className+"(this.data,this.offset)\
};\
proto.pick=function "+className+"_pick(){\
return TrivialArray(this.data);\
};\
proto.valueOf=proto.get=function "+className+"_get(){\
return "+(useGetters ? "this.data.get(this.offset)" : "this.data[this.offset]")+
"};\
proto.set=function "+className+"_set(v){\
return "+(useGetters ? "this.data.set(this.offset,v)" : "this.data[this.offset]=v")+"\
};\
return function construct_"+className+"(a,b,c,d){return new "+className+"(a,d)}";
    var procedure = new Function("TrivialArray", code);
    return procedure(CACHED_CONSTRUCTORS[dtype][0])
  }

  var code = ["'use strict'"];

  //Create constructor for view
  var indices = iota_1(dimension);
  var args = indices.map(function(i) { return "i"+i });
  var index_str = "this.offset+" + indices.map(function(i) {
        return "this.stride[" + i + "]*i" + i
      }).join("+");
  var shapeArg = indices.map(function(i) {
      return "b"+i
    }).join(",");
  var strideArg = indices.map(function(i) {
      return "c"+i
    }).join(",");
  code.push(
    "function "+className+"(a," + shapeArg + "," + strideArg + ",d){this.data=a",
      "this.shape=[" + shapeArg + "]",
      "this.stride=[" + strideArg + "]",
      "this.offset=d|0}",
    "var proto="+className+".prototype",
    "proto.dtype='"+dtype+"'",
    "proto.dimension="+dimension);

  //view.size:
  code.push("Object.defineProperty(proto,'size',{get:function "+className+"_size(){\
return "+indices.map(function(i) { return "this.shape["+i+"]" }).join("*"),
"}})");

  //view.order:
  if(dimension === 1) {
    code.push("proto.order=[0]");
  } else {
    code.push("Object.defineProperty(proto,'order',{get:");
    if(dimension < 4) {
      code.push("function "+className+"_order(){");
      if(dimension === 2) {
        code.push("return (Math.abs(this.stride[0])>Math.abs(this.stride[1]))?[1,0]:[0,1]}})");
      } else if(dimension === 3) {
        code.push(
"var s0=Math.abs(this.stride[0]),s1=Math.abs(this.stride[1]),s2=Math.abs(this.stride[2]);\
if(s0>s1){\
if(s1>s2){\
return [2,1,0];\
}else if(s0>s2){\
return [1,2,0];\
}else{\
return [1,0,2];\
}\
}else if(s0>s2){\
return [2,0,1];\
}else if(s2>s1){\
return [0,1,2];\
}else{\
return [0,2,1];\
}}})");
      }
    } else {
      code.push("ORDER})");
    }
  }

  //view.set(i0, ..., v):
  code.push(
"proto.set=function "+className+"_set("+args.join(",")+",v){");
  if(useGetters) {
    code.push("return this.data.set("+index_str+",v)}");
  } else {
    code.push("return this.data["+index_str+"]=v}");
  }

  //view.get(i0, ...):
  code.push("proto.get=function "+className+"_get("+args.join(",")+"){");
  if(useGetters) {
    code.push("return this.data.get("+index_str+")}");
  } else {
    code.push("return this.data["+index_str+"]}");
  }

  //view.index:
  code.push(
    "proto.index=function "+className+"_index(", args.join(), "){return "+index_str+"}");

  //view.hi():
  code.push("proto.hi=function "+className+"_hi("+args.join(",")+"){return new "+className+"(this.data,"+
    indices.map(function(i) {
      return ["(typeof i",i,"!=='number'||i",i,"<0)?this.shape[", i, "]:i", i,"|0"].join("")
    }).join(",")+","+
    indices.map(function(i) {
      return "this.stride["+i + "]"
    }).join(",")+",this.offset)}");

  //view.lo():
  var a_vars = indices.map(function(i) { return "a"+i+"=this.shape["+i+"]" });
  var c_vars = indices.map(function(i) { return "c"+i+"=this.stride["+i+"]" });
  code.push("proto.lo=function "+className+"_lo("+args.join(",")+"){var b=this.offset,d=0,"+a_vars.join(",")+","+c_vars.join(","));
  for(var i=0; i<dimension; ++i) {
    code.push(
"if(typeof i"+i+"==='number'&&i"+i+">=0){\
d=i"+i+"|0;\
b+=c"+i+"*d;\
a"+i+"-=d}");
  }
  code.push("return new "+className+"(this.data,"+
    indices.map(function(i) {
      return "a"+i
    }).join(",")+","+
    indices.map(function(i) {
      return "c"+i
    }).join(",")+",b)}");

  //view.step():
  code.push("proto.step=function "+className+"_step("+args.join(",")+"){var "+
    indices.map(function(i) {
      return "a"+i+"=this.shape["+i+"]"
    }).join(",")+","+
    indices.map(function(i) {
      return "b"+i+"=this.stride["+i+"]"
    }).join(",")+",c=this.offset,d=0,ceil=Math.ceil");
  for(var i=0; i<dimension; ++i) {
    code.push(
"if(typeof i"+i+"==='number'){\
d=i"+i+"|0;\
if(d<0){\
c+=b"+i+"*(a"+i+"-1);\
a"+i+"=ceil(-a"+i+"/d)\
}else{\
a"+i+"=ceil(a"+i+"/d)\
}\
b"+i+"*=d\
}");
  }
  code.push("return new "+className+"(this.data,"+
    indices.map(function(i) {
      return "a" + i
    }).join(",")+","+
    indices.map(function(i) {
      return "b" + i
    }).join(",")+",c)}");

  //view.transpose():
  var tShape = new Array(dimension);
  var tStride = new Array(dimension);
  for(var i=0; i<dimension; ++i) {
    tShape[i] = "a[i"+i+"]";
    tStride[i] = "b[i"+i+"]";
  }
  code.push("proto.transpose=function "+className+"_transpose("+args+"){"+
    args.map(function(n,idx) { return n + "=(" + n + "===undefined?" + idx + ":" + n + "|0)"}).join(";"),
    "var a=this.shape,b=this.stride;return new "+className+"(this.data,"+tShape.join(",")+","+tStride.join(",")+",this.offset)}");

  //view.pick():
  code.push("proto.pick=function "+className+"_pick("+args+"){var a=[],b=[],c=this.offset");
  for(var i=0; i<dimension; ++i) {
    code.push("if(typeof i"+i+"==='number'&&i"+i+">=0){c=(c+this.stride["+i+"]*i"+i+")|0}else{a.push(this.shape["+i+"]);b.push(this.stride["+i+"])}");
  }
  code.push("var ctor=CTOR_LIST[a.length+1];return ctor(this.data,a,b,c)}");

  //Add return statement
  code.push("return function construct_"+className+"(data,shape,stride,offset){return new "+className+"(data,"+
    indices.map(function(i) {
      return "shape["+i+"]"
    }).join(",")+","+
    indices.map(function(i) {
      return "stride["+i+"]"
    }).join(",")+",offset)}");

  //Compile procedure
  var procedure = new Function("CTOR_LIST", "ORDER", code.join("\n"));
  return procedure(CACHED_CONSTRUCTORS[dtype], order)
}

function arrayDType(data) {
  if(index$3(data)) {
    return "buffer"
  }
  if(hasTypedArrays) {
    switch(Object.prototype.toString.call(data)) {
      case "[object Float64Array]":
        return "float64"
      case "[object Float32Array]":
        return "float32"
      case "[object Int8Array]":
        return "int8"
      case "[object Int16Array]":
        return "int16"
      case "[object Int32Array]":
        return "int32"
      case "[object Uint8Array]":
        return "uint8"
      case "[object Uint16Array]":
        return "uint16"
      case "[object Uint32Array]":
        return "uint32"
      case "[object Uint8ClampedArray]":
        return "uint8_clamped"
    }
  }
  if(Array.isArray(data)) {
    return "array"
  }
  return "generic"
}

var CACHED_CONSTRUCTORS = {
  "float32":[],
  "float64":[],
  "int8":[],
  "int16":[],
  "int32":[],
  "uint8":[],
  "uint16":[],
  "uint32":[],
  "array":[],
  "uint8_clamped":[],
  "buffer":[],
  "generic":[]
};function wrappedNDArrayCtor(data, shape, stride, offset) {
  if(data === undefined) {
    var ctor = CACHED_CONSTRUCTORS.array[0];
    return ctor([])
  } else if(typeof data === "number") {
    data = [data];
  }
  if(shape === undefined) {
    shape = [ data.length ];
  }
  var d = shape.length;
  if(stride === undefined) {
    stride = new Array(d);
    for(var i=d-1, sz=1; i>=0; --i) {
      stride[i] = sz;
      sz *= shape[i];
    }
  }
  if(offset === undefined) {
    offset = 0;
    for(var i=0; i<d; ++i) {
      if(stride[i] < 0) {
        offset -= (shape[i]-1)*stride[i];
      }
    }
  }
  var dtype = arrayDType(data);
  var ctor_list = CACHED_CONSTRUCTORS[dtype];
  while(ctor_list.length <= d+1) {
    ctor_list.push(compileConstructor(dtype, ctor_list.length-1));
  }
  var ctor = ctor_list[d+1];
  return ctor(data, shape, stride, offset)
}

var ndarray = wrappedNDArrayCtor;

function dtypeToType(dtype) {
  switch(dtype) {
    case 'uint8':
      return Uint8Array;
    case 'uint16':
      return Uint16Array;
    case 'uint32':
      return Uint32Array;
    case 'int8':
      return Int8Array;
    case 'int16':
      return Int16Array;
    case 'int32':
      return Int32Array;
    case 'float':
    case 'float32':
      return Float32Array;
    case 'double':
    case 'float64':
      return Float64Array;
    case 'uint8_clamped':
      return Uint8ClampedArray;
    case 'generic':
    case 'buffer':
    case 'data':
    case 'dataview':
      return ArrayBuffer;
    case 'array':
      return Array;
  }
}

var zeros = function zeros(shape, dtype) {
  dtype = dtype || 'float64';
  var sz = 1;
  for(var i=0; i<shape.length; ++i) {
    sz *= shape[i];
  }
  return ndarray(new (dtypeToType(dtype))(sz), shape);
};

/*
 * Author   Armin Taheri - https://github.com/ArminTaheri
 * License  MIT
 * Link     https://github.com/Pixpipe/pixpipejs
 * Lab      MCIN - Montreal Neurological Institute
 */

class ComponentProjectionImage2DFilter extends Filter {
  constructor() {
    super();
    this.addInputValidator(0, Image2D);
    this.setMetadata('componentOffset', 0);
  }
  
  
  _run() {
    if( ! this.hasValidInput()){
      console.warn("A filter of type ComponentProjectionImage2DFilter requires 1 input of Image2D.");
      return;
    }
    const inputSignal = this._getInput(0);
    const width = inputSignal.getMetadata('width');
    const height = inputSignal.getMetadata('height');
    const ncpp = inputSignal.getMetadata('ncpp');
    const offset = this.getMetadata('componentOffset');
    const arr = ndarray(inputSignal.getData(), [width, height, ncpp]);
    const projected = arr.pick(null, null, offset); // pick out the component as an ndarray
    const projectedArray = zeros([width, height], arr.dtype);
    for (let i = 0; i < width; i++) {
      for (let j = 0; j < height; j++) {
        projectedArray.set(i, j, projected.get(i, j));
      }
    }
    const projectedImage = new Image2D();
    projectedImage.setData(projectedArray.data, width, height, 1);
    this._output[0] = projectedImage;
  }

}

/*
 * Author   Armin Taheri - https://github.com/ArminTaheri
 * License  MIT
 * Link     https://github.com/Pixpipe/pixpipejs
 * Lab      MCIN - Montreal Neurological Institute
 */

function validateInputs(inputImages) {
  const widths = inputImages.map(i => i.getMetadata('width'));
  const widthsEqual = widths.reduce((eq, w) => eq && w === widths[0], true);
  if (!widthsEqual) {
    return false;
  }
  const heights = inputImages.map(i => i.getMetadata('height'));
  const heightsEqual = heights.reduce((eq, h) => eq && h === heights[0], true);
  if (!heightsEqual) {
    return false;
  }
  const types = inputImages.map(i => i.getData().constructor);
  const typesEqual = types.reduce((eq, t) => eq && t === types[0], true);
  if (!typesEqual) {
    return false;
  }
  return true;
}

class ComponentMergeImage2DFilter extends Filter {
  constructor() {
    super();
    this.addInputValidator('ALL', Image2D);
  }
  _run() {
    if(this.getNumberOfInputs() < 2) {
      console.warn('A filter of type ComponentMergeImage2DFilter needs 2 or more inputs.');
      return;
    }
    if( ! this.hasValidInput()){
      console.warn("A filter of type ComponentMergeImage2DFilter requires inputs of Image2D.");
      return;
    }
    const inputImages = this.getInputCategories().map(cat => this._getInput(cat));
    if (!validateInputs(inputImages)) {
      console.warn('A filter of type ComponentMergeImage2DFilter requires inputs to be the same dimensions and array type');
      return;
    }
    const width = inputImages[0].getMetadata('width');
    const height = inputImages[0].getMetadata('height');
    const ncpps = inputImages.map(i => i.getMetadata('ncpp'));
    const totalncpp = ncpps.reduce((x,y) => x + y);
    const type = ndarray(inputImages[0].getData()).dtype;
    const merged = zeros([width, height, totalncpp], type);

    let ncppoffset = 0;
    inputImages.forEach((image, index) => {
      const ncpp = image.getMetadata('ncpp');
      const img = ndarray(image.getData(), [width, height, ncpp]);
      for (let i = 0; i < width; i++) {
        for (let j = 0; j < height; j++) {
          for (let k = 0; k < ncpp; k++) {
            merged.set(i, j, ncppoffset + k, img.get(i, j, k));
          }
        }
      }
      ncppoffset += ncpp;
    });
    this._output[0] = new Image2D();
    this._output[0].setData(merged.data, width, height, totalncpp);
  }
}

function unique_pred(list, compare) {
  var ptr = 1
    , len = list.length
    , a=list[0], b=list[0];
  for(var i=1; i<len; ++i) {
    b = a;
    a = list[i];
    if(compare(a, b)) {
      if(i === ptr) {
        ptr++;
        continue
      }
      list[ptr++] = a;
    }
  }
  list.length = ptr;
  return list
}

function unique_eq(list) {
  var ptr = 1
    , len = list.length
    , a=list[0], b = list[0];
  for(var i=1; i<len; ++i, b=a) {
    b = a;
    a = list[i];
    if(a !== b) {
      if(i === ptr) {
        ptr++;
        continue
      }
      list[ptr++] = a;
    }
  }
  list.length = ptr;
  return list
}

function unique(list, compare, sorted) {
  if(list.length === 0) {
    return list
  }
  if(compare) {
    if(!sorted) {
      list.sort(compare);
    }
    return unique_pred(list, compare)
  }
  if(!sorted) {
    list.sort();
  }
  return unique_eq(list)
}

var uniq = unique;

// This function generates very simple loops analogous to how you typically traverse arrays (the outermost loop corresponds to the slowest changing index, the innermost loop to the fastest changing index)
// TODO: If two arrays have the same strides (and offsets) there is potential for decreasing the number of "pointers" and related variables. The drawback is that the type signature would become more specific and that there would thus be less potential for caching, but it might still be worth it, especially when dealing with large numbers of arguments.
function innerFill(order, proc, body) {
  var dimension = order.length
    , nargs = proc.arrayArgs.length
    , has_index = proc.indexArgs.length>0
    , code = []
    , vars = []
    , idx=0, pidx=0, i, j;
  for(i=0; i<dimension; ++i) { // Iteration variables
    vars.push(["i",i,"=0"].join(""));
  }
  //Compute scan deltas
  for(j=0; j<nargs; ++j) {
    for(i=0; i<dimension; ++i) {
      pidx = idx;
      idx = order[i];
      if(i === 0) { // The innermost/fastest dimension's delta is simply its stride
        vars.push(["d",j,"s",i,"=t",j,"p",idx].join(""));
      } else { // For other dimensions the delta is basically the stride minus something which essentially "rewinds" the previous (more inner) dimension
        vars.push(["d",j,"s",i,"=(t",j,"p",idx,"-s",pidx,"*t",j,"p",pidx,")"].join(""));
      }
    }
  }
  if (vars.length > 0) {
    code.push("var " + vars.join(","));
  }  
  //Scan loop
  for(i=dimension-1; i>=0; --i) { // Start at largest stride and work your way inwards
    idx = order[i];
    code.push(["for(i",i,"=0;i",i,"<s",idx,";++i",i,"){"].join(""));
  }
  //Push body of inner loop
  code.push(body);
  //Advance scan pointers
  for(i=0; i<dimension; ++i) {
    pidx = idx;
    idx = order[i];
    for(j=0; j<nargs; ++j) {
      code.push(["p",j,"+=d",j,"s",i].join(""));
    }
    if(has_index) {
      if(i > 0) {
        code.push(["index[",pidx,"]-=s",pidx].join(""));
      }
      code.push(["++index[",idx,"]"].join(""));
    }
    code.push("}");
  }
  return code.join("\n")
}

// Generate "outer" loops that loop over blocks of data, applying "inner" loops to the blocks by manipulating the local variables in such a way that the inner loop only "sees" the current block.
// TODO: If this is used, then the previous declaration (done by generateCwiseOp) of s* is essentially unnecessary.
//       I believe the s* are not used elsewhere (in particular, I don't think they're used in the pre/post parts and "shape" is defined independently), so it would be possible to make defining the s* dependent on what loop method is being used.
function outerFill(matched, order, proc, body) {
  var dimension = order.length
    , nargs = proc.arrayArgs.length
    , blockSize = proc.blockSize
    , has_index = proc.indexArgs.length > 0
    , code = [];
  for(var i=0; i<nargs; ++i) {
    code.push(["var offset",i,"=p",i].join(""));
  }
  //Generate loops for unmatched dimensions
  // The order in which these dimensions are traversed is fairly arbitrary (from small stride to large stride, for the first argument)
  // TODO: It would be nice if the order in which these loops are placed would also be somehow "optimal" (at the very least we should check that it really doesn't hurt us if they're not).
  for(var i=matched; i<dimension; ++i) {
    code.push(["for(var j"+i+"=SS[", order[i], "]|0;j", i, ">0;){"].join("")); // Iterate back to front
    code.push(["if(j",i,"<",blockSize,"){"].join("")); // Either decrease j by blockSize (s = blockSize), or set it to zero (after setting s = j).
    code.push(["s",order[i],"=j",i].join(""));
    code.push(["j",i,"=0"].join(""));
    code.push(["}else{s",order[i],"=",blockSize].join(""));
    code.push(["j",i,"-=",blockSize,"}"].join(""));
    if(has_index) {
      code.push(["index[",order[i],"]=j",i].join(""));
    }
  }
  for(var i=0; i<nargs; ++i) {
    var indexStr = ["offset"+i];
    for(var j=matched; j<dimension; ++j) {
      indexStr.push(["j",j,"*t",i,"p",order[j]].join(""));
    }
    code.push(["p",i,"=(",indexStr.join("+"),")"].join(""));
  }
  code.push(innerFill(order, proc, body));
  for(var i=matched; i<dimension; ++i) {
    code.push("}");
  }
  return code.join("\n")
}

//Count the number of compatible inner orders
// This is the length of the longest common prefix of the arrays in orders.
// Each array in orders lists the dimensions of the correspond ndarray in order of increasing stride.
// This is thus the maximum number of dimensions that can be efficiently traversed by simple nested loops for all arrays.
function countMatches(orders) {
  var matched = 0, dimension = orders[0].length;
  while(matched < dimension) {
    for(var j=1; j<orders.length; ++j) {
      if(orders[j][matched] !== orders[0][matched]) {
        return matched
      }
    }
    ++matched;
  }
  return matched
}

//Processes a block according to the given data types
// Replaces variable names by different ones, either "local" ones (that are then ferried in and out of the given array) or ones matching the arguments that the function performing the ultimate loop will accept.
function processBlock(block, proc, dtypes) {
  var code = block.body;
  var pre = [];
  var post = [];
  for(var i=0; i<block.args.length; ++i) {
    var carg = block.args[i];
    if(carg.count <= 0) {
      continue
    }
    var re = new RegExp(carg.name, "g");
    var ptrStr = "";
    var arrNum = proc.arrayArgs.indexOf(i);
    switch(proc.argTypes[i]) {
      case "offset":
        var offArgIndex = proc.offsetArgIndex.indexOf(i);
        var offArg = proc.offsetArgs[offArgIndex];
        arrNum = offArg.array;
        ptrStr = "+q" + offArgIndex; // Adds offset to the "pointer" in the array
      case "array":
        ptrStr = "p" + arrNum + ptrStr;
        var localStr = "l" + i;
        var arrStr = "a" + arrNum;
        if (proc.arrayBlockIndices[arrNum] === 0) { // Argument to body is just a single value from this array
          if(carg.count === 1) { // Argument/array used only once(?)
            if(dtypes[arrNum] === "generic") {
              if(carg.lvalue) {
                pre.push(["var ", localStr, "=", arrStr, ".get(", ptrStr, ")"].join("")); // Is this necessary if the argument is ONLY used as an lvalue? (keep in mind that we can have a += something, so we would actually need to check carg.rvalue)
                code = code.replace(re, localStr);
                post.push([arrStr, ".set(", ptrStr, ",", localStr,")"].join(""));
              } else {
                code = code.replace(re, [arrStr, ".get(", ptrStr, ")"].join(""));
              }
            } else {
              code = code.replace(re, [arrStr, "[", ptrStr, "]"].join(""));
            }
          } else if(dtypes[arrNum] === "generic") {
            pre.push(["var ", localStr, "=", arrStr, ".get(", ptrStr, ")"].join("")); // TODO: Could we optimize by checking for carg.rvalue?
            code = code.replace(re, localStr);
            if(carg.lvalue) {
              post.push([arrStr, ".set(", ptrStr, ",", localStr,")"].join(""));
            }
          } else {
            pre.push(["var ", localStr, "=", arrStr, "[", ptrStr, "]"].join("")); // TODO: Could we optimize by checking for carg.rvalue?
            code = code.replace(re, localStr);
            if(carg.lvalue) {
              post.push([arrStr, "[", ptrStr, "]=", localStr].join(""));
            }
          }
        } else { // Argument to body is a "block"
          var reStrArr = [carg.name], ptrStrArr = [ptrStr];
          for(var j=0; j<Math.abs(proc.arrayBlockIndices[arrNum]); j++) {
            reStrArr.push("\\s*\\[([^\\]]+)\\]");
            ptrStrArr.push("$" + (j+1) + "*t" + arrNum + "b" + j); // Matched index times stride
          }
          re = new RegExp(reStrArr.join(""), "g");
          ptrStr = ptrStrArr.join("+");
          if(dtypes[arrNum] === "generic") {
            /*if(carg.lvalue) {
              pre.push(["var ", localStr, "=", arrStr, ".get(", ptrStr, ")"].join("")) // Is this necessary if the argument is ONLY used as an lvalue? (keep in mind that we can have a += something, so we would actually need to check carg.rvalue)
              code = code.replace(re, localStr)
              post.push([arrStr, ".set(", ptrStr, ",", localStr,")"].join(""))
            } else {
              code = code.replace(re, [arrStr, ".get(", ptrStr, ")"].join(""))
            }*/
            throw new Error("cwise: Generic arrays not supported in combination with blocks!")
          } else {
            // This does not produce any local variables, even if variables are used multiple times. It would be possible to do so, but it would complicate things quite a bit.
            code = code.replace(re, [arrStr, "[", ptrStr, "]"].join(""));
          }
        }
      break
      case "scalar":
        code = code.replace(re, "Y" + proc.scalarArgs.indexOf(i));
      break
      case "index":
        code = code.replace(re, "index");
      break
      case "shape":
        code = code.replace(re, "shape");
      break
    }
  }
  return [pre.join("\n"), code, post.join("\n")].join("\n").trim()
}

function typeSummary(dtypes) {
  var summary = new Array(dtypes.length);
  var allEqual = true;
  for(var i=0; i<dtypes.length; ++i) {
    var t = dtypes[i];
    var digits = t.match(/\d+/);
    if(!digits) {
      digits = "";
    } else {
      digits = digits[0];
    }
    if(t.charAt(0) === 0) {
      summary[i] = "u" + t.charAt(1) + digits;
    } else {
      summary[i] = t.charAt(0) + digits;
    }
    if(i > 0) {
      allEqual = allEqual && summary[i] === summary[i-1];
    }
  }
  if(allEqual) {
    return summary[0]
  }
  return summary.join("")
}

//Generates a cwise operator
function generateCWiseOp(proc, typesig) {

  //Compute dimension
  // Arrays get put first in typesig, and there are two entries per array (dtype and order), so this gets the number of dimensions in the first array arg.
  var dimension = (typesig[1].length - Math.abs(proc.arrayBlockIndices[0]))|0;
  var orders = new Array(proc.arrayArgs.length);
  var dtypes = new Array(proc.arrayArgs.length);
  for(var i=0; i<proc.arrayArgs.length; ++i) {
    dtypes[i] = typesig[2*i];
    orders[i] = typesig[2*i+1];
  }
  
  //Determine where block and loop indices start and end
  var blockBegin = [], blockEnd = []; // These indices are exposed as blocks
  var loopBegin = [], loopEnd = []; // These indices are iterated over
  var loopOrders = []; // orders restricted to the loop indices
  for(var i=0; i<proc.arrayArgs.length; ++i) {
    if (proc.arrayBlockIndices[i]<0) {
      loopBegin.push(0);
      loopEnd.push(dimension);
      blockBegin.push(dimension);
      blockEnd.push(dimension+proc.arrayBlockIndices[i]);
    } else {
      loopBegin.push(proc.arrayBlockIndices[i]); // Non-negative
      loopEnd.push(proc.arrayBlockIndices[i]+dimension);
      blockBegin.push(0);
      blockEnd.push(proc.arrayBlockIndices[i]);
    }
    var newOrder = [];
    for(var j=0; j<orders[i].length; j++) {
      if (loopBegin[i]<=orders[i][j] && orders[i][j]<loopEnd[i]) {
        newOrder.push(orders[i][j]-loopBegin[i]); // If this is a loop index, put it in newOrder, subtracting loopBegin, to make sure that all loopOrders are using a common set of indices.
      }
    }
    loopOrders.push(newOrder);
  }

  //First create arguments for procedure
  var arglist = ["SS"]; // SS is the overall shape over which we iterate
  var code = ["'use strict'"];
  var vars = [];
  
  for(var j=0; j<dimension; ++j) {
    vars.push(["s", j, "=SS[", j, "]"].join("")); // The limits for each dimension.
  }
  for(var i=0; i<proc.arrayArgs.length; ++i) {
    arglist.push("a"+i); // Actual data array
    arglist.push("t"+i); // Strides
    arglist.push("p"+i); // Offset in the array at which the data starts (also used for iterating over the data)
    
    for(var j=0; j<dimension; ++j) { // Unpack the strides into vars for looping
      vars.push(["t",i,"p",j,"=t",i,"[",loopBegin[i]+j,"]"].join(""));
    }
    
    for(var j=0; j<Math.abs(proc.arrayBlockIndices[i]); ++j) { // Unpack the strides into vars for block iteration
      vars.push(["t",i,"b",j,"=t",i,"[",blockBegin[i]+j,"]"].join(""));
    }
  }
  for(var i=0; i<proc.scalarArgs.length; ++i) {
    arglist.push("Y" + i);
  }
  if(proc.shapeArgs.length > 0) {
    vars.push("shape=SS.slice(0)"); // Makes the shape over which we iterate available to the user defined functions (so you can use width/height for example)
  }
  if(proc.indexArgs.length > 0) {
    // Prepare an array to keep track of the (logical) indices, initialized to dimension zeroes.
    var zeros = new Array(dimension);
    for(var i=0; i<dimension; ++i) {
      zeros[i] = "0";
    }
    vars.push(["index=[", zeros.join(","), "]"].join(""));
  }
  for(var i=0; i<proc.offsetArgs.length; ++i) { // Offset arguments used for stencil operations
    var off_arg = proc.offsetArgs[i];
    var init_string = [];
    for(var j=0; j<off_arg.offset.length; ++j) {
      if(off_arg.offset[j] === 0) {
        continue
      } else if(off_arg.offset[j] === 1) {
        init_string.push(["t", off_arg.array, "p", j].join(""));      
      } else {
        init_string.push([off_arg.offset[j], "*t", off_arg.array, "p", j].join(""));
      }
    }
    if(init_string.length === 0) {
      vars.push("q" + i + "=0");
    } else {
      vars.push(["q", i, "=", init_string.join("+")].join(""));
    }
  }

  //Prepare this variables
  var thisVars = uniq([].concat(proc.pre.thisVars)
                      .concat(proc.body.thisVars)
                      .concat(proc.post.thisVars));
  vars = vars.concat(thisVars);
  if (vars.length > 0) {
    code.push("var " + vars.join(","));
  }
  for(var i=0; i<proc.arrayArgs.length; ++i) {
    code.push("p"+i+"|=0");
  }
  
  //Inline prelude
  if(proc.pre.body.length > 3) {
    code.push(processBlock(proc.pre, proc, dtypes));
  }

  //Process body
  var body = processBlock(proc.body, proc, dtypes);
  var matched = countMatches(loopOrders);
  if(matched < dimension) {
    code.push(outerFill(matched, loopOrders[0], proc, body)); // TODO: Rather than passing loopOrders[0], it might be interesting to look at passing an order that represents the majority of the arguments for example.
  } else {
    code.push(innerFill(loopOrders[0], proc, body));
  }

  //Inline epilog
  if(proc.post.body.length > 3) {
    code.push(processBlock(proc.post, proc, dtypes));
  }
  
  if(proc.debug) {
    console.log("-----Generated cwise routine for ", typesig, ":\n" + code.join("\n") + "\n----------");
  }
  
  var loopName = [(proc.funcName||"unnamed"), "_cwise_loop_", orders[0].join("s"),"m",matched,typeSummary(dtypes)].join("");
  var f = new Function(["function ",loopName,"(", arglist.join(","),"){", code.join("\n"),"} return ", loopName].join(""));
  return f()
}
var compile = generateCWiseOp;

// The function below is called when constructing a cwise function object, and does the following:
// A function object is constructed which accepts as argument a compilation function and returns another function.
// It is this other function that is eventually returned by createThunk, and this function is the one that actually
// checks whether a certain pattern of arguments has already been used before and compiles new loops as needed.
// The compilation passed to the first function object is used for compiling new functions.
// Once this function object is created, it is called with compile as argument, where the first argument of compile
// is bound to "proc" (essentially containing a preprocessed version of the user arguments to cwise).
// So createThunk roughly works like this:
// function createThunk(proc) {
//   var thunk = function(compileBound) {
//     var CACHED = {}
//     return function(arrays and scalars) {
//       if (dtype and order of arrays in CACHED) {
//         var func = CACHED[dtype and order of arrays]
//       } else {
//         var func = CACHED[dtype and order of arrays] = compileBound(dtype and order of arrays)
//       }
//       return func(arrays and scalars)
//     }
//   }
//   return thunk(compile.bind1(proc))
// }



function createThunk(proc) {
  var code = ["'use strict'", "var CACHED={}"];
  var vars = [];
  var thunkName = proc.funcName + "_cwise_thunk";
  
  //Build thunk
  code.push(["return function ", thunkName, "(", proc.shimArgs.join(","), "){"].join(""));
  var typesig = [];
  var string_typesig = [];
  var proc_args = [["array",proc.arrayArgs[0],".shape.slice(", // Slice shape so that we only retain the shape over which we iterate (which gets passed to the cwise operator as SS).
                    Math.max(0,proc.arrayBlockIndices[0]),proc.arrayBlockIndices[0]<0?(","+proc.arrayBlockIndices[0]+")"):")"].join("")];
  var shapeLengthConditions = [], shapeConditions = [];
  // Process array arguments
  for(var i=0; i<proc.arrayArgs.length; ++i) {
    var j = proc.arrayArgs[i];
    vars.push(["t", j, "=array", j, ".dtype,",
               "r", j, "=array", j, ".order"].join(""));
    typesig.push("t" + j);
    typesig.push("r" + j);
    string_typesig.push("t"+j);
    string_typesig.push("r"+j+".join()");
    proc_args.push("array" + j + ".data");
    proc_args.push("array" + j + ".stride");
    proc_args.push("array" + j + ".offset|0");
    if (i>0) { // Gather conditions to check for shape equality (ignoring block indices)
      shapeLengthConditions.push("array" + proc.arrayArgs[0] + ".shape.length===array" + j + ".shape.length+" + (Math.abs(proc.arrayBlockIndices[0])-Math.abs(proc.arrayBlockIndices[i])));
      shapeConditions.push("array" + proc.arrayArgs[0] + ".shape[shapeIndex+" + Math.max(0,proc.arrayBlockIndices[0]) + "]===array" + j + ".shape[shapeIndex+" + Math.max(0,proc.arrayBlockIndices[i]) + "]");
    }
  }
  // Check for shape equality
  if (proc.arrayArgs.length > 1) {
    code.push("if (!(" + shapeLengthConditions.join(" && ") + ")) throw new Error('cwise: Arrays do not all have the same dimensionality!')");
    code.push("for(var shapeIndex=array" + proc.arrayArgs[0] + ".shape.length-" + Math.abs(proc.arrayBlockIndices[0]) + "; shapeIndex-->0;) {");
    code.push("if (!(" + shapeConditions.join(" && ") + ")) throw new Error('cwise: Arrays do not all have the same shape!')");
    code.push("}");
  }
  // Process scalar arguments
  for(var i=0; i<proc.scalarArgs.length; ++i) {
    proc_args.push("scalar" + proc.scalarArgs[i]);
  }
  // Check for cached function (and if not present, generate it)
  vars.push(["type=[", string_typesig.join(","), "].join()"].join(""));
  vars.push("proc=CACHED[type]");
  code.push("var " + vars.join(","));
  
  code.push(["if(!proc){",
             "CACHED[type]=proc=compile([", typesig.join(","), "])}",
             "return proc(", proc_args.join(","), ")}"].join(""));

  if(proc.debug) {
    console.log("-----Generated thunk:\n" + code.join("\n") + "\n----------");
  }
  
  //Compile thunk
  var thunk = new Function("compile", code.join("\n"));
  return thunk(compile.bind(undefined, proc))
}

var thunk = createThunk;

function Procedure() {
  this.argTypes = [];
  this.shimArgs = [];
  this.arrayArgs = [];
  this.arrayBlockIndices = [];
  this.scalarArgs = [];
  this.offsetArgs = [];
  this.offsetArgIndex = [];
  this.indexArgs = [];
  this.shapeArgs = [];
  this.funcName = "";
  this.pre = null;
  this.body = null;
  this.post = null;
  this.debug = false;
}

function compileCwise(user_args) {
  //Create procedure
  var proc = new Procedure();
  
  //Parse blocks
  proc.pre    = user_args.pre;
  proc.body   = user_args.body;
  proc.post   = user_args.post;

  //Parse arguments
  var proc_args = user_args.args.slice(0);
  proc.argTypes = proc_args;
  for(var i=0; i<proc_args.length; ++i) {
    var arg_type = proc_args[i];
    if(arg_type === "array" || (typeof arg_type === "object" && arg_type.blockIndices)) {
      proc.argTypes[i] = "array";
      proc.arrayArgs.push(i);
      proc.arrayBlockIndices.push(arg_type.blockIndices ? arg_type.blockIndices : 0);
      proc.shimArgs.push("array" + i);
      if(i < proc.pre.args.length && proc.pre.args[i].count>0) {
        throw new Error("cwise: pre() block may not reference array args")
      }
      if(i < proc.post.args.length && proc.post.args[i].count>0) {
        throw new Error("cwise: post() block may not reference array args")
      }
    } else if(arg_type === "scalar") {
      proc.scalarArgs.push(i);
      proc.shimArgs.push("scalar" + i);
    } else if(arg_type === "index") {
      proc.indexArgs.push(i);
      if(i < proc.pre.args.length && proc.pre.args[i].count > 0) {
        throw new Error("cwise: pre() block may not reference array index")
      }
      if(i < proc.body.args.length && proc.body.args[i].lvalue) {
        throw new Error("cwise: body() block may not write to array index")
      }
      if(i < proc.post.args.length && proc.post.args[i].count > 0) {
        throw new Error("cwise: post() block may not reference array index")
      }
    } else if(arg_type === "shape") {
      proc.shapeArgs.push(i);
      if(i < proc.pre.args.length && proc.pre.args[i].lvalue) {
        throw new Error("cwise: pre() block may not write to array shape")
      }
      if(i < proc.body.args.length && proc.body.args[i].lvalue) {
        throw new Error("cwise: body() block may not write to array shape")
      }
      if(i < proc.post.args.length && proc.post.args[i].lvalue) {
        throw new Error("cwise: post() block may not write to array shape")
      }
    } else if(typeof arg_type === "object" && arg_type.offset) {
      proc.argTypes[i] = "offset";
      proc.offsetArgs.push({ array: arg_type.array, offset:arg_type.offset });
      proc.offsetArgIndex.push(i);
    } else {
      throw new Error("cwise: Unknown argument type " + proc_args[i])
    }
  }
  
  //Make sure at least one array argument was specified
  if(proc.arrayArgs.length <= 0) {
    throw new Error("cwise: No array arguments specified")
  }
  
  //Make sure arguments are correct
  if(proc.pre.args.length > proc_args.length) {
    throw new Error("cwise: Too many arguments in pre() block")
  }
  if(proc.body.args.length > proc_args.length) {
    throw new Error("cwise: Too many arguments in body() block")
  }
  if(proc.post.args.length > proc_args.length) {
    throw new Error("cwise: Too many arguments in post() block")
  }

  //Check debug flag
  proc.debug = !!user_args.printCode || !!user_args.debug;
  
  //Retrieve name
  proc.funcName = user_args.funcName || "cwise";
  
  //Read in block size
  proc.blockSize = user_args.blockSize || 64;

  return thunk(proc)
}

var compiler = compileCwise;

var ndarrayOps = createCommonjsModule(function (module, exports) {
"use strict";



var EmptyProc = {
  body: "",
  args: [],
  thisVars: [],
  localVars: []
};

function fixup(x) {
  if(!x) {
    return EmptyProc
  }
  for(var i=0; i<x.args.length; ++i) {
    var a = x.args[i];
    if(i === 0) {
      x.args[i] = {name: a, lvalue:true, rvalue: !!x.rvalue, count:x.count||1 };
    } else {
      x.args[i] = {name: a, lvalue:false, rvalue:true, count: 1};
    }
  }
  if(!x.thisVars) {
    x.thisVars = [];
  }
  if(!x.localVars) {
    x.localVars = [];
  }
  return x
}

function pcompile(user_args) {
  return compiler({
    args:     user_args.args,
    pre:      fixup(user_args.pre),
    body:     fixup(user_args.body),
    post:     fixup(user_args.proc),
    funcName: user_args.funcName
  })
}

function makeOp(user_args) {
  var args = [];
  for(var i=0; i<user_args.args.length; ++i) {
    args.push("a"+i);
  }
  var wrapper = new Function("P", [
    "return function ", user_args.funcName, "_ndarrayops(", args.join(","), ") {P(", args.join(","), ");return a0}"
  ].join(""));
  return wrapper(pcompile(user_args))
}

var assign_ops = {
  add:  "+",
  sub:  "-",
  mul:  "*",
  div:  "/",
  mod:  "%",
  band: "&",
  bor:  "|",
  bxor: "^",
  lshift: "<<",
  rshift: ">>",
  rrshift: ">>>"
};(function(){
  for(var id in assign_ops) {
    var op = assign_ops[id];
    exports[id] = makeOp({
      args: ["array","array","array"],
      body: {args:["a","b","c"],
             body: "a=b"+op+"c"},
      funcName: id
    });
    exports[id+"eq"] = makeOp({
      args: ["array","array"],
      body: {args:["a","b"],
             body:"a"+op+"=b"},
      rvalue: true,
      funcName: id+"eq"
    });
    exports[id+"s"] = makeOp({
      args: ["array", "array", "scalar"],
      body: {args:["a","b","s"],
             body:"a=b"+op+"s"},
      funcName: id+"s"
    });
    exports[id+"seq"] = makeOp({
      args: ["array","scalar"],
      body: {args:["a","s"],
             body:"a"+op+"=s"},
      rvalue: true,
      funcName: id+"seq"
    });
  }
})();

var unary_ops = {
  not: "!",
  bnot: "~",
  neg: "-",
  recip: "1.0/"
};(function(){
  for(var id in unary_ops) {
    var op = unary_ops[id];
    exports[id] = makeOp({
      args: ["array", "array"],
      body: {args:["a","b"],
             body:"a="+op+"b"},
      funcName: id
    });
    exports[id+"eq"] = makeOp({
      args: ["array"],
      body: {args:["a"],
             body:"a="+op+"a"},
      rvalue: true,
      count: 2,
      funcName: id+"eq"
    });
  }
})();

var binary_ops = {
  and: "&&",
  or: "||",
  eq: "===",
  neq: "!==",
  lt: "<",
  gt: ">",
  leq: "<=",
  geq: ">="
};(function() {
  for(var id in binary_ops) {
    var op = binary_ops[id];
    exports[id] = makeOp({
      args: ["array","array","array"],
      body: {args:["a", "b", "c"],
             body:"a=b"+op+"c"},
      funcName: id
    });
    exports[id+"s"] = makeOp({
      args: ["array","array","scalar"],
      body: {args:["a", "b", "s"],
             body:"a=b"+op+"s"},
      funcName: id+"s"
    });
    exports[id+"eq"] = makeOp({
      args: ["array", "array"],
      body: {args:["a", "b"],
             body:"a=a"+op+"b"},
      rvalue:true,
      count:2,
      funcName: id+"eq"
    });
    exports[id+"seq"] = makeOp({
      args: ["array", "scalar"],
      body: {args:["a","s"],
             body:"a=a"+op+"s"},
      rvalue:true,
      count:2,
      funcName: id+"seq"
    });
  }
})();

var math_unary = [
  "abs",
  "acos",
  "asin",
  "atan",
  "ceil",
  "cos",
  "exp",
  "floor",
  "log",
  "round",
  "sin",
  "sqrt",
  "tan"
];(function() {
  for(var i=0; i<math_unary.length; ++i) {
    var f = math_unary[i];
    exports[f] = makeOp({
                    args: ["array", "array"],
                    pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                    body: {args:["a","b"], body:"a=this_f(b)", thisVars:["this_f"]},
                    funcName: f
                  });
    exports[f+"eq"] = makeOp({
                      args: ["array"],
                      pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                      body: {args: ["a"], body:"a=this_f(a)", thisVars:["this_f"]},
                      rvalue: true,
                      count: 2,
                      funcName: f+"eq"
                    });
  }
})();

var math_comm = [
  "max",
  "min",
  "atan2",
  "pow"
];(function(){
  for(var i=0; i<math_comm.length; ++i) {
    var f= math_comm[i];
    exports[f] = makeOp({
                  args:["array", "array", "array"],
                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                  body: {args:["a","b","c"], body:"a=this_f(b,c)", thisVars:["this_f"]},
                  funcName: f
                });
    exports[f+"s"] = makeOp({
                  args:["array", "array", "scalar"],
                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                  body: {args:["a","b","c"], body:"a=this_f(b,c)", thisVars:["this_f"]},
                  funcName: f+"s"
                  });
    exports[f+"eq"] = makeOp({ args:["array", "array"],
                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                  body: {args:["a","b"], body:"a=this_f(a,b)", thisVars:["this_f"]},
                  rvalue: true,
                  count: 2,
                  funcName: f+"eq"
                  });
    exports[f+"seq"] = makeOp({ args:["array", "scalar"],
                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                  body: {args:["a","b"], body:"a=this_f(a,b)", thisVars:["this_f"]},
                  rvalue:true,
                  count:2,
                  funcName: f+"seq"
                  });
  }
})();

var math_noncomm = [
  "atan2",
  "pow"
];(function(){
  for(var i=0; i<math_noncomm.length; ++i) {
    var f= math_noncomm[i];
    exports[f+"op"] = makeOp({
                  args:["array", "array", "array"],
                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                  body: {args:["a","b","c"], body:"a=this_f(c,b)", thisVars:["this_f"]},
                  funcName: f+"op"
                });
    exports[f+"ops"] = makeOp({
                  args:["array", "array", "scalar"],
                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                  body: {args:["a","b","c"], body:"a=this_f(c,b)", thisVars:["this_f"]},
                  funcName: f+"ops"
                  });
    exports[f+"opeq"] = makeOp({ args:["array", "array"],
                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                  body: {args:["a","b"], body:"a=this_f(b,a)", thisVars:["this_f"]},
                  rvalue: true,
                  count: 2,
                  funcName: f+"opeq"
                  });
    exports[f+"opseq"] = makeOp({ args:["array", "scalar"],
                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                  body: {args:["a","b"], body:"a=this_f(b,a)", thisVars:["this_f"]},
                  rvalue:true,
                  count:2,
                  funcName: f+"opseq"
                  });
  }
})();

exports.any = compiler({
  args:["array"],
  pre: EmptyProc,
  body: {args:[{name:"a", lvalue:false, rvalue:true, count:1}], body: "if(a){return true}", localVars: [], thisVars: []},
  post: {args:[], localVars:[], thisVars:[], body:"return false"},
  funcName: "any"
});

exports.all = compiler({
  args:["array"],
  pre: EmptyProc,
  body: {args:[{name:"x", lvalue:false, rvalue:true, count:1}], body: "if(!x){return false}", localVars: [], thisVars: []},
  post: {args:[], localVars:[], thisVars:[], body:"return true"},
  funcName: "all"
});

exports.sum = compiler({
  args:["array"],
  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=0"},
  body: {args:[{name:"a", lvalue:false, rvalue:true, count:1}], body: "this_s+=a", localVars: [], thisVars: ["this_s"]},
  post: {args:[], localVars:[], thisVars:["this_s"], body:"return this_s"},
  funcName: "sum"
});

exports.prod = compiler({
  args:["array"],
  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=1"},
  body: {args:[{name:"a", lvalue:false, rvalue:true, count:1}], body: "this_s*=a", localVars: [], thisVars: ["this_s"]},
  post: {args:[], localVars:[], thisVars:["this_s"], body:"return this_s"},
  funcName: "prod"
});

exports.norm2squared = compiler({
  args:["array"],
  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=0"},
  body: {args:[{name:"a", lvalue:false, rvalue:true, count:2}], body: "this_s+=a*a", localVars: [], thisVars: ["this_s"]},
  post: {args:[], localVars:[], thisVars:["this_s"], body:"return this_s"},
  funcName: "norm2squared"
});
  
exports.norm2 = compiler({
  args:["array"],
  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=0"},
  body: {args:[{name:"a", lvalue:false, rvalue:true, count:2}], body: "this_s+=a*a", localVars: [], thisVars: ["this_s"]},
  post: {args:[], localVars:[], thisVars:["this_s"], body:"return Math.sqrt(this_s)"},
  funcName: "norm2"
});
  

exports.norminf = compiler({
  args:["array"],
  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=0"},
  body: {args:[{name:"a", lvalue:false, rvalue:true, count:4}], body:"if(-a>this_s){this_s=-a}else if(a>this_s){this_s=a}", localVars: [], thisVars: ["this_s"]},
  post: {args:[], localVars:[], thisVars:["this_s"], body:"return this_s"},
  funcName: "norminf"
});

exports.norm1 = compiler({
  args:["array"],
  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=0"},
  body: {args:[{name:"a", lvalue:false, rvalue:true, count:3}], body: "this_s+=a<0?-a:a", localVars: [], thisVars: ["this_s"]},
  post: {args:[], localVars:[], thisVars:["this_s"], body:"return this_s"},
  funcName: "norm1"
});

exports.sup = compiler({
  args: [ "array" ],
  pre:
   { body: "this_h=-Infinity",
     args: [],
     thisVars: [ "this_h" ],
     localVars: [] },
  body:
   { body: "if(_inline_1_arg0_>this_h)this_h=_inline_1_arg0_",
     args: [{"name":"_inline_1_arg0_","lvalue":false,"rvalue":true,"count":2} ],
     thisVars: [ "this_h" ],
     localVars: [] },
  post:
   { body: "return this_h",
     args: [],
     thisVars: [ "this_h" ],
     localVars: [] }
 });

exports.inf = compiler({
  args: [ "array" ],
  pre:
   { body: "this_h=Infinity",
     args: [],
     thisVars: [ "this_h" ],
     localVars: [] },
  body:
   { body: "if(_inline_1_arg0_<this_h)this_h=_inline_1_arg0_",
     args: [{"name":"_inline_1_arg0_","lvalue":false,"rvalue":true,"count":2} ],
     thisVars: [ "this_h" ],
     localVars: [] },
  post:
   { body: "return this_h",
     args: [],
     thisVars: [ "this_h" ],
     localVars: [] }
 });

exports.argmin = compiler({
  args:["index","array","shape"],
  pre:{
    body:"{this_v=Infinity;this_i=_inline_0_arg2_.slice(0)}",
    args:[
      {name:"_inline_0_arg0_",lvalue:false,rvalue:false,count:0},
      {name:"_inline_0_arg1_",lvalue:false,rvalue:false,count:0},
      {name:"_inline_0_arg2_",lvalue:false,rvalue:true,count:1}
      ],
    thisVars:["this_i","this_v"],
    localVars:[]},
  body:{
    body:"{if(_inline_1_arg1_<this_v){this_v=_inline_1_arg1_;for(var _inline_1_k=0;_inline_1_k<_inline_1_arg0_.length;++_inline_1_k){this_i[_inline_1_k]=_inline_1_arg0_[_inline_1_k]}}}",
    args:[
      {name:"_inline_1_arg0_",lvalue:false,rvalue:true,count:2},
      {name:"_inline_1_arg1_",lvalue:false,rvalue:true,count:2}],
    thisVars:["this_i","this_v"],
    localVars:["_inline_1_k"]},
  post:{
    body:"{return this_i}",
    args:[],
    thisVars:["this_i"],
    localVars:[]}
});

exports.argmax = compiler({
  args:["index","array","shape"],
  pre:{
    body:"{this_v=-Infinity;this_i=_inline_0_arg2_.slice(0)}",
    args:[
      {name:"_inline_0_arg0_",lvalue:false,rvalue:false,count:0},
      {name:"_inline_0_arg1_",lvalue:false,rvalue:false,count:0},
      {name:"_inline_0_arg2_",lvalue:false,rvalue:true,count:1}
      ],
    thisVars:["this_i","this_v"],
    localVars:[]},
  body:{
    body:"{if(_inline_1_arg1_>this_v){this_v=_inline_1_arg1_;for(var _inline_1_k=0;_inline_1_k<_inline_1_arg0_.length;++_inline_1_k){this_i[_inline_1_k]=_inline_1_arg0_[_inline_1_k]}}}",
    args:[
      {name:"_inline_1_arg0_",lvalue:false,rvalue:true,count:2},
      {name:"_inline_1_arg1_",lvalue:false,rvalue:true,count:2}],
    thisVars:["this_i","this_v"],
    localVars:["_inline_1_k"]},
  post:{
    body:"{return this_i}",
    args:[],
    thisVars:["this_i"],
    localVars:[]}
});  

exports.random = makeOp({
  args: ["array"],
  pre: {args:[], body:"this_f=Math.random", thisVars:["this_f"]},
  body: {args: ["a"], body:"a=this_f()", thisVars:["this_f"]},
  funcName: "random"
});

exports.assign = makeOp({
  args:["array", "array"],
  body: {args:["a", "b"], body:"a=b"},
  funcName: "assign" });

exports.assigns = makeOp({
  args:["array", "scalar"],
  body: {args:["a", "b"], body:"a=b"},
  funcName: "assigns" });


exports.equals = compiler({
  args:["array", "array"],
  pre: EmptyProc,
  body: {args:[{name:"x", lvalue:false, rvalue:true, count:1},
               {name:"y", lvalue:false, rvalue:true, count:1}], 
        body: "if(x!==y){return false}", 
        localVars: [], 
        thisVars: []},
  post: {args:[], localVars:[], thisVars:[], body:"return true"},
  funcName: "equals"
});
});

/**
 * Bit twiddling hacks for JavaScript.
 *
 * Author: Mikola Lysenko
 *
 * Ported from Stanford bit twiddling hack library:
 *    http://graphics.stanford.edu/~seander/bithacks.html
 */

//Number of bits in an integer
var INT_BITS = 32;

//Constants
var INT_BITS_1  = INT_BITS;
var INT_MAX   =  0x7fffffff;
var INT_MIN   = -1<<(INT_BITS-1);

//Returns -1, 0, +1 depending on sign of x
var sign = function(v) {
  return (v > 0) - (v < 0);
};

//Computes absolute value of integer
var abs = function(v) {
  var mask = v >> (INT_BITS-1);
  return (v ^ mask) - mask;
};

//Computes minimum of integers x and y
var min = function(x, y) {
  return y ^ ((x ^ y) & -(x < y));
};

//Computes maximum of integers x and y
var max = function(x, y) {
  return x ^ ((x ^ y) & -(x < y));
};

//Checks if a number is a power of two
var isPow2 = function(v) {
  return !(v & (v-1)) && (!!v);
};

//Computes log base 2 of v
var log2 = function(v) {
  var r, shift;
  r =     (v > 0xFFFF) << 4; v >>>= r;
  shift = (v > 0xFF  ) << 3; v >>>= shift; r |= shift;
  shift = (v > 0xF   ) << 2; v >>>= shift; r |= shift;
  shift = (v > 0x3   ) << 1; v >>>= shift; r |= shift;
  return r | (v >> 1);
};

//Computes log base 10 of v
var log10 = function(v) {
  return  (v >= 1000000000) ? 9 : (v >= 100000000) ? 8 : (v >= 10000000) ? 7 :
          (v >= 1000000) ? 6 : (v >= 100000) ? 5 : (v >= 10000) ? 4 :
          (v >= 1000) ? 3 : (v >= 100) ? 2 : (v >= 10) ? 1 : 0;
};

//Counts number of bits
var popCount = function(v) {
  v = v - ((v >>> 1) & 0x55555555);
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  return ((v + (v >>> 4) & 0xF0F0F0F) * 0x1010101) >>> 24;
};

//Counts number of trailing zeros
function countTrailingZeros(v) {
  var c = 32;
  v &= -v;
  if (v) c--;
  if (v & 0x0000FFFF) c -= 16;
  if (v & 0x00FF00FF) c -= 8;
  if (v & 0x0F0F0F0F) c -= 4;
  if (v & 0x33333333) c -= 2;
  if (v & 0x55555555) c -= 1;
  return c;
}
var countTrailingZeros_1 = countTrailingZeros;

//Rounds to next power of 2
var nextPow2 = function(v) {
  v += v === 0;
  --v;
  v |= v >>> 1;
  v |= v >>> 2;
  v |= v >>> 4;
  v |= v >>> 8;
  v |= v >>> 16;
  return v + 1;
};

//Rounds down to previous power of 2
var prevPow2 = function(v) {
  v |= v >>> 1;
  v |= v >>> 2;
  v |= v >>> 4;
  v |= v >>> 8;
  v |= v >>> 16;
  return v - (v>>>1);
};

//Computes parity of word
var parity = function(v) {
  v ^= v >>> 16;
  v ^= v >>> 8;
  v ^= v >>> 4;
  v &= 0xf;
  return (0x6996 >>> v) & 1;
};

var REVERSE_TABLE = new Array(256);

(function(tab) {
  for(var i=0; i<256; ++i) {
    var v = i, r = i, s = 7;
    for (v >>>= 1; v; v >>>= 1) {
      r <<= 1;
      r |= v & 1;
      --s;
    }
    tab[i] = (r << s) & 0xff;
  }
})(REVERSE_TABLE);

//Reverse bits in a 32 bit word
var reverse = function(v) {
  return  (REVERSE_TABLE[ v         & 0xff] << 24) |
          (REVERSE_TABLE[(v >>> 8)  & 0xff] << 16) |
          (REVERSE_TABLE[(v >>> 16) & 0xff] << 8)  |
           REVERSE_TABLE[(v >>> 24) & 0xff];
};

//Interleave bits of 2 coordinates with 16 bits.  Useful for fast quadtree codes
var interleave2 = function(x, y) {
  x &= 0xFFFF;
  x = (x | (x << 8)) & 0x00FF00FF;
  x = (x | (x << 4)) & 0x0F0F0F0F;
  x = (x | (x << 2)) & 0x33333333;
  x = (x | (x << 1)) & 0x55555555;

  y &= 0xFFFF;
  y = (y | (y << 8)) & 0x00FF00FF;
  y = (y | (y << 4)) & 0x0F0F0F0F;
  y = (y | (y << 2)) & 0x33333333;
  y = (y | (y << 1)) & 0x55555555;

  return x | (y << 1);
};

//Extracts the nth interleaved component
var deinterleave2 = function(v, n) {
  v = (v >>> n) & 0x55555555;
  v = (v | (v >>> 1))  & 0x33333333;
  v = (v | (v >>> 2))  & 0x0F0F0F0F;
  v = (v | (v >>> 4))  & 0x00FF00FF;
  v = (v | (v >>> 16)) & 0x000FFFF;
  return (v << 16) >> 16;
};


//Interleave bits of 3 coordinates, each with 10 bits.  Useful for fast octree codes
var interleave3 = function(x, y, z) {
  x &= 0x3FF;
  x  = (x | (x<<16)) & 4278190335;
  x  = (x | (x<<8))  & 251719695;
  x  = (x | (x<<4))  & 3272356035;
  x  = (x | (x<<2))  & 1227133513;

  y &= 0x3FF;
  y  = (y | (y<<16)) & 4278190335;
  y  = (y | (y<<8))  & 251719695;
  y  = (y | (y<<4))  & 3272356035;
  y  = (y | (y<<2))  & 1227133513;
  x |= (y << 1);
  
  z &= 0x3FF;
  z  = (z | (z<<16)) & 4278190335;
  z  = (z | (z<<8))  & 251719695;
  z  = (z | (z<<4))  & 3272356035;
  z  = (z | (z<<2))  & 1227133513;
  
  return x | (z << 2);
};

//Extracts nth interleaved component of a 3-tuple
var deinterleave3 = function(v, n) {
  v = (v >>> n)       & 1227133513;
  v = (v | (v>>>2))   & 3272356035;
  v = (v | (v>>>4))   & 251719695;
  v = (v | (v>>>8))   & 4278190335;
  v = (v | (v>>>16))  & 0x3FF;
  return (v<<22)>>22;
};

//Computes next combination in colexicographic order (this is mistakenly called nextPermutation on the bit twiddling hacks page)
var nextCombination = function(v) {
  var t = v | (v - 1);
  return (t + 1) | (((~t & -~t) - 1) >>> (countTrailingZeros(v) + 1));
};

var twiddle = {
	INT_BITS: INT_BITS_1,
	INT_MAX: INT_MAX,
	INT_MIN: INT_MIN,
	sign: sign,
	abs: abs,
	min: min,
	max: max,
	isPow2: isPow2,
	log2: log2,
	log10: log10,
	popCount: popCount,
	countTrailingZeros: countTrailingZeros_1,
	nextPow2: nextPow2,
	prevPow2: prevPow2,
	parity: parity,
	reverse: reverse,
	interleave2: interleave2,
	deinterleave2: deinterleave2,
	interleave3: interleave3,
	deinterleave3: deinterleave3,
	nextCombination: nextCombination
};

function dupe_array(count, value, i) {
  var c = count[i]|0;
  if(c <= 0) {
    return []
  }
  var result = new Array(c), j;
  if(i === count.length-1) {
    for(j=0; j<c; ++j) {
      result[j] = value;
    }
  } else {
    for(j=0; j<c; ++j) {
      result[j] = dupe_array(count, value, i+1);
    }
  }
  return result
}

function dupe_number(count, value) {
  var result, i;
  result = new Array(count);
  for(i=0; i<count; ++i) {
    result[i] = value;
  }
  return result
}

function dupe(count, value) {
  if(typeof value === "undefined") {
    value = 0;
  }
  switch(typeof count) {
    case "number":
      if(count > 0) {
        return dupe_number(count|0, value)
      }
    break
    case "object":
      if(typeof (count.length) === "number") {
        return dupe_array(count, value, 0)
      }
    break
  }
  return []
}

var dup = dupe;

var pool = createCommonjsModule(function (module, exports) {
'use strict';




//Legacy pool support
if(!commonjsGlobal.__TYPEDARRAY_POOL) {
  commonjsGlobal.__TYPEDARRAY_POOL = {
      UINT8   : dup([32, 0])
    , UINT16  : dup([32, 0])
    , UINT32  : dup([32, 0])
    , INT8    : dup([32, 0])
    , INT16   : dup([32, 0])
    , INT32   : dup([32, 0])
    , FLOAT   : dup([32, 0])
    , DOUBLE  : dup([32, 0])
    , DATA    : dup([32, 0])
    , UINT8C  : dup([32, 0])
    , BUFFER  : dup([32, 0])
  };
}

var hasUint8C = (typeof Uint8ClampedArray) !== 'undefined';
var POOL = commonjsGlobal.__TYPEDARRAY_POOL;

//Upgrade pool
if(!POOL.UINT8C) {
  POOL.UINT8C = dup([32, 0]);
}
if(!POOL.BUFFER) {
  POOL.BUFFER = dup([32, 0]);
}

//New technique: Only allocate from ArrayBufferView and Buffer
var DATA    = POOL.DATA
  , BUFFER  = POOL.BUFFER;

exports.free = function free(array) {
  if(isBuffer(array)) {
    BUFFER[twiddle.log2(array.length)].push(array);
  } else {
    if(Object.prototype.toString.call(array) !== '[object ArrayBuffer]') {
      array = array.buffer;
    }
    if(!array) {
      return
    }
    var n = array.length || array.byteLength;
    var log_n = twiddle.log2(n)|0;
    DATA[log_n].push(array);
  }
};

function freeArrayBuffer(buffer) {
  if(!buffer) {
    return
  }
  var n = buffer.length || buffer.byteLength;
  var log_n = twiddle.log2(n);
  DATA[log_n].push(buffer);
}

function freeTypedArray(array) {
  freeArrayBuffer(array.buffer);
}

exports.freeUint8 =
exports.freeUint16 =
exports.freeUint32 =
exports.freeInt8 =
exports.freeInt16 =
exports.freeInt32 =
exports.freeFloat32 = 
exports.freeFloat =
exports.freeFloat64 = 
exports.freeDouble = 
exports.freeUint8Clamped = 
exports.freeDataView = freeTypedArray;

exports.freeArrayBuffer = freeArrayBuffer;

exports.freeBuffer = function freeBuffer(array) {
  BUFFER[twiddle.log2(array.length)].push(array);
};

exports.malloc = function malloc(n, dtype) {
  if(dtype === undefined || dtype === 'arraybuffer') {
    return mallocArrayBuffer(n)
  } else {
    switch(dtype) {
      case 'uint8':
        return mallocUint8(n)
      case 'uint16':
        return mallocUint16(n)
      case 'uint32':
        return mallocUint32(n)
      case 'int8':
        return mallocInt8(n)
      case 'int16':
        return mallocInt16(n)
      case 'int32':
        return mallocInt32(n)
      case 'float':
      case 'float32':
        return mallocFloat(n)
      case 'double':
      case 'float64':
        return mallocDouble(n)
      case 'uint8_clamped':
        return mallocUint8Clamped(n)
      case 'buffer':
        return mallocBuffer(n)
      case 'data':
      case 'dataview':
        return mallocDataView(n)

      default:
        return null
    }
  }
  return null
};

function mallocArrayBuffer(n) {
  var n = twiddle.nextPow2(n);
  var log_n = twiddle.log2(n);
  var d = DATA[log_n];
  if(d.length > 0) {
    return d.pop()
  }
  return new ArrayBuffer(n)
}
exports.mallocArrayBuffer = mallocArrayBuffer;

function mallocUint8(n) {
  return new Uint8Array(mallocArrayBuffer(n), 0, n)
}
exports.mallocUint8 = mallocUint8;

function mallocUint16(n) {
  return new Uint16Array(mallocArrayBuffer(2*n), 0, n)
}
exports.mallocUint16 = mallocUint16;

function mallocUint32(n) {
  return new Uint32Array(mallocArrayBuffer(4*n), 0, n)
}
exports.mallocUint32 = mallocUint32;

function mallocInt8(n) {
  return new Int8Array(mallocArrayBuffer(n), 0, n)
}
exports.mallocInt8 = mallocInt8;

function mallocInt16(n) {
  return new Int16Array(mallocArrayBuffer(2*n), 0, n)
}
exports.mallocInt16 = mallocInt16;

function mallocInt32(n) {
  return new Int32Array(mallocArrayBuffer(4*n), 0, n)
}
exports.mallocInt32 = mallocInt32;

function mallocFloat(n) {
  return new Float32Array(mallocArrayBuffer(4*n), 0, n)
}
exports.mallocFloat32 = exports.mallocFloat = mallocFloat;

function mallocDouble(n) {
  return new Float64Array(mallocArrayBuffer(8*n), 0, n)
}
exports.mallocFloat64 = exports.mallocDouble = mallocDouble;

function mallocUint8Clamped(n) {
  if(hasUint8C) {
    return new Uint8ClampedArray(mallocArrayBuffer(n), 0, n)
  } else {
    return mallocUint8(n)
  }
}
exports.mallocUint8Clamped = mallocUint8Clamped;

function mallocDataView(n) {
  return new DataView(mallocArrayBuffer(n), 0, n)
}
exports.mallocDataView = mallocDataView;

function mallocBuffer(n) {
  n = twiddle.nextPow2(n);
  var log_n = twiddle.log2(n);
  var cache = BUFFER[log_n];
  if(cache.length > 0) {
    return cache.pop()
  }
  return new Buffer(n)
}
exports.mallocBuffer = mallocBuffer;

exports.clearCache = function clearCache() {
  for(var i=0; i<32; ++i) {
    POOL.UINT8[i].length = 0;
    POOL.UINT16[i].length = 0;
    POOL.UINT32[i].length = 0;
    POOL.INT8[i].length = 0;
    POOL.INT16[i].length = 0;
    POOL.INT32[i].length = 0;
    POOL.FLOAT[i].length = 0;
    POOL.DOUBLE[i].length = 0;
    POOL.UINT8C[i].length = 0;
    DATA[i].length = 0;
    BUFFER[i].length = 0;
  }
};
});

function fft$1(dir, nrows, ncols, buffer, x_ptr, y_ptr, scratch_ptr) {
  dir |= 0;
  nrows |= 0;
  ncols |= 0;
  x_ptr |= 0;
  y_ptr |= 0;
  if(twiddle.isPow2(ncols)) {
    fftRadix2(dir, nrows, ncols, buffer, x_ptr, y_ptr);
  } else {
    fftBluestein(dir, nrows, ncols, buffer, x_ptr, y_ptr, scratch_ptr);
  }
}
var fftMatrix = fft$1;

function scratchMemory(n) {
  if(twiddle.isPow2(n)) {
    return 0
  }
  return 2 * n + 4 * twiddle.nextPow2(2*n + 1)
}
var scratchMemory_1 = scratchMemory;


//Radix 2 FFT Adapted from Paul Bourke's C Implementation
function fftRadix2(dir, nrows, ncols, buffer, x_ptr, y_ptr) {
  dir |= 0;
  nrows |= 0;
  ncols |= 0;
  x_ptr |= 0;
  y_ptr |= 0;
  var nn,m,i,i1,j,k,i2,l,l1,l2;
  var c1,c2,t,t1,t2,u1,u2,z,row,a,b,c,d,k1,k2,k3;
  
  // Calculate the number of points
  nn = ncols;
  m = twiddle.log2(nn);
  
  for(row=0; row<nrows; ++row) {  
    // Do the bit reversal
    i2 = nn >> 1;
    j = 0;
    for(i=0;i<nn-1;i++) {
      if(i < j) {
        t = buffer[x_ptr+i];
        buffer[x_ptr+i] = buffer[x_ptr+j];
        buffer[x_ptr+j] = t;
        t = buffer[y_ptr+i];
        buffer[y_ptr+i] = buffer[y_ptr+j];
        buffer[y_ptr+j] = t;
      }
      k = i2;
      while(k <= j) {
        j -= k;
        k >>= 1;
      }
      j += k;
    }
    
    // Compute the FFT
    c1 = -1.0;
    c2 = 0.0;
    l2 = 1;
    for(l=0;l<m;l++) {
      l1 = l2;
      l2 <<= 1;
      u1 = 1.0;
      u2 = 0.0;
      for(j=0;j<l1;j++) {
        for(i=j;i<nn;i+=l2) {
          i1 = i + l1;
          a = buffer[x_ptr+i1];
          b = buffer[y_ptr+i1];
          c = buffer[x_ptr+i];
          d = buffer[y_ptr+i];
          k1 = u1 * (a + b);
          k2 = a * (u2 - u1);
          k3 = b * (u1 + u2);
          t1 = k1 - k3;
          t2 = k1 + k2;
          buffer[x_ptr+i1] = c - t1;
          buffer[y_ptr+i1] = d - t2;
          buffer[x_ptr+i] += t1;
          buffer[y_ptr+i] += t2;
        }
        k1 = c1 * (u1 + u2);
        k2 = u1 * (c2 - c1);
        k3 = u2 * (c1 + c2);
        u1 = k1 - k3;
        u2 = k1 + k2;
      }
      c2 = Math.sqrt((1.0 - c1) / 2.0);
      if(dir < 0) {
        c2 = -c2;
      }
      c1 = Math.sqrt((1.0 + c1) / 2.0);
    }
    
    // Scaling for inverse transform
    if(dir < 0) {
      var scale_f = 1.0 / nn;
      for(i=0;i<nn;i++) {
        buffer[x_ptr+i] *= scale_f;
        buffer[y_ptr+i] *= scale_f;
      }
    }
    
    // Advance pointers
    x_ptr += ncols;
    y_ptr += ncols;
  }
}

// Use Bluestein algorithm for npot FFTs
// Scratch memory required:  2 * ncols + 4 * bits.nextPow2(2*ncols + 1)
function fftBluestein(dir, nrows, ncols, buffer, x_ptr, y_ptr, scratch_ptr) {
  dir |= 0;
  nrows |= 0;
  ncols |= 0;
  x_ptr |= 0;
  y_ptr |= 0;
  scratch_ptr |= 0;

  // Initialize tables
  var m = twiddle.nextPow2(2 * ncols + 1)
    , cos_ptr = scratch_ptr
    , sin_ptr = cos_ptr + ncols
    , xs_ptr  = sin_ptr + ncols
    , ys_ptr  = xs_ptr  + m
    , cft_ptr = ys_ptr  + m
    , sft_ptr = cft_ptr + m
    , w = -dir * Math.PI / ncols
    , row, a, b, c, d, k1, k2, k3
    , i;
  for(i=0; i<ncols; ++i) {
    a = w * ((i * i) % (ncols * 2));
    c = Math.cos(a);
    d = Math.sin(a);
    buffer[cft_ptr+(m-i)] = buffer[cft_ptr+i] = buffer[cos_ptr+i] = c;
    buffer[sft_ptr+(m-i)] = buffer[sft_ptr+i] = buffer[sin_ptr+i] = d;
  }
  for(i=ncols; i<=m-ncols; ++i) {
    buffer[cft_ptr+i] = 0.0;
  }
  for(i=ncols; i<=m-ncols; ++i) {
    buffer[sft_ptr+i] = 0.0;
  }

  fftRadix2(1, 1, m, buffer, cft_ptr, sft_ptr);
  
  //Compute scale factor
  if(dir < 0) {
    w = 1.0 / ncols;
  } else {
    w = 1.0;
  }
  
  //Handle direction
  for(row=0; row<nrows; ++row) {
  
    // Copy row into scratch memory, multiply weights
    for(i=0; i<ncols; ++i) {
      a = buffer[x_ptr+i];
      b = buffer[y_ptr+i];
      c = buffer[cos_ptr+i];
      d = -buffer[sin_ptr+i];
      k1 = c * (a + b);
      k2 = a * (d - c);
      k3 = b * (c + d);
      buffer[xs_ptr+i] = k1 - k3;
      buffer[ys_ptr+i] = k1 + k2;
    }
    //Zero out the rest
    for(i=ncols; i<m; ++i) {
      buffer[xs_ptr+i] = 0.0;
    }
    for(i=ncols; i<m; ++i) {
      buffer[ys_ptr+i] = 0.0;
    }
    
    // FFT buffer
    fftRadix2(1, 1, m, buffer, xs_ptr, ys_ptr);
    
    // Apply multiplier
    for(i=0; i<m; ++i) {
      a = buffer[xs_ptr+i];
      b = buffer[ys_ptr+i];
      c = buffer[cft_ptr+i];
      d = buffer[sft_ptr+i];
      k1 = c * (a + b);
      k2 = a * (d - c);
      k3 = b * (c + d);
      buffer[xs_ptr+i] = k1 - k3;
      buffer[ys_ptr+i] = k1 + k2;
    }
    
    // Inverse FFT buffer
    fftRadix2(-1, 1, m, buffer, xs_ptr, ys_ptr);
    
    // Copy result back into x/y
    for(i=0; i<ncols; ++i) {
      a = buffer[xs_ptr+i];
      b = buffer[ys_ptr+i];
      c = buffer[cos_ptr+i];
      d = -buffer[sin_ptr+i];
      k1 = c * (a + b);
      k2 = a * (d - c);
      k3 = b * (c + d);
      buffer[x_ptr+i] = w * (k1 - k3);
      buffer[y_ptr+i] = w * (k1 + k2);
    }
    
    x_ptr += ncols;
    y_ptr += ncols;
  }
}

fftMatrix.scratchMemory = scratchMemory_1;

function ndfft(dir, x, y) {
  var shape = x.shape
    , d = shape.length
    , size = 1
    , stride = new Array(d)
    , pad = 0
    , i, j;
  for(i=d-1; i>=0; --i) {
    stride[i] = size;
    size *= shape[i];
    pad = Math.max(pad, fftMatrix.scratchMemory(shape[i]));
    if(x.shape[i] !== y.shape[i]) {
      throw new Error('Shape mismatch, real and imaginary arrays must have same size')
    }
  }
  var buf_size = 4 * size + pad;
  var buffer;
  if( x.dtype === 'array' ||
      x.dtype === 'float64' ||
      x.dtype === 'custom' ) {
    buffer = pool.mallocDouble(buf_size);
  } else {
    buffer = pool.mallocFloat(buf_size);
  }
  var x1 = ndarray(buffer, shape.slice(0), stride, 0)
    , y1 = ndarray(buffer, shape.slice(0), stride.slice(0), size)
    , x2 = ndarray(buffer, shape.slice(0), stride.slice(0), 2*size)
    , y2 = ndarray(buffer, shape.slice(0), stride.slice(0), 3*size)
    , tmp, n, s1, s2
    , scratch_ptr = 4 * size;
  
  //Copy into x1/y1
  ndarrayOps.assign(x1, x);
  ndarrayOps.assign(y1, y);
  
  for(i=d-1; i>=0; --i) {
    fftMatrix(dir, size/shape[i], shape[i], buffer, x1.offset, y1.offset, scratch_ptr);
    if(i === 0) {
      break
    }
    
    //Compute new stride for x2/y2
    n = 1;
    s1 = x2.stride;
    s2 = y2.stride;
    for(j=i-1; j<d; ++j) {
      s2[j] = s1[j] = n;
      n *= shape[j];
    }
    for(j=i-2; j>=0; --j) {
      s2[j] = s1[j] = n;
      n *= shape[j];
    }
    
    //Transpose
    ndarrayOps.assign(x2, x1);
    ndarrayOps.assign(y2, y1);
    
    //Swap buffers
    tmp = x1;
    x1 = x2;
    x2 = tmp;
    tmp = y1;
    y1 = y2;
    y2 = tmp;
  }
  
  //Copy result back into x
  ndarrayOps.assign(x, x1);
  ndarrayOps.assign(y, y1);
  
  pool.free(buffer);
}

var fft = ndfft;

/*
 * Author   Armin Taheri - https://github.com/ArminTaheri
 * License  MIT
 * Link     https://github.com/Pixpipe/pixpipejs
 * Lab      MCIN - Montreal Neurological Institute
 */
const DIRECTIONS = {
  'FORWARD': 1,
  'INVERSE': -1,
};

class BaseFourierSignalFilter extends Filter {
  constructor(direction) {
    super();
    this.direction = direction;
    this.setMetadata('direction', this.direction);
    if (DIRECTIONS[this.direction] === undefined) {
      throw new Error(`${this.direction} is not a valid fourier transform direction. Please try one of: ${Object.keys(DIRECTIONS)}`);
    }
    this.addInputValidator(0, Signal1D);
    this.addInputValidator(1, Signal1D);
  }
  _run() {
    if( ! this.hasValidInput()){
      console.warn("A filter of type BaseFourierSignalFilter requires 2 inputs of Signal1D.");
      return;
    }
    const realSignal = this._getInput(0);
    const imgSignal = this._getInput(1);
    const length = realSignal.getMetadata('length');
    if (length !== imgSignal.getMetadata('length')) {
      console.warn('The imaginary and real components of the signal need to be of equal length.');
    }
    const real = ndarray(realSignal.clone().getData(), [length]);
    const img = ndarray(imgSignal.clone().getData(), [length]);

    fft(DIRECTIONS[this.direction], real, img);
    this._output[0] = new Signal1D();
    this._output[0].setData(real.data);
    this._output[1] = new Signal1D();
    this._output[1].setData(img.data);
  }
}

class ForwardFourierSignalFilter extends BaseFourierSignalFilter {
  constructor() {
    super('FORWARD');
  }
}

class InverseFourierSignalFilter extends BaseFourierSignalFilter {
  constructor() {
    super('INVERSE');
  }
}

/*
 * Author   Armin Taheri - https://github.com/ArminTaheri
 * License  MIT
 * Link     https://github.com/Pixpipe/pixpipejs
 * Lab      MCIN - Montreal Neurological Institute
 */
const DIRECTIONS$1 = {
  'FORWARD': 1,
  'INVERSE': -1,
};

class BaseFourierImageFilter extends Filter {
  constructor(direction) {
    super();
    this.direction = direction;
    if (DIRECTIONS$1[this.direction] === undefined) {
      throw new Error(`${this.direction} is not a valid fourier transform direction. Please try one of: ${Object.keys(DIRECTIONS$1)}`);
    }
    this.addInputValidator(0, Image2D);
    this.addInputValidator(1, Image2D);
  }
  _run() {
    if( ! this.hasValidInput()){
      console.warn("A filter of type BaseFourierSignalFilter requires 2 inputs of Signal1D.");
      return;
    }
    const inputImagereal = this._getInput(0);
    const inputImageimg = this._getInput(1);
    const ncpp = inputImagereal.getMetadata('ncpp');
    if (ncpp > 1) {
      console.warn('Please make sure the input images are made of exactly 1 channel.');
      return;
    }

    const width = inputImagereal.getMetadata('width');
    const height =inputImagereal.getMetadata('height');
    if (width !== inputImageimg.getMetadata('width') || height !== inputImageimg.getMetadata('height')) {
      console.warn('Please make sure the real and imaginary input images are the same dimensions');
    }
    const real = ndarray(inputImagereal.getDataAsFloat32Array(), [width, height]);
    const img = ndarray(inputImageimg.getDataAsFloat32Array(), [width, height]);
    this.setMetadata('direction', this.direction);

    fft(DIRECTIONS$1[this.direction], real, img);
    this._output[0] = new Image2D();
    this._output[0].setData(real.data, width, height, 1);
    this._output[0].setMetadata('ncpp', 1);
    this._output[1] = new Image2D();
    this._output[1].setData(img.data, width, height, 1);
    this._output[1].setMetadata('ncpp', 1);
  }
}

class ForwardFourierImageFilter extends BaseFourierImageFilter {
  constructor() {
    super('FORWARD');
  }
}

class InverseFourierImageFilter extends BaseFourierImageFilter {
  constructor() {
    super('INVERSE');
  }
}

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
* **Usage**
* - [examples/forEachPixel.html](../examples/forEachPixel.html)
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
class ForEachPixelImageFilter extends ImageToImageFilter {

  constructor(){
    super();
    this.addInputValidator(0, Image2D);
  }


  /**
  * Run the filter
  */
  _run(){
    if( ! this.hasValidInput() )
      return;

    var inputImage2D = this._getInput();
    var firstPixel = 0;
    var lastPixel = inputImage2D.getWidth() * inputImage2D.getHeight();
    var increment = 1;

    var bufferCopy = inputImage2D.getDataCopy();

    this._forEachPixelOfSuch(bufferCopy, firstPixel, lastPixel, increment );

    // 1 - init the output
    var outputImg = this._addOutput( Image2D );

    // 2 - tune the output
    outputImg.setData(
      bufferCopy,
      inputImage2D.getWidth(),
      inputImage2D.getHeight(),
      inputImage2D.getComponentsPerPixel()
    );

  }


  /**
  * [PRIVATE]
  * generic function for painting row, colum or whole
  * @param {Number} firstPixel - Index of the first pixel in 1D array
  * @param {Number} lastPixel - Index of the last pixel in 1D array
  * @param {Number} increment - jump gap from a pixel to another (in a 1D style)
  */
  _forEachPixelOfSuch(buffer, firstPixel, lastPixel, increment ){
    // abort if no callback per pixel
    //if( ! ("pixel" in this._events)){
    if( ! ( this.hasEvent("pixel"))){
      console.warn("No function to apply per pixel was specified.");
      return;
    }

    var inputImage2D = this._getInput();
    var inputBuffer = inputImage2D.getData();
    var componentPerPixel = inputImage2D.getComponentsPerPixel();

    var currentColor = null;

    for(var p=firstPixel; p<lastPixel; p+=increment ){
      var firstCompoPos1D = p * componentPerPixel;
      var position2D = inputImage2D.get2dPositionFrom1dIndex(p);
      currentColor = inputBuffer.slice(firstCompoPos1D, firstCompoPos1D + componentPerPixel);

      var newColor = this.triggerEvent("pixel", position2D, currentColor);

      if(newColor && newColor.length == componentPerPixel){
        for(var i=0; i<componentPerPixel; i++){
          buffer[firstCompoPos1D + i] = newColor[i];
        }
      }

    }
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
* **Usage**
* - [examples/forEachPixelGadient.html](../examples/forEachPixelGadient.html)
*/
class SpectralScaleImageFilter extends ImageToImageFilter {

  constructor(){
    super();

    // both input are images.
    this.addInputValidator(0, Image2D);
    this.addInputValidator(1, Image2D);

    
  }


  /**
  * Run the filter
  */
  _run(){
    if(! this.hasValidInput() ){
      return;
    }
    
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
    var img2D = this._addOutput( Image2D );
    img2D.setData(
      data0,
      dataImg0.getWidth(),
      dataImg0.getHeight()
    );

  }


} /* END class SpectralScaleImageFilter */

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

function unaryInstruction(value) {
  return new Instruction(IOP1, value);
}

function binaryInstruction(value) {
  return new Instruction(IOP2, value);
}

function ternaryInstruction(value) {
  return new Instruction(IOP3, value);
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
* **usage**  
* - [examples/imageBlending.html](../examples/imageBlending.html)
* - [examples/imageBlending2.html](../examples/imageBlending2.html)
* - [examples/forEachPixelGradientBlend.html](../examples/forEachPixelGradientBlend.html)
*
*/
class ImageBlendExpressionFilter extends ImageToImageFilter {

  constructor(){
    super();
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
      console.warn("A filter of type ImageBlendExpressionFilter requires at least one input.");
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
    var img2D = this._addOutput( Image2D );

    img2D.setData(
      outputBuffer,
      firstInput.getWidth(),
      firstInput.getHeight()
    );

  }




} /* END of class ImageBlendExpressionFilter */

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

/**
* An instance of SpatialConvolutionFilter perform a convolution in a spatial reference,
* this can be applying a Sobel filter, a median or gaussian blur or perform a derivative.
* The filter is a NxM (aka. an array of arrays) of the following form:
* ```
*   var medianBlurFilter = [
*     [1/9, 1/9, 1/9],
*     [1/9, 1/9, 1/9],
*     [1/9, 1/9, 1/9],
*   ];
* ```
* For example, in the case of a simple derivative, it will be like that:
* ```
*  var dx = [
*    [1, -1]
*  ];
*
*  // or
*
*  var dy = [
*    [1],
*    [-1]
*  ];
* ```
* 
* The filter must be specified using the method `.setMetadata('filter', ...)`.
*
* **Usage**
*  - [examples/spatialConvolImage2D.html](../examples/spatialConvolImage2D.html)
*
*/
class SpatialConvolutionFilter extends ImageToImageFilter {

  constructor(){
    super();
    this.addInputValidator(0, Image2D);
    this.setMetadata("filter", null);
  }

  
  _run(){
    // the input checking
    if( ! this.hasValidInput()){
      console.warn("A filter of type SpatialConvolutionFilter requires 1 input of category '0' and one input of category '1'.");
      return;
    }
    
    var filter = this.getMetadata("filter");
    
    if( !filter ){
      console.warn("A filter must be specified using .setMetadata('filter', [[]])");
      return;
    }
    
    // input
    var inputImg = this._getInput( 0 );
    var inputData = inputImg.getData();
    var ncpp = inputImg.getNcpp();
    var width = inputImg.getWidth();
    var height = inputImg.getHeight();
    
    // output 
    var outputImg = new Image2D( {width: width, height: height, color: new Array(ncpp).fill(0) } );
    var outputData = outputImg.getData();
    
    // filter
    var filterSize = filter.length;
    var filterHeight = filter.length;
    var filterWidth = filter[0].length;
    var filterHalfWidth = Math.floor( filterWidth / 2 );
    var filterHalfHeight = Math.floor( filterHeight / 2 );
    
    // looping info
    var startX = filterHalfWidth;
    var startY = filterHalfHeight;
    var endX = width - filterHalfWidth;
    var endY = height - filterHalfHeight;
    
    // along image width
    for(var iImg=startX ; iImg<endX; iImg++){

      // along image height
      for(var jImg=startY ; jImg<endY; jImg++){

        // get the 1D position of the first component
        var linearPosition = (jImg * width + iImg) * ncpp;

        // along filter width
        for(var iFilter=0; iFilter<filterWidth; iFilter++){
          
          // along filter height
          for(var jFilter=0; jFilter<filterHeight; jFilter++){
            
            var iUnderFilter = iImg + iFilter - filterHalfWidth;
            var jUnderFilter = jImg + jFilter - filterHalfHeight;
            var colorUnderFilter = inputImg.getPixel({x: iUnderFilter, y: jUnderFilter});
            var curentFilterValue = filter[jFilter][iFilter];
            
            // looping around components
            for(var c=0; c<ncpp; c++){
              outputData[ linearPosition + c] += colorUnderFilter[c] * curentFilterValue;
            } /* END for-loop over components */
            
          } /* END for-loop over filter height */
          
        } /* END for-loop over filter width */
        
      } /* END for-loop over image height */
      
    } /* END for-loop over image width */
    
    this._output[0] = outputImg;
    
  }
  
} /* END of class SpatialConvolutionFilter */

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


/**
* Multiply two Image2D pixel by pixel. They must have the same number of components per pixel
* and the same size.
* Output an new Image3D.
* Equivalent to `SpectralScaleImageFilter`.
*
* **Usage**
*  - [examples/multiplyImage2D.html](../examples/multiplyImage2D.html)
*
*/
class MultiplyImageFilter extends ImageToImageFilter {

  constructor(){
    super();
    this.addInputValidator(0, Image2D);
    this.addInputValidator(1, Image2D);
  }


  _run(){

    // the input checking
    if( ! this.hasValidInput()){
      console.warn("A filter of type MultiplyImageFilter requires 1 input of category '0' and one input of category '1'.");
      return;
    }
      
    if( !this.hasSameNcppInput() || !this.hasSameSizeInput() ){
      return;
    }


    var img0 = this._getInput( 0 );
    var img1 = this._getInput( 1 );

    
    var img1Buffer = img1.getData();
    var outputBuffer = img0.getDataCopy();

    for(var i=0; i<outputBuffer.length; i++){
      outputBuffer[ i ] *= img1Buffer[ i ];
    }

    var img2D = this._addOutput( Image2D );

    img2D.setData(
      outputBuffer,
      img0.getWidth(),
      img0.getHeight()
    );

  }

} /* END class MultiplyImageFilter */

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

/**
* An instance of SimpleThresholdFilter perform a threshold on an input image.
* The input must be an Image2D with 1, 3 or 4 bands.
* The default threshold can be changed using `.setMetadata("threshold", 128)`
* and the low and high value can be replaced using `.setMetadata("lowValue", 0)`
* and `.setMetadata("highValue", 255)`. In addition, in case of dealing with a
* RGBA image, you can decide of preserving the alpha channel or not, using 
* `.setMetadata("preserveAlpha", true)`.
*
* **Usage**
*  - [examples/imageThresholding.html](../examples/imageThresholding.html)
*/
class SimpleThresholdFilter extends ImageToImageFilter {
  
  constructor(){
    super();
    
    this.addInputValidator(0, Image2D);
    
    // default values
    this.setMetadata("threshold", 128);
    this.setMetadata("lowValue", 0);
    this.setMetadata("highValue", 255);
    this.setMetadata("preserveAlpha", true);
  }
  
  
  _run(){
    // the input checking
    if( ! this.hasValidInput())
      return;
    
    var inputImg = this._getInput( 0 );

    var outputImage = inputImg.clone();

    // Number of bands
    var ncpp = inputImg.getComponentsPerPixel();
    
    // having a local value is faster than fetching an object
    var threshold = this.getMetadata("threshold");
    var lowValue = this.getMetadata("lowValue");
    var highValue = this.getMetadata("highValue");
    
    // get a copy of the input buffer so that we dont overwrite it!
    var outputBuffer = outputImage.getData();
    
    // if the input image has:
    // - a single band, OR
    // - three bands (assuming RGB), OR
    // - four bands (assuming RGBA)
    if(ncpp == 1 || ncpp == 3 || ncpp == 4){
      // we want to preserve transparency ( = not affected by thresholding)
      if( this.getMetadata("preserveAlpha") && ncpp == 4){
        
        for(var i=0; i<outputBuffer.length; i++){
          // every four band is an alpha band
          if(i%4 == 3){
            continue;
          }
          outputBuffer[i] = outputBuffer[i] < threshold ? lowValue : highValue;
        }
        
      // transparency is altered by the threshold like any other channel
      }else{
        for(var i=0; i<outputBuffer.length; i++){
          outputBuffer[i] = outputBuffer[i] < threshold ? lowValue : highValue;
        }
        
      }
      
      this._output[0] = outputImage;
      
      /*
      // creating a blank Image2D output and getting the ref
      var outputImg = this._addOutput( Image2D );
      
      // filling it with actual data
      outputImg.setData(
        outputBuffer,
        inputImg.getWidth(),
        inputImg.getHeight(),
        ncpp
      );
      */
      
    }else{
      outputBuffer = null;
      console.warn("The input data must have 1, 3 or 4 components per pixel.");
      return;
    }
    
    
    
  }
  
} /* END of class SimpleThresholdFilter */

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

/**
* A ImageDerivativeFilter filter will compute the dx and dy derivative using the filters
* h = [1, -1]
* 
* You can change the built-in filters that perform the derivative by setting the metadata
*  "dxFilter" and "dyFilter" with the method `.setMetadata()`. See the documentation of
* `SpatialConvolutionFilter` to make your custom filter compatible.
*
* **Usage**
* - [examples/derivativeImage2D.html](../examples/derivativeImage2D.html)
*
*/
class ImageDerivativeFilter extends ImageToImageFilter {
  
  constructor(){
    super();
    this.addInputValidator(0, Image2D);
    
    // filters for derivative
    var dx = [
        [1, -1]
      ];
      
    var dy = [
        [1],
        [-1]
      ];
      
    this.setMetadata("dxFilter", dx);
    this.setMetadata("dyFilter", dy);
  }
  
  _run(){
    // the input checking
    if( ! this.hasValidInput()){
      console.warn("A filter of type ImageDerivativeFilter requires 1 input of category '0' and one input of category '1'.");
      return;
    }
    
    var inputImg = this._getInput( 0 );
    
    var dx = this.getMetadata('dxFilter');
    var dy = this.getMetadata('dyFilter');
  
    var spatialConv = new pixpipe.SpatialConvolutionFilter();
    spatialConv.addInput( inputImg );
    
    spatialConv.setMetadata("filter", dx);
    spatialConv.update();
    
    this._output["dx"] = spatialConv.getOutput();
    
    spatialConv.setMetadata("filter", dy);
    spatialConv.update();
    
    this._output["dy"] = spatialConv.getOutput();
    
  }
  
} /* END class ImageDerivativeFilter */

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

/**
* An instance of GradientImageFilter takes 2 input Image2D: a derivative in x,
* with the category "dx" and a derivative in y with the category "dy". They must
* be the same size and have the same number of  components per pixel.
*
* **Usage**
* - [examples/gradientImage2D.html](../examples/gradientImage2D.html)
*/
class GradientImageFilter extends ImageToImageFilter {
  
  constructor(){
    super();
    
    this.addInputValidator('dx', Image2D);
    this.addInputValidator('dy', Image2D);
  }
  
  _run(){
    // the input checking
    if( ! this.hasValidInput()){
      console.warn("A filter of type GradientImageFilter requires 1 input of category 'dx' and 1 input of category 'dy'.");
      return;
    }
    
    // they must be the same size and same ncpp
    if(!this.hasSameSizeInput() || !this.hasSameNcppInput()){
      return;
    }
    
    var dxImage = this._getInput("dx");
    var dxImageData = dxImage.getData();
    
    var dyImage = this._getInput("dy");
    var dyImageData = dyImage.getData();
    
    var gradMagnitude = dxImage.hollowClone();
    var gradMagnitudeData = gradMagnitude.getData();
    
    var gradDirection = dxImage.hollowClone();
    var gradDirectionData = gradDirection.getData();
    
    var magnitudeExtrema = {min: Infinity, max: -Infinity};
    var directionExtrema = {min: Infinity, max: -Infinity};
    
    for(var i=0; i<dxImageData.length; i++){
      // gradient magnitude
      gradMagnitudeData[i] = Math.sqrt(dxImageData[i]*dxImageData[i] + dyImageData[i]*dyImageData[i]);
      if(! isNaN(gradMagnitudeData[i])){
        magnitudeExtrema.min = Math.min(magnitudeExtrema.min, gradMagnitudeData[i]);
        magnitudeExtrema.max = Math.max(magnitudeExtrema.max, gradMagnitudeData[i]);
      }
      
      // gradient direction
      gradDirectionData[i] = Math.atan(dyImageData[i] / dxImageData[i]);
      if(! isNaN(gradDirectionData[i])){
        directionExtrema.min = Math.min(directionExtrema.min, gradDirectionData[i]);
        directionExtrema.max = Math.max(directionExtrema.max, gradDirectionData[i]);
      }
    }
    
    gradMagnitude.setMetadata("min", magnitudeExtrema.min);
    gradMagnitude.setMetadata("max", magnitudeExtrema.max);
    
    gradDirection.setMetadata("min", directionExtrema.min);
    gradDirection.setMetadata("max", directionExtrema.max);
    
    this._output["direction"] = gradDirection;
    this._output["magnitude"] = gradMagnitude;
  }
  
  
} /* END of class GradientImageFilter  */

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

/**
* A NormalizeImageFilter instance takes an Image2D as input and outputs an Image2D.
* The output images will have values in [0.0, 1.0]. One of the usage is that is can then
* be used as a scaling function.
* 
* The max value to normalize with will be the max value of the input image (among all components)
* but an manual max value can be given to this filter using `.setMetadata("max", m)`.
*
* **Usage**
* - [examples/gradientHueWheelImage2D.html](../examples/gradientHueWheelImage2D.html)
*
*/
class NormalizeImageFilter extends ImageToImageFilter {
  
  constructor(){
    super();
    this.addInputValidator(0, Image2D);
    
    this.setMetadata("max", NaN);
  }
  
  
  _run(){
    // the input checking
    if( ! this.hasValidInput()){
      console.warn("A filter of type */ requires 1 input of category '0'.");
      return;
    }
    
    var inputImage = this._input[0];
    var inputData = inputImage.getData();
    var outputImg = inputImage.hollowClone();
    var outputData = outputImg.getData();
    
    var max = this.getMetadata("max");
    if(isNaN(max)){
      max = inputImage.getMax();
    }
    
    for(var i=0; i<inputData.length; i++){
      outputData[i] = inputData[i] / max;
    }
    
    this._output[0] = outputImg;
  }
  
  
} /* END class NormalizeImageFilter */

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

/**
* An instance of ContourImage2DFilter takes a seed (`.setMetadata("seed", [x, y])`)
* and finds the contour of the shape of a segmented image by going north.
* The input must be an `Image2D` and the output is a `LineString`.  
* Two options are availble for neighbour connexity: 4 or 8. Set this option using
* `.setMetadata("connexity", n)`.
*
* **Usage**
* - [examples/contourImage2D.html](../examples/contourImage2D.html)
*
*/
class ContourImage2DFilter extends Filter {
  
  constructor(){
    super();
    this.addInputValidator(0, Image2D);
    this.setMetadata("connexity", 8);
    this.setMetadata("seed", [0, 0]);
    
    this._directionListConnexity4 = [
      [ 0 ,-1], // [0] => N
      [-1 , 0], // [1] => W
      [ 0 , 1], // [2] => S
      [ 1 , 0]  // [3] => E
    ];
    
    this._directionListConnexity8 = [
      [ 0  , -1], // [0] => N
      [-1  , -1], // [1] => NW
      [-1  ,  0], // [2] => W
      [-1  ,  1], // [3] => SW
      [ 0  ,  1], // [4] => S
      [ 1  ,  1], // [5] => SE
      [ 1  ,  0], // [6] => E
      [ 1  , -1]  // [7] => NE
    ];
    
  }
  
  
  _run(){
    // the input checking
    if( ! this.hasValidInput()){
      console.warn("A filter of type AngleToHueWheelHelper requires 1 input of category '0'.");
      return;
    }
    
    var imageIn = this._getInput(0);
    var ncpp = imageIn.getNcpp();
    var width = imageIn.getWidth();
    var height = imageIn.getHeight();
    var directionList = null;
    
    if( this.getMetadata("connexity") == 8){
      directionList = this._directionListConnexity8;
    }else{
      directionList = this._directionListConnexity4;
    }
    
    // handy color comparison
    function isSameColor(c1, c2){
      if(c1.length != c2.length)
        return false;
      
      for(var i=0; i<c1.length; i++){
        if(c1[i] != c2[i])
          return false;
      }
      return true;
    }
    
    
    var newSeed = this._metadata.seed.slice();
    var directionIncrement = directionList.length / 4;
    var direction = directionIncrement; // once top north, we go west
    
    if(newSeed[0]<0 || newSeed[1]<0 || newSeed[0]>=width || newSeed[1]>= height){
      console.warn("The seed is out of image range.");
      return;
    }
    
    var clusterColor = imageIn.getPixel( {x: newSeed[0], y: newSeed[1]} );
    var newColor = clusterColor;
    var atNorth = newSeed.slice();
    
    
    var canStartFromOriginalSeed = false;
    
    
    // test the local surrounding and avoid going North
    for(var i=0; i<this._directionListConnexity4.length; i++){
      var localColor = imageIn.getPixel( {x: newSeed[0] + this._directionListConnexity4[i][0], y: newSeed[1] + this._directionListConnexity4[i][1]} );
      
      if(! isSameColor(localColor, clusterColor)){
        canStartFromOriginalSeed = true;
        direction = i;
        
        if( this.getMetadata("connexity") == 8){
          direction *= 2;
        }
        
        direction += directionIncrement;
        break;
      }
    }
    
    
    // first, we go to the north border of our cluster
    while( true && !canStartFromOriginalSeed){
      atNorth[0] += directionList[0][0];
      atNorth[1] += directionList[0][1];
      
      // we reached the border of the image
      if(atNorth[0]<0){
        newSeed[0] = 0;
        newSeed[1] = atNorth[1];
        break;
      }
      
      // can be null if out of the image
      newColor = imageIn.getPixel( {x: atNorth[0], y: atNorth[1]} );
      
      if( newColor && isSameColor(newColor, clusterColor) ){
        newSeed[0] = atNorth[0];
        newSeed[1] = atNorth[1];
      }else{
        break;
      }
    }
    
    var movingPoint = newSeed.slice();
    var potentialPosition = [0, 0];
    var listOfValidPoints = [];
    listOfValidPoints.push(newSeed[0]);
    listOfValidPoints.push(newSeed[1]);
    
    // return 0: the tested point is the starting point
    // return 1: the tested point is of the right color
    // return 2: the tested point id from the wrong color (test other direction)
    function tryPotientialPosition(){
      
      potentialPosition[0] = movingPoint[0] + directionList[direction][0];
      potentialPosition[1] = movingPoint[1] + directionList[direction][1];
        
      // prevent from going ouside the image
      if(potentialPosition[0] < 0 || potentialPosition[1] < 0 || 
         potentialPosition[0] >= width || potentialPosition[1] >= height)
      {
        return 2;
      }
        
      var potentialPositionColor = imageIn.getPixel( {x: potentialPosition[0], y: potentialPosition[1]} );
        
      // test if the new direction goes with the same color
      if( isSameColor(potentialPositionColor, clusterColor) ){
        
        if( potentialPosition[0]==listOfValidPoints[0] && // the point just found is the
            potentialPosition[1]==listOfValidPoints[1] )  // same as the very first
        {
          return 0; // break the loop
        }else{
          // we validate the point and keep moving
          movingPoint[0] = potentialPosition[0];
          movingPoint[1] = potentialPosition[1];
          listOfValidPoints.push( movingPoint[0] );
          listOfValidPoints.push( movingPoint[1] );
        }
        return 1; // continue the loop
      }
      return 2; // try directions
    }
    
    
    // start the real navigation, starting from movingPoint
    main_loop:
    while( true ){
      
      // go the previous direction on the list
      direction -= directionIncrement;
      if(direction<0)
        direction = directionList.length - directionIncrement;
    
      var score = tryPotientialPosition();
      
      if( score == 0){  
        break main_loop;
      }else if(score == 1){
        continue;
      }else{  // score == 2
        
        var nbTrials = 0;
      
        // we try the other directions
        direction_loop:
        for(var i=0; i<directionList.length-1; i++){  // -1 because we don't need to retry the last, since it's also the one done before
        
          //direction += i;
          direction ++;
          direction = direction%directionList.length;
          score = tryPotientialPosition();
          
          if( score == 0){  
            break main_loop;  // back to the start point/seed
          }else if(score == 1){
            break direction_loop; // point is good, 
          }else{
            nbTrials++;
            continue; // try the next direction
          }

        }
      
        // it means the seed was in a single pixel island :(
        if(nbTrials == directionList.length-1){
          break;
        }
      }
    }
    
    var outputLineString = new LineString();
    outputLineString.setData(listOfValidPoints);
    outputLineString.setMetadata("closed", true);
    this._output[0] = outputLineString;
    
  } /* END of _run() */
  
  
} /* END of class ContourImage2DFilter */

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


/**
* A FloodFillImageFilter instance takes an Image2D as input and gives a Image2D
* as output.  
* The starting point of the flood (seed) has to be set using `.setMetadata("seed", [x, y])`
* where `x` and `y` are winthin the boundaries of the image.  
* The tolerance can also be set using `.setMetadata("tolerance", n)`.
* The tolerance is an absolute average over each component per pixel.
* 
* Neighbour connexity can be 4 or 8 using `.setMetadata("connexity", n)`.
* Destination color can be set with `.setMetadata("color", [r, g, b])`.
* The color array depends on your input image and can be of size 1 (intensity),
* 3 (RGB), 4 (RBGA) or other if multispectral.
*
* In addition to the output image, the list of internal hit points is created and
* availble with `.getOutput("hits")`.
*
*
* **Usage**
* - [examples/floodFillImage2D.html](../examples/floodFillImage2D.html)
*
*
*/
class FloodFillImageFilter extends ImageToImageFilter {
  
  constructor(){
    super();
    this.addInputValidator(0, Image2D);
    this.setMetadata("tolerance", 1);
    this.setMetadata("connexity", 4);
    this.setMetadata("color", null);
    this.setMetadata("onlyHits", false);
    
    this._directionListConnexity4 = [
      [ 0 ,-1], // [0] => N
      [-1 , 0], // [1] => W
      [ 0 , 1], // [2] => S
      [ 1 , 0]  // [3] => E
    ];
    
    this._directionListConnexity8 = [
      [ 0  , -1], // [0] => N
      [-1  , -1], // [1] => NW
      [-1  ,  0], // [2] => W
      [-1  ,  1], // [3] => SW
      [ 0  ,  1], // [4] => S
      [ 1  ,  1], // [5] => SE
      [ 1  ,  0], // [6] => E
      [ 1  , -1]  // [7] => NE
    ];
    
  }
  
  
  _run(){
    
    // the input checking
    if( ! this.hasValidInput()){
      console.warn("A filter of type FloodFillImageFilter requires 1 input of category '0'.");
      return;
    }
    
    var imageIn = this._getInput(0);
    var ncpp = imageIn.getNcpp();
    var width = imageIn.getWidth();
    var height = imageIn.getHeight();
    var directionList = null;
    
    if( this.getMetadata("connexity") == 8){
      directionList = this._directionListConnexity8;
    }else{
      directionList = this._directionListConnexity4;
    }
    
    var replacementColor = new Array(ncpp); // red
    replacementColor[0] = 255;
    
    var paintColor = this.getMetadata("color") || replacementColor;
    
    // checking color validity
    if(paintColor.length != ncpp){
      if(!(paintColor.length == 3 && ncpp ==4)){
        console.warn("The color to fill must have the same number of components as the input image. (RGB color for RGBA image is accepted)");
        return;
      }
    }
    
    
    
    // to mark the place we've been in the filling
    var markerImage = new Image2D({width: width, height: height, color: [0]});
    var seed = this.getMetadata("seed");
    var seedColor = imageIn.getPixel({x: seed[0], y: seed[1]});
    var tolerance = this.getMetadata("tolerance");
    var onlyHits = this.getMetadata("onlyHits");
    
    var imageOut = null;
    if(!onlyHits){
      imageOut = imageIn.clone();
    }
    
    
    // the points in this list are points at the edge, except the edge of the image
    var edgePointList = [];
    
    var pixelStack = [];
    pixelStack.push( seed );
    
    while(pixelStack.length > 0){
      
      var currentPixel = pixelStack.pop();
      var x = currentPixel[0];
      var y = currentPixel[1];
      
      if(x<0 || x>=width || y<0 || y>=height){
        continue;
      }
      
      // if the image was not filled here...
      if(markerImage.getPixel({x: x, y: y})[0] == 0){
        
        // mark as visited
        markerImage.setPixel({x: x, y: y}, [1]);
        
        // paint the image
        if(!onlyHits){
          imageOut.setPixel({x: x, y: y}, paintColor);
        }
        
        // check neighbours upon connexity degree
        var potentialPosition = [0, 0];
        var isOnEdge = false;
        
        for(var i=0; i<directionList.length; i++){
          potentialPosition[0] = x + directionList[i][0];
          potentialPosition[1] = y + directionList[i][1];
          
          if(potentialPosition[0]<0 || potentialPosition[0]>=width || 
             potentialPosition[1]<0 || potentialPosition[1]>=height )   
          { 
            continue;
          }
          
          var targetColor = imageIn.getPixel({x:potentialPosition[0], y: potentialPosition[1] });
          
          var isWithinTolerance = true;
          for(var c=0; c<seedColor.length; c++){
            if(Math.abs( targetColor[c] - seedColor[c] ) > tolerance ){
              isWithinTolerance = false;
              isOnEdge = true;
              break;
            }
          } /* END for loop color channels */
          
          if(isWithinTolerance ){
            var newCandidate = [potentialPosition[0], potentialPosition[1]];
            pixelStack.push( newCandidate );
          }
          
        } /* END for loop direction*/
        
        if(isOnEdge){
          if(x!=0 && x!=(width-1) && y!=0 && y!=(height-1)){ // we dont want the edge of the image
            edgePointList.push( currentPixel );
          }
        }
        
      } /* END if image was not filled at this position */
      
    } /* END while loop unstacking the points */
    
    if(!onlyHits){
      this._output[0] = imageOut;
    }
  
    this._output["edgePoints"] = edgePointList;
    
  } /* END of _run() */
  
  
  
  
} /* END of class FloodFillImageFilter */

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


/**
*
*/
class ContourHolesImage2DFilter extends Filter {
  
  constructor() {
    super();
    this.addInputValidator(0, Image2D);
    this.setMetadata("connexity", 4);
    this.setMetadata("seed", [0, 0]);
  }
  
  
  _run(){
    
    // the input checking
    if( ! this.hasValidInput()){
      console.warn("A filter of type ContourHolesImage2DFilter requires 1 input of category '0'.");
      return;
    }
    
    var imageIn = this._getInput(0);
    var ncpp = imageIn.getNcpp();
    var width = imageIn.getWidth();
    var height = imageIn.getHeight();
    var directionList = null;
    var contours = [];
    
    var connexity = this.getMetadata("connexity");
    var seed = this.getMetadata("seed");
    
    // finding the 1st contour
    var contourDetector = new ContourImage2DFilter();
    contourDetector.addInput( imageIn );
    contourDetector.setMetadata("connexity", connexity);
    contourDetector.setMetadata("seed", seed);
    contourDetector.update();
    
    contours.push( contourDetector.getOutput() );
    
    // From the same seed, flood fill - we dont care about the filled image, but
    // we want the hit points from it
    var filler = new FloodFillImageFilter();
    filler.addInput( imageIn );
    filler.setMetadata('onlyHits', false); // if we are not interested in the image but just want the hit points, this must be true.
    filler.setMetadata("connexity", 4); // could be 4
    filler.setMetadata("tolerance", 0); // in pixel value, applied to each component
    filler.setMetadata("seed", seed);
    filler.update();
    
    var fillingEdgePoints = filler.getOutput("edgePoints");
    
    var flyContourDetector = new ContourImage2DFilter(); // will be reused several times
    flyContourDetector.setMetadata("time", false);  // prevent every little contour finding to print their time
    
    // for each point found while filling, we check if already in one of the contours.
    // if not already, we launch a new contour extraction from this point (as a seed)
    // and add a new contour.
    for(var i=0; i<fillingEdgePoints.length; i++){
      var edgePoint = fillingEdgePoints[i];
      
      var isAlreadyPartOfContour = false;
      
      for(var c=0; c<contours.length; c++){
        if( contours[c].hasPoint(edgePoint) ){
          isAlreadyPartOfContour = true;
          break;
        }
      }
      
      if(!isAlreadyPartOfContour){
        // finding the 1st contour
        
        flyContourDetector.addInput( imageIn );
        flyContourDetector.setMetadata("connexity", connexity);
        flyContourDetector.setMetadata("seed", edgePoint);
        flyContourDetector.update();
        
        contours.push( flyContourDetector.getOutput() );
      }
      
    } /* END of for loop over edge points */
    
    for(var i=0; i<contours.length; i++){
      this._output[i] = contours[i];
    }
    
  }
  
} /* END of class ContourHolesImage2DFilter */

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


/**
* This Filter is a bit special in a sense that it does not output anything. It takes
* an Image2D as output "0" and the event "pixel" must be defined, with a callback taking
* two arguments: the position as an object {x: Number, y: Number} and the color as
* an array, ie. [Number, Number, Number] for an RGB image.
*
* This filter is convenient for computing statistics or for anything where the output is mannually
* created ( because the filter ForEachPixelImageFilter creates an output with same number of band.)
*
* **Usage**
* - [the filter TerrainRgbToElevationImageFilter](https://github.com/jonathanlurie/pixpipejs/blob/master/src/filter/TerrainRgbToElevationImageFilter.js)
*
*/
class ForEachPixelReadOnlyFilter extends Filter {

  constructor(){
    super();
    this.addInputValidator(0, Image2D);
  }


  _run(){

    // the input checking
    if( ! this.hasValidInput()){
      console.warn("A filter of type ForEachPixelReadOnlyFilter requires 1 input of category '0'.");
      return;
    }

    if( ! ( this.hasEvent("pixel"))){
      console.warn("No function to apply per pixel was specified.");
      return;
    }

    var imageIn = this._getInput(0);
    var ncpp = imageIn.getNcpp();
    var width = imageIn.getWidth();
    var height = imageIn.getHeight();

    // reading pixel by pixel
    for(var j=0; j<height; j++){
      for(var i=0; i<width; i++){
        var position = {x: i, y: j};
        var color = imageIn.getPixel( position );
        this.triggerEvent("pixel", position, color);
      }
    }
  }

} /* END of class ForEachPixelReadOnlyFilter */

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


/**
* This filter's purpose is to convert Mapbox's TerrainRGB image data into monochannel
* elevation (in meter).
* See more info about the format here: https://www.mapbox.com/blog/terrain-rgb/
* The filter takes an Image2D that respect Mapbox's format (can be a result of stictching tiles together)
* and output a single component image with possibly up to 16777216 different values.
*
* **Usage**
* - [examples/terrainRgbToElevation.html](../examples/terrainRgbToElevation.html)
*
*/
class TerrainRgbToElevationImageFilter extends ImageToImageFilter {

  constructor(){
    super();
    this.addInputValidator(0, Image2D);
  }

  _run(){
    // the input checking
    if( ! this.hasValidInput()){
      console.warn("A filter of type TerrainRgbToElevationImageFilter requires 1 input of category '0'.");
      return;
    }

    var imageIn = this._getInput(0);
    var ncpp = imageIn.getNcpp();
    var width = imageIn.getWidth();
    var height = imageIn.getHeight();

    // the image must be RGB or RGBA (we dont use A)
    if(ncpp < 3){
      console.warn("A filter of type TerrainRgbToElevationImageFilter requires an input with at least 3 components per pixel.");
      return;
    }

    // monochannel output, init with zeros
    var outputImg = new pixpipe.Image2D({width: width, height: height, color: [0]});
    var forEachPixelFilterRead = new pixpipe.ForEachPixelReadOnlyFilter();

    // add the input input
    forEachPixelFilterRead.addInput( imageIn );

    forEachPixelFilterRead.on( "pixel", function(position, color){
      var elevation = -10000 + ((color[0] * 256 * 256 + color[1] * 256 + color[2]) * 0.1);
      outputImg.setPixel( position, [ elevation ]);
    });

    forEachPixelFilterRead.update();
    this._output[0] = outputImg;
  }

} /* END of class TerrainRgbToElevationImageFilter */

/*
* Author    Jonathan Lurie - http://me.jonahanlurie.fr
*
* License   MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


/**
* With a given set of points ( each being {x: Number, y: Number, value: Number} )
* An instance of NearestNeighborSparseInterpolationImageFilter creates an image where
* each value is the closest from the given point.
* 
* The original points/measures must be given as an Array of Object using
* the method `.addInput([...])`
*
* The output image size must be set using the method
* `.setMetadata( "outputSize", {width: Number, height: Number})`
*
* The given point can be outside the output image boundaries.
* 
* **Usage**
* - [examples/nearestSparseInterpolation.html](../examples/nearestSparseInterpolation.html)
*/ 
class NearestNeighborSparseInterpolationImageFilter extends Filter {
  constructor(){
    super();
    
    this.setMetadata( "outputSize", {width: 0, height: 0});
  }
  
  _run(){
    
    var points = null;
    
    // getting the input
    if( "0" in this._input ){
      points = this._input[ 0 ];
    }else{
      console.warn("No input point set were given.");
      return;
    }
    
    var outputSize = this.getMetadata( "outputSize" );
    
    // checking output size
    if( outputSize.width == 0 || outputSize.height == 0 ){
      console.warn("The output size cannot be 0.");
      return;
    }
    
    // creating the output image
    var out = new pixpipe.Image2D({width: outputSize.width, height: outputSize.height, color: [0]});
    
    // for each pixel of the image...
    for(var i=0; i<outputSize.width; i++){
      for(var j=0; j<outputSize.height; j++){
        
        var nearestPointIndex = 0;
        var nearestDistance = Infinity;
        
        // for each point of the original set...
        for(var p=0; p<points.length; p++){
          
          // compute euclidian distance from [i, j] to p(x, y)
          var d = Math.sqrt( Math.pow( points[p].x - i, 2 ) + Math.pow( points[p].y - j, 2) );
          
          if( d < nearestDistance){
            nearestDistance = d;
            nearestPointIndex = p;
          }
        }
        
        out.setPixel( {x: i, y: j}, [ points[nearestPointIndex].value ] );
      }
    }
    
    this._output[ 0 ] = out;
  }
  
} /* END of class NearestNeighborSparseInterpolationImageFilter */

/*
* Author    Jonathan Lurie - http://me.jonahanlurie.fr
*
* License   MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


/**
* An instance of IDWSparseInterpolationImageFilter performs a 2D interpolation from 
* a sparse dataset using the method of Inverse Distance Weighting.
* The original dataset is specified using the method `.addInput( points )`, where
* `points` is an `Array` of `{x: Number, y: Number, value: Number}`.
* This filter outputs an `Image2D` with interpolated values. The size of the output must be
* specified using the method `.setMetadata( "outputSize", {width: Number, height: Number})`.
*
* The IDW algorithm can be tuned with a "strength", which is essentially the value
* of exponent of the distances. Default is `2` but it is common the see a value
* of `1` or `3`. With higher values, the output will look like a cells pattern.
* The strength can be defined using the method `.setMetadata( "strength", Number )`
*
* Note 1: points can be outside the boundaries of the original image
* Note 2: interpolated values are floating point
*
* Note that only single-component images are outputed from this filter.
* Ressources:
* https://www.e-education.psu.edu/geog486/node/1877
* 
* **Usage**
* - [examples/nearestSparseInterpolation.html](../examples/nearestSparseInterpolation.html)
*/ 
class IDWSparseInterpolationImageFilter extends Filter {
  constructor(){
    super();
    this.setMetadata( "strength", 2 );
    this.setMetadata( "outputSize", {width: 0, height: 0});
  }
  
  _run(){
    
    var points = null;
    
    // getting the input
    if( "0" in this._input ){
      points = this._input[ 0 ];
    }else{
      console.warn("No input point set were given.");
      return;
    }
    
    var outputSize = this.getMetadata( "outputSize" );
    
    // checking output size
    if( outputSize.width == 0 || outputSize.height == 0 ){
      console.warn("The output size cannot be 0.");
      return;
    }
    
    // creating the output image
    var out = new pixpipe.Image2D({width: outputSize.width, height: outputSize.height, color: [0]});
    var strength = this.getMetadata( "strength" );
    var distances = new Float32Array( points.length );
    
    
    // for each pixel of the image...
    for(var i=0; i<outputSize.width; i++){
      for(var j=0; j<outputSize.height; j++){
        
        if( i == 90 && j == 90 ){
          console.log( "here" );
        }
        
        var numerator = 0;
        var denominator = 0;
        
        // value taken when a pixel is exactely on one of the original point
        var pointValue = null;
        var isOnPoint = false;
        
        // for each point of the original set...
        for(var p=0; p<points.length; p++){
          // compute euclidian distance from [i, j] to p(x, y)
          var d = Math.sqrt( Math.pow( points[p].x - i, 2 ) + Math.pow( points[p].y - j, 2) );
          
          if( d == 0){
            isOnPoint = true;
            pointValue = points[p].value;
            break;
          }
          
          
          numerator += ( points[p].value / Math.pow( d, strength ) );
          denominator += ( 1 / Math.pow(d, strength ) );
        }
        
        var pixelValue = isOnPoint ? pointValue : ( numerator / denominator );
        
        out.setPixel( {x: i, y: j}, [ pixelValue ] );
      }
    }
    
    this._output[ 0 ] = out;
  }
  
} /* END of class IDWSparseInterpolationImageFilter */

var delaunay = createCommonjsModule(function (module) {
var Delaunay;

(function() {
  "use strict";

  var EPSILON = 1.0 / 1048576.0;

  function supertriangle(vertices) {
    var xmin = Number.POSITIVE_INFINITY,
        ymin = Number.POSITIVE_INFINITY,
        xmax = Number.NEGATIVE_INFINITY,
        ymax = Number.NEGATIVE_INFINITY,
        i, dx, dy, dmax, xmid, ymid;

    for(i = vertices.length; i--; ) {
      if(vertices[i][0] < xmin) xmin = vertices[i][0];
      if(vertices[i][0] > xmax) xmax = vertices[i][0];
      if(vertices[i][1] < ymin) ymin = vertices[i][1];
      if(vertices[i][1] > ymax) ymax = vertices[i][1];
    }

    dx = xmax - xmin;
    dy = ymax - ymin;
    dmax = Math.max(dx, dy);
    xmid = xmin + dx * 0.5;
    ymid = ymin + dy * 0.5;

    return [
      [xmid - 20 * dmax, ymid -      dmax],
      [xmid            , ymid + 20 * dmax],
      [xmid + 20 * dmax, ymid -      dmax]
    ];
  }

  function circumcircle(vertices, i, j, k) {
    var x1 = vertices[i][0],
        y1 = vertices[i][1],
        x2 = vertices[j][0],
        y2 = vertices[j][1],
        x3 = vertices[k][0],
        y3 = vertices[k][1],
        fabsy1y2 = Math.abs(y1 - y2),
        fabsy2y3 = Math.abs(y2 - y3),
        xc, yc, m1, m2, mx1, mx2, my1, my2, dx, dy;

    /* Check for coincident points */
    if(fabsy1y2 < EPSILON && fabsy2y3 < EPSILON)
      throw new Error("Eek! Coincident points!");

    if(fabsy1y2 < EPSILON) {
      m2  = -((x3 - x2) / (y3 - y2));
      mx2 = (x2 + x3) / 2.0;
      my2 = (y2 + y3) / 2.0;
      xc  = (x2 + x1) / 2.0;
      yc  = m2 * (xc - mx2) + my2;
    }

    else if(fabsy2y3 < EPSILON) {
      m1  = -((x2 - x1) / (y2 - y1));
      mx1 = (x1 + x2) / 2.0;
      my1 = (y1 + y2) / 2.0;
      xc  = (x3 + x2) / 2.0;
      yc  = m1 * (xc - mx1) + my1;
    }

    else {
      m1  = -((x2 - x1) / (y2 - y1));
      m2  = -((x3 - x2) / (y3 - y2));
      mx1 = (x1 + x2) / 2.0;
      mx2 = (x2 + x3) / 2.0;
      my1 = (y1 + y2) / 2.0;
      my2 = (y2 + y3) / 2.0;
      xc  = (m1 * mx1 - m2 * mx2 + my2 - my1) / (m1 - m2);
      yc  = (fabsy1y2 > fabsy2y3) ?
        m1 * (xc - mx1) + my1 :
        m2 * (xc - mx2) + my2;
    }

    dx = x2 - xc;
    dy = y2 - yc;
    return {i: i, j: j, k: k, x: xc, y: yc, r: dx * dx + dy * dy};
  }

  function dedup(edges) {
    var i, j, a, b, m, n;

    for(j = edges.length; j; ) {
      b = edges[--j];
      a = edges[--j];

      for(i = j; i; ) {
        n = edges[--i];
        m = edges[--i];

        if((a === m && b === n) || (a === n && b === m)) {
          edges.splice(j, 2);
          edges.splice(i, 2);
          break;
        }
      }
    }
  }

  Delaunay = {
    triangulate: function(vertices, key) {
      var n = vertices.length,
          i, j, indices, st, open, closed, edges, dx, dy, a, b, c;

      /* Bail if there aren't enough vertices to form any triangles. */
      if(n < 3)
        return [];

      /* Slice out the actual vertices from the passed objects. (Duplicate the
       * array even if we don't, though, since we need to make a supertriangle
       * later on!) */
      vertices = vertices.slice(0);

      if(key)
        for(i = n; i--; )
          vertices[i] = vertices[i][key];

      /* Make an array of indices into the vertex array, sorted by the
       * vertices' x-position. Force stable sorting by comparing indices if
       * the x-positions are equal. */
      indices = new Array(n);

      for(i = n; i--; )
        indices[i] = i;

      indices.sort(function(i, j) {
        var diff = vertices[j][0] - vertices[i][0];
        return diff !== 0 ? diff : i - j;
      });

      /* Next, find the vertices of the supertriangle (which contains all other
       * triangles), and append them onto the end of a (copy of) the vertex
       * array. */
      st = supertriangle(vertices);
      vertices.push(st[0], st[1], st[2]);
      
      /* Initialize the open list (containing the supertriangle and nothing
       * else) and the closed list (which is empty since we havn't processed
       * any triangles yet). */
      open   = [circumcircle(vertices, n + 0, n + 1, n + 2)];
      closed = [];
      edges  = [];

      /* Incrementally add each vertex to the mesh. */
      for(i = indices.length; i--; edges.length = 0) {
        c = indices[i];

        /* For each open triangle, check to see if the current point is
         * inside it's circumcircle. If it is, remove the triangle and add
         * it's edges to an edge list. */
        for(j = open.length; j--; ) {
          /* If this point is to the right of this triangle's circumcircle,
           * then this triangle should never get checked again. Remove it
           * from the open list, add it to the closed list, and skip. */
          dx = vertices[c][0] - open[j].x;
          if(dx > 0.0 && dx * dx > open[j].r) {
            closed.push(open[j]);
            open.splice(j, 1);
            continue;
          }

          /* If we're outside the circumcircle, skip this triangle. */
          dy = vertices[c][1] - open[j].y;
          if(dx * dx + dy * dy - open[j].r > EPSILON)
            continue;

          /* Remove the triangle and add it's edges to the edge list. */
          edges.push(
            open[j].i, open[j].j,
            open[j].j, open[j].k,
            open[j].k, open[j].i
          );
          open.splice(j, 1);
        }

        /* Remove any doubled edges. */
        dedup(edges);

        /* Add a new triangle for each edge. */
        for(j = edges.length; j; ) {
          b = edges[--j];
          a = edges[--j];
          open.push(circumcircle(vertices, a, b, c));
        }
      }

      /* Copy any remaining open triangles to the closed list, and then
       * remove any triangles that share a vertex with the supertriangle,
       * building a list of triplets that represent triangles. */
      for(i = open.length; i--; )
        closed.push(open[i]);
      open.length = 0;

      for(i = closed.length; i--; )
        if(closed[i].i < n && closed[i].j < n && closed[i].k < n)
          open.push(closed[i].i, closed[i].j, closed[i].k);

      /* Yay, we're done! */
      return open;
    },
    contains: function(tri, p) {
      /* Bounding box test first, for quick rejections. */
      if((p[0] < tri[0][0] && p[0] < tri[1][0] && p[0] < tri[2][0]) ||
         (p[0] > tri[0][0] && p[0] > tri[1][0] && p[0] > tri[2][0]) ||
         (p[1] < tri[0][1] && p[1] < tri[1][1] && p[1] < tri[2][1]) ||
         (p[1] > tri[0][1] && p[1] > tri[1][1] && p[1] > tri[2][1]))
        return null;

      var a = tri[1][0] - tri[0][0],
          b = tri[2][0] - tri[0][0],
          c = tri[1][1] - tri[0][1],
          d = tri[2][1] - tri[0][1],
          i = a * d - b * c;

      /* Degenerate tri. */
      if(i === 0.0)
        return null;

      var u = (d * (p[0] - tri[0][0]) - b * (p[1] - tri[0][1])) / i,
          v = (a * (p[1] - tri[0][1]) - c * (p[0] - tri[0][0])) / i;

      /* If we're outside the tri, fail. */
      if(u < 0.0 || v < 0.0 || (u + v) > 1.0)
        return null;

      return [u, v];
    }
  };

  module.exports = Delaunay;
})();
});

/*
* Author    Jonathan Lurie - http://me.jonahanlurie.fr
*
* License   MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


/**
* An instance of TriangulationSparseInterpolationImageFilter performs a triangulation
* of an original dataset followed by a barycentric 2D interpolation. It is used to
* perform a 2D linear interpolation of a sparse dataset.
* The original dataset is specified using the method `.addInput( points )`, where
* `points` is an `Array` of `{x: Number, y: Number, value: Number}`.
* The triangulation is the result of a Delaunay triangulation.
* This filter outputs an `Image2D` with interpolated values only within the boundaries
* of the convex hull created by the triangulation. The size of the output must be
* specified using the method `.setMetadata( "outputSize", {width: Number, height: Number})`.
*
* Note 1: at least 3 unaligned points are required to perform a triangulation
* Note 2: points can be outside the boundaries of the original image
* Note 3: interpolated values are floating point
*
* Note that only single-component images are outputed from this filter.
* 
* **Usage**
* - [examples/TriangleSparseInterpolation.html](../examples/TriangleSparseInterpolation.html)
*/ 

class TriangulationSparseInterpolationImageFilter extends Filter {
  
  constructor(){
    super();
    this.setMetadata( "outputSize", {width: 0, height: 0});
  }
  
  _run(){
    
    var origPoints = null;
    
    // getting the input
    if( "0" in this._input ){
      origPoints = this._input[ 0 ];
    }else{
      console.warn("No input point set were given.");
      return;
    }
    
    var outputSize = this.getMetadata( "outputSize" );
    
    // checking output size
    if( outputSize.width == 0 || outputSize.height == 0 ){
      console.warn("The output size cannot be 0.");
      return;
    }
    
    // remapping the point as an array of ArrayBuffer
    var points = origPoints.map( function(p){
      return [p.x, p.y];
    });
    
    // computing the list of triangles
    var triangleVertices = delaunay.triangulate( points );

    // rearranging the triangles in a propper array that group by 3 the index of vertices used
    var triangles = [];
    for(var i=0; i<=triangleVertices.length-3; i+=3){
      triangles.push( [
        triangleVertices[i],
        triangleVertices[i+1],
        triangleVertices[i+2],
      ] );
    }

    console.log( points );
    console.log( triangles );
    
    // return the area of a triangle using Heron's formula
    // Each point A, B and C is a couple of 2D coords like [Number, Number] 
    function getTriangleArea(A, B, C){
      // manhattan distances
      var _AB = [ A[0] - B[0], A[1] - B[1]];
      var _BC = [ B[0] - C[0], B[1] - C[1]];
      var _CA = [ C[0] - A[0], C[1] - A[1]];
      
      // Euclidian distances - Pythagore
      var a = Math.sqrt( _BC[0]*_BC[0] + _BC[1]*_BC[1] );
      var b = Math.sqrt( _CA[0]*_CA[0] + _CA[1]*_CA[1] );
      var c = Math.sqrt( _AB[0]*_AB[0] + _AB[1]*_AB[1] );
      
      // semiperimeter
      var s = (a + b + c) / 2;
      
      var area = Math.sqrt( s*(s-a)*(s-b)*(s-c) );
      return area;
    }
    
    // creating the output image
    var out = new pixpipe.Image2D({width: Math.round(outputSize.width), height: Math.round(outputSize.height), color: [0]});
    
    // each line of the output image...
    for(var i=0; i<outputSize.width; i++){
      // each column of the output image...
      for(var j=0; j<outputSize.height; j++){
    
        var pixelValue = 0;
        var isInsideTriangle = false;
        var encompassingTriangle = 0;
        
        // each triangle...
        for(var t=0; t<triangles.length; t++){
          var contain = delaunay.contains( 
            [
              points[ triangles[t][0] ], points[ triangles[t][1] ], points[ triangles[t][2] ],
            ],
            [ i, j ]
          );
          
          if( contain ){
            isInsideTriangle = true;
            encompassingTriangle = triangles[ t ];
            break;
          }
        }
    
        if( isInsideTriangle ){
          // vectices of the emcompassing triangle
          var _A = points[ encompassingTriangle[0] ];
          var _B = points[ encompassingTriangle[1] ];
          var _C = points[ encompassingTriangle[2] ];
          
          // current point of the image
          var _P = [ i, j ];
          
          // area of the emcompassing triangle (made only from points of the original dataset)
          var areaTriEncomp = getTriangleArea( _A, _B, _C );
          
          // area of each subtriangles
          var areaABP = getTriangleArea( _A, _B, _P );
          var areaBCP = getTriangleArea( _B, _C, _P );
          var areaCAP = getTriangleArea( _C, _A, _P );
          
          
          // making the color mix
          pixelValue = (areaABP / areaTriEncomp) * origPoints[ encompassingTriangle[2] ].value +
                       (areaBCP / areaTriEncomp) * origPoints[ encompassingTriangle[0] ].value +
                       (areaCAP / areaTriEncomp) * origPoints[ encompassingTriangle[1] ].value ;
        }
    
        out.setPixel( {x: i, y: j}, [ pixelValue ] );
      }
    }
    
    this._output[ 0 ] = out;
  } // en of _run
  
  
} /* END of class TriangulationSparseInterpolationImageFilter */

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

/**
* An instance of CropImageFilter is used to crop an `Image2D`. This filter accepts
* a single input, using `.addInput( myImage )`, then, it requires a top left point
* that must be set with `.setMetadata( "x", Number)` and `.setMetadata( "y", Number)`.
* In addition, you must specify the width and heigth of the output using 
* `.setMetadata( "w", Number)` and `.setMetadata( "h", Number)`.
*
* **Usage**
* - [examples/cropImage2D.html](../examples/cropImage2D.html)
*
*/
class CropImageFilter extends ImageToImageFilter {
  constructor(){
    super();
    this.addInputValidator(0, Image2D);
    
    this.setMetadata( "x", 0 );
    this.setMetadata( "y", 0 );
    this.setMetadata( "w", 0 );
    this.setMetadata( "h", 0 );
  }
  
  
  _run(){
    if( ! this.hasValidInput()){
      console.warn("A filter of type CropImageFilter requires 1 input of category '0' (Image2D)");
      return;
    }
    
    var startX = Math.round( this.getMetadata( "x" ) );
    var startY = Math.round(this.getMetadata( "y" ) );
    var outW = Math.round(this.getMetadata( "w" ) );
    var outH = Math.round(this.getMetadata( "h" ) );
    var endX = startX + outW;
    var endY = startY + outH;
    
    var inputImage = this._getInput( 0 );
    var inputWidth = inputImage.getWidth();
    var inputHeight = inputImage.getHeight();
    var ncpp = inputImage.getNcpp();
    
    if( startX < 0 || startY < 0 || startX >= inputWidth || startY >= inputHeight ||
        endX < 0 || endY < 0 || endX >= inputWidth || endY >= inputHeight){
      console.warn("The query area is out of bound");
      return;
    }
    
    var inputData = inputImage.getData();
    
    var outputImage = new Image2D({ 
      width  : outW,
      height : outH,
      color  : new inputData.constructor( ncpp )
    });
    
    for( var i=0; i<outW; i++){
      for( var j=0; j<outH; j++){
        var inputColor = inputImage.getPixel({ x: i+startX, y: j+startY});
        outputImage.setPixel(
          {x: i, y: j},
          inputColor
        );
      }
    }
    
    this._output[ 0 ] = outputImage;
  }
  
  
} /* END of class CropImageFilter */

var simplify = createCommonjsModule(function (module) {
/*
 (c) 2013, Vladimir Agafonkin
 Simplify.js, a high-performance JS polyline simplification library
 mourner.github.io/simplify-js
*/

(function () { 'use strict';

// to suit your point format, run search/replace for '.x' and '.y';
// for 3D version, see 3d branch (configurability would draw significant performance overhead)

// square distance between 2 points
function getSqDist(p1, p2) {

    var dx = p1.x - p2.x,
        dy = p1.y - p2.y;

    return dx * dx + dy * dy;
}

// square distance from a point to a segment
function getSqSegDist(p, p1, p2) {

    var x = p1.x,
        y = p1.y,
        dx = p2.x - x,
        dy = p2.y - y;

    if (dx !== 0 || dy !== 0) {

        var t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);

        if (t > 1) {
            x = p2.x;
            y = p2.y;

        } else if (t > 0) {
            x += dx * t;
            y += dy * t;
        }
    }

    dx = p.x - x;
    dy = p.y - y;

    return dx * dx + dy * dy;
}
// rest of the code doesn't care about point format

// basic distance-based simplification
function simplifyRadialDist(points, sqTolerance) {

    var prevPoint = points[0],
        newPoints = [prevPoint],
        point;

    for (var i = 1, len = points.length; i < len; i++) {
        point = points[i];

        if (getSqDist(point, prevPoint) > sqTolerance) {
            newPoints.push(point);
            prevPoint = point;
        }
    }

    if (prevPoint !== point) newPoints.push(point);

    return newPoints;
}

// simplification using optimized Douglas-Peucker algorithm with recursion elimination
function simplifyDouglasPeucker(points, sqTolerance) {

    var len = points.length,
        MarkerArray = typeof Uint8Array !== 'undefined' ? Uint8Array : Array,
        markers = new MarkerArray(len),
        first = 0,
        last = len - 1,
        stack = [],
        newPoints = [],
        i, maxSqDist, sqDist, index;

    markers[first] = markers[last] = 1;

    while (last) {

        maxSqDist = 0;

        for (i = first + 1; i < last; i++) {
            sqDist = getSqSegDist(points[i], points[first], points[last]);

            if (sqDist > maxSqDist) {
                index = i;
                maxSqDist = sqDist;
            }
        }

        if (maxSqDist > sqTolerance) {
            markers[index] = 1;
            stack.push(first, index, index, last);
        }

        last = stack.pop();
        first = stack.pop();
    }

    for (i = 0; i < len; i++) {
        if (markers[i]) newPoints.push(points[i]);
    }

    return newPoints;
}

// both algorithms combined for awesome performance
function simplify(points, tolerance, highestQuality) {

    var sqTolerance = tolerance !== undefined ? tolerance * tolerance : 1;

    points = highestQuality ? points : simplifyRadialDist(points, sqTolerance);
    points = simplifyDouglasPeucker(points, sqTolerance);

    return points;
}

// export as AMD module / Node module / browser or worker variable
if (typeof undefined === 'function' && undefined.amd) undefined(function() { return simplify; });
else module.exports = simplify;

})();
});

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link     https://github.com/jonathanlurie/pixpipejs
* Lab      MCIN - Montreal Neurological Institute
*/

/**
* An instance of SimplifyLineStringFilter takes a LineString and simplifies upon
* a given tolerance distance (in pixel, possibly being sub-pixel).
* This filter outputs another LineString with a fewer amount of points.
*
* **Usage**
* - [examples/contourSimplifiedImage2D.html](../examples/contourSimplifiedImage2D.html)
*/
class SimplifyLineStringFilter extends Filter {
  
  constructor(){
    super();
    this.addInputValidator(0, LineString);
    this.setMetadata( "tolerance", 0.1 );
  }
  
  
  _run(){
    
    if( ! this.hasValidInput()){
      console.warn("A filter of type SimplifyLineStringFilter requires 1 input of category '0' (LineString)");
      return;
    }
    
    var inputString = this._getInput( 0 );
    var nod = inputString.getNod();
    var inputPoints = inputString.getData();
    var tolerance = this.getMetadata( "tolerance" );
    
    if( nod != 2){
      console.warn("SimplifyLineStringFilter is only for 2D LineStrings.");
      return;
    }
    
    // points need to be group in an array of {x: Number, y: Number}
    var groupedStringData = new Array( inputPoints.length / 2 );
    
    for(var i=0; i<groupedStringData.length; i++){
      groupedStringData[ i ] = {x: inputPoints[i*2], y: inputPoints[i*2 + 1]};
    }
    
    // simplifying the linestring
    var simplified = simplify(groupedStringData, tolerance, true);
    
    // putting back the data as a big array
    var linearStringData = new Array( simplified.length * 2 );
    
    for(var i=0; i<simplified.length-1; i++){
      linearStringData[i*2] = simplified[i].x;
      linearStringData[i*2 + 1] = simplified[i+1].y;
    }
    
    var outputLineString = new LineString();
    outputLineString.setData( linearStringData, nod );
    outputLineString.copyMetadataFrom( inputString );
    
    this._output[0] = outputLineString;
  }
  
} /* END of class SimplifyLineStringFilter */

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

/**
* AngleToHueWheelHelper has for goal to help visualize angular data such as gradient
* orientation. The idea behind the "hue wheel" is to associate every direction (angle)
* to a color without having the 0/360 interuption.
* The helper takes one Image2D input and gives one RGBA Image2D output. From the output,
* the index of the compnent that contains angular information has to be given using:
* `.setMetadata("component", n)` where `n` by default is `0`.  
*
* Depending on the usage of this filter, the range of angle can varry,
* ie. in [0, 2PI] (the default), or in [-PI/2, PI/2] (in the case of a gradient)
* or even in degrees [0, 360]. In any case, use `.setMetadata("minAngle", ...)`
* and `.setMetadata("maxAngle", ...)`. 
* If the metadata "minAngle" or "maxAngle" is given the value "auto", then the min and max
* values of the image will be looked-up (or computed if not defined).
*
* **Usage**
* - [examples/gradientHueWheelImage2D.html](../examples/gradientHueWheelImage2D.html)
*
*/
class AngleToHueWheelHelper extends ImageToImageFilter {
  
  constructor(){
    super();
    this.addInputValidator(0, Image2D);
    this.setMetadata("component", 0);
    
    this.setMetadata("minAngle", 0);
    this.setMetadata("maxAngle", Math.PI/2);
  }
  
  
  _run(){
    // the input checking
    if( ! this.hasValidInput()){
      console.warn("A filter of type AngleToHueWheelHelper requires 1 input of category '0'.");
      return;
    }
    
    var that = this;
    
    var inputImage = this._getInput(0);
    var ncpp = inputImage.getNcpp();
    var component = this.getMetadata("component");
    
    if( component < 0 && component >= ncpp ){
      console.warn("The component to filter must be valid.");
      return;
    }
    
    var imageIn = this._getInput();
    var width = imageIn.getWidth();
    var height = imageIn.getHeight();
    var ncpp = imageIn.getNcpp();
    
    var minAngle = this.getMetadata("minAngle");
    var maxAngle = this.getMetadata("maxAngle");
    
    if(minAngle === "auto" || maxAngle === "auto"){
      minAngle = imageIn.getMin();
      maxAngle = imageIn.getMax();
    }
    
    var imageOut = new Image2D( {width: width, height: height, color: [0, 0, 0, 255] } );
    var forEachPixelFilter = new pixpipe.ForEachPixelImageFilter();
    
    // add the input input
    forEachPixelFilter.addInput( imageOut );

    forEachPixelFilter.on( "pixel", function(position, color){
      var angle = imageIn.getPixel( position )[component];
      var angle360 = ( (angle - minAngle) / (maxAngle - minAngle) ) * 360;
      var colorRGB = that._hsl2Rgba( angle360, 100, 50 );
      return colorRGB;
    });
    
    // run the filter to create a gradient image
    forEachPixelFilter.update();
    
    if( forEachPixelFilter.getNumberOfOutputs() == 0 ){
      console.warn("No output of ForEachPixelImageFilter.");
      return;
    }
    
    // mapping the output
    this._output[ 0 ] = forEachPixelFilter.getOutput();
    
  }
  
  
  /**
  * 
  * A part of this code was borrowed from github.com/netbeast/colorsys and modified.
  */
  _hsl2Rgba( h, s=100, l=100 ){
    // pseudo constants
    var HUE_MAX = 360;
    var SV_MAX = 100;
    var RGB_MAX = 255;
    
    // ouputs
    var r, g, b;

    h = (h === HUE_MAX) ? 1 : (h % HUE_MAX / HUE_MAX);
    s = (s === SV_MAX) ? 1 : (s % SV_MAX / SV_MAX);
    l = (l === SV_MAX) ? 1 : (l % SV_MAX / SV_MAX);

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      var hue2rgb = function hue2rgb (p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t
        if (t < 1 / 2) return q
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
        return p
      };

      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    
    return [ Math.round(r * RGB_MAX), 
             Math.round(g * RGB_MAX), 
             Math.round(b * RGB_MAX),
             255 ];
  }
  
  
} /* END of class AngleToHueWheelFilter */

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


/**
* A instance of LineStringPrinterOnImage2DHelper prints a list of LineStrings on
* an Image2D. To add the Image2D input, use `.addInput(myImage2D)`.
* To add a LineString, use `.addLineString(ls, c );` where `ls` is a LineString 
* instance and `c` is an Array representing a color (i.e. [255, 0, 0] for red).
*
* **Usage**
* - [examples/contourImage2D.html](../examples/contourImage2D.html)
*
*/
class LineStringPrinterOnImage2DHelper extends ImageToImageFilter {
  
  constructor() {
    super();
    this.addInputValidator(0, Image2D);
    this.setMetadata("lineStrings", []);
    this.setMetadata("lineStringsColors", []);
  }
  
  
  /**
  * Add a LineString instance to be printed on the image
  * @param {LineString} ls - a linestring to add
  * @param {Array} color - of for [R, G, B] or [R, G, B, A] 
  */
  addLineString(ls, color){
    this._metadata.lineStrings.push( ls ) ;
    this._metadata.lineStringsColors.push( color ) ;
  }
  
  
  _run(){
    
    // the input checking
    if( ! this.hasValidInput()){
      console.warn("A filter of type LineStringPrinterOnImage2DHelper requires 1 input of category '0'.");
      return;
    }
    
    var imageIn = this._getInput();
    var imageOut = imageIn.clone();
    var width = imageIn.getWidth();
    var height = imageIn.getHeight();
    var ncpp = imageIn.getNcpp();
    
    var printed = false;
    
    var lineStrings = this._metadata.lineStrings;
    var colors = this._metadata.lineStringsColors;
    
    for(var i=0; i<lineStrings.length; i++){
      
      if(lineStrings[i].getMetadata("nod") != 2){
        console.warn("Linstring must be 2D to be printed on images.");
        continue;
      }
      
      // color verification: ok if same number of channel OR if giving RGB color to RGBA image
      if(ncpp == colors[i].length || (ncpp == 4 && colors[i].length == 3) ){
        
        var lineStringData = lineStrings[i].getData();
        
        for(var j=0; j<lineStringData.length-1; j+=2){
          imageOut.setPixel({x: lineStringData[j], y: lineStringData[j+1]}, colors[i] );
        }
        
        printed = true;
        
      }else{
        continue;
      }
    }
    
    if(printed){
      this._output[0] = imageOut;
    }
    
  } /* END of _run() */
  
  
} /* END of class LineStringPrinterOnImage2DHelper */

/**
* From https://github.com/bpostlethwaite/colormap
*/

var ColorScales = {
	"jet":[{"index":0,"rgb":[0,0,131]},{"index":0.125,"rgb":[0,60,170]},{"index":0.375,"rgb":[5,255,255]},{"index":0.625,"rgb":[255,255,0]},{"index":0.875,"rgb":[250,0,0]},{"index":1,"rgb":[128,0,0]}],

	"hsv":[{"index":0,"rgb":[255,0,0]},{"index":0.169,"rgb":[253,255,2]},{"index":0.173,"rgb":[247,255,2]},{"index":0.337,"rgb":[0,252,4]},{"index":0.341,"rgb":[0,252,10]},{"index":0.506,"rgb":[1,249,255]},{"index":0.671,"rgb":[2,0,253]},{"index":0.675,"rgb":[8,0,253]},{"index":0.839,"rgb":[255,0,251]},{"index":0.843,"rgb":[255,0,245]},{"index":1,"rgb":[255,0,6]}],

	"hot":[{"index":0,"rgb":[0,0,0]},{"index":0.3,"rgb":[230,0,0]},{"index":0.6,"rgb":[255,210,0]},{"index":1,"rgb":[255,255,255]}],

	"cool":[{"index":0,"rgb":[0,255,255]},{"index":1,"rgb":[255,0,255]}],

	"spring":[{"index":0,"rgb":[255,0,255]},{"index":1,"rgb":[255,255,0]}],

	"summer":[{"index":0,"rgb":[0,128,102]},{"index":1,"rgb":[255,255,102]}],

	"autumn":[{"index":0,"rgb":[255,0,0]},{"index":1,"rgb":[255,255,0]}],

	"winter":[{"index":0,"rgb":[0,0,255]},{"index":1,"rgb":[0,255,128]}],

	"bone":[{"index":0,"rgb":[0,0,0]},{"index":0.376,"rgb":[84,84,116]},{"index":0.753,"rgb":[169,200,200]},{"index":1,"rgb":[255,255,255]}],

	"copper":[{"index":0,"rgb":[0,0,0]},{"index":0.804,"rgb":[255,160,102]},{"index":1,"rgb":[255,199,127]}],

	"greys":[{"index":0,"rgb":[0,0,0]},{"index":1,"rgb":[255,255,255]}],

	"yignbu":[{"index":0,"rgb":[8,29,88]},{"index":0.125,"rgb":[37,52,148]},{"index":0.25,"rgb":[34,94,168]},{"index":0.375,"rgb":[29,145,192]},{"index":0.5,"rgb":[65,182,196]},{"index":0.625,"rgb":[127,205,187]},{"index":0.75,"rgb":[199,233,180]},{"index":0.875,"rgb":[237,248,217]},{"index":1,"rgb":[255,255,217]}],

	"greens":[{"index":0,"rgb":[0,68,27]},{"index":0.125,"rgb":[0,109,44]},{"index":0.25,"rgb":[35,139,69]},{"index":0.375,"rgb":[65,171,93]},{"index":0.5,"rgb":[116,196,118]},{"index":0.625,"rgb":[161,217,155]},{"index":0.75,"rgb":[199,233,192]},{"index":0.875,"rgb":[229,245,224]},{"index":1,"rgb":[247,252,245]}],

	"yiorrd":[{"index":0,"rgb":[128,0,38]},{"index":0.125,"rgb":[189,0,38]},{"index":0.25,"rgb":[227,26,28]},{"index":0.375,"rgb":[252,78,42]},{"index":0.5,"rgb":[253,141,60]},{"index":0.625,"rgb":[254,178,76]},{"index":0.75,"rgb":[254,217,118]},{"index":0.875,"rgb":[255,237,160]},{"index":1,"rgb":[255,255,204]}],

	"bluered":[{"index":0,"rgb":[0,0,255]},{"index":1,"rgb":[255,0,0]}],

	"rdbu":[{"index":0,"rgb":[5,10,172]},{"index":0.35,"rgb":[106,137,247]},{"index":0.5,"rgb":[190,190,190]},{"index":0.6,"rgb":[220,170,132]},{"index":0.7,"rgb":[230,145,90]},{"index":1,"rgb":[178,10,28]}],

	"picnic":[{"index":0,"rgb":[0,0,255]},{"index":0.1,"rgb":[51,153,255]},{"index":0.2,"rgb":[102,204,255]},{"index":0.3,"rgb":[153,204,255]},{"index":0.4,"rgb":[204,204,255]},{"index":0.5,"rgb":[255,255,255]},{"index":0.6,"rgb":[255,204,255]},{"index":0.7,"rgb":[255,153,255]},{"index":0.8,"rgb":[255,102,204]},{"index":0.9,"rgb":[255,102,102]},{"index":1,"rgb":[255,0,0]}],

	"rainbow":[{"index":0,"rgb":[150,0,90]},{"index":0.125,"rgb":[0,0,200]},{"index":0.25,"rgb":[0,25,255]},{"index":0.375,"rgb":[0,152,255]},{"index":0.5,"rgb":[44,255,150]},{"index":0.625,"rgb":[151,255,0]},{"index":0.75,"rgb":[255,234,0]},{"index":0.875,"rgb":[255,111,0]},{"index":1,"rgb":[255,0,0]}],

	"portland":[{"index":0,"rgb":[12,51,131]},{"index":0.25,"rgb":[10,136,186]},{"index":0.5,"rgb":[242,211,56]},{"index":0.75,"rgb":[242,143,56]},{"index":1,"rgb":[217,30,30]}],

	"blackbody":[{"index":0,"rgb":[0,0,0]},{"index":0.2,"rgb":[230,0,0]},{"index":0.4,"rgb":[230,210,0]},{"index":0.7,"rgb":[255,255,255]},{"index":1,"rgb":[160,200,255]}],

	"earth":[{"index":0,"rgb":[0,0,130]},{"index":0.1,"rgb":[0,180,180]},{"index":0.2,"rgb":[40,210,40]},{"index":0.4,"rgb":[230,230,50]},{"index":0.6,"rgb":[120,70,20]},{"index":1,"rgb":[255,255,255]}],

	"electric":[{"index":0,"rgb":[0,0,0]},{"index":0.15,"rgb":[30,0,100]},{"index":0.4,"rgb":[120,0,100]},{"index":0.6,"rgb":[160,90,0]},{"index":0.8,"rgb":[230,200,0]},{"index":1,"rgb":[255,250,220]}],

	"viridis": [{"index":0,"rgb":[68,1,84]},{"index":0.13,"rgb":[71,44,122]},{"index":0.25,"rgb":[59,81,139]},{"index":0.38,"rgb":[44,113,142]},{"index":0.5,"rgb":[33,144,141]},{"index":0.63,"rgb":[39,173,129]},{"index":0.75,"rgb":[92,200,99]},{"index":0.88,"rgb":[170,220,50]},{"index":1,"rgb":[253,231,37]}],

	"inferno": [{"index":0,"rgb":[0,0,4]},{"index":0.13,"rgb":[31,12,72]},{"index":0.25,"rgb":[85,15,109]},{"index":0.38,"rgb":[136,34,106]},{"index":0.5,"rgb":[186,54,85]},{"index":0.63,"rgb":[227,89,51]},{"index":0.75,"rgb":[249,140,10]},{"index":0.88,"rgb":[249,201,50]},{"index":1,"rgb":[252,255,164]}],

	"magma": [{"index":0,"rgb":[0,0,4]},{"index":0.13,"rgb":[28,16,68]},{"index":0.25,"rgb":[79,18,123]},{"index":0.38,"rgb":[129,37,129]},{"index":0.5,"rgb":[181,54,122]},{"index":0.63,"rgb":[229,80,100]},{"index":0.75,"rgb":[251,135,97]},{"index":0.88,"rgb":[254,194,135]},{"index":1,"rgb":[252,253,191]}],

	"plasma": [{"index":0,"rgb":[13,8,135]},{"index":0.13,"rgb":[75,3,161]},{"index":0.25,"rgb":[125,3,168]},{"index":0.38,"rgb":[168,34,150]},{"index":0.5,"rgb":[203,70,121]},{"index":0.63,"rgb":[229,107,93]},{"index":0.75,"rgb":[248,148,65]},{"index":0.88,"rgb":[253,195,40]},{"index":1,"rgb":[240,249,33]}],

	"warm": [{"index":0,"rgb":[125,0,179]},{"index":0.13,"rgb":[172,0,187]},{"index":0.25,"rgb":[219,0,170]},{"index":0.38,"rgb":[255,0,130]},{"index":0.5,"rgb":[255,63,74]},{"index":0.63,"rgb":[255,123,0]},{"index":0.75,"rgb":[234,176,0]},{"index":0.88,"rgb":[190,228,0]},{"index":1,"rgb":[147,255,0]}],

	"cool2": [{"index":0,"rgb":[125,0,179]},{"index":0.13,"rgb":[116,0,218]},{"index":0.25,"rgb":[98,74,237]},{"index":0.38,"rgb":[68,146,231]},{"index":0.5,"rgb":[0,204,197]},{"index":0.63,"rgb":[0,247,146]},{"index":0.75,"rgb":[0,255,88]},{"index":0.88,"rgb":[40,255,8]},{"index":1,"rgb":[147,255,0]}],

	"rainbow-soft": [{"index":0,"rgb":[125,0,179]},{"index":0.1,"rgb":[199,0,180]},{"index":0.2,"rgb":[255,0,121]},{"index":0.3,"rgb":[255,108,0]},{"index":0.4,"rgb":[222,194,0]},{"index":0.5,"rgb":[150,255,0]},{"index":0.6,"rgb":[0,255,55]},{"index":0.7,"rgb":[0,246,150]},{"index":0.8,"rgb":[50,167,222]},{"index":0.9,"rgb":[103,51,235]},{"index":1,"rgb":[124,0,186]}],

	"bathymetry": [{"index":0,"rgb":[40,26,44]},{"index":0.13,"rgb":[59,49,90]},{"index":0.25,"rgb":[64,76,139]},{"index":0.38,"rgb":[63,110,151]},{"index":0.5,"rgb":[72,142,158]},{"index":0.63,"rgb":[85,174,163]},{"index":0.75,"rgb":[120,206,163]},{"index":0.88,"rgb":[187,230,172]},{"index":1,"rgb":[253,254,204]}],

	"cdom": [{"index":0,"rgb":[47,15,62]},{"index":0.13,"rgb":[87,23,86]},{"index":0.25,"rgb":[130,28,99]},{"index":0.38,"rgb":[171,41,96]},{"index":0.5,"rgb":[206,67,86]},{"index":0.63,"rgb":[230,106,84]},{"index":0.75,"rgb":[242,149,103]},{"index":0.88,"rgb":[249,193,135]},{"index":1,"rgb":[254,237,176]}],

	"chlorophyll": [{"index":0,"rgb":[18,36,20]},{"index":0.13,"rgb":[25,63,41]},{"index":0.25,"rgb":[24,91,59]},{"index":0.38,"rgb":[13,119,72]},{"index":0.5,"rgb":[18,148,80]},{"index":0.63,"rgb":[80,173,89]},{"index":0.75,"rgb":[132,196,122]},{"index":0.88,"rgb":[175,221,162]},{"index":1,"rgb":[215,249,208]}],

	"density": [{"index":0,"rgb":[54,14,36]},{"index":0.13,"rgb":[89,23,80]},{"index":0.25,"rgb":[110,45,132]},{"index":0.38,"rgb":[120,77,178]},{"index":0.5,"rgb":[120,113,213]},{"index":0.63,"rgb":[115,151,228]},{"index":0.75,"rgb":[134,185,227]},{"index":0.88,"rgb":[177,214,227]},{"index":1,"rgb":[230,241,241]}],

	"freesurface-blue": [{"index":0,"rgb":[30,4,110]},{"index":0.13,"rgb":[47,14,176]},{"index":0.25,"rgb":[41,45,236]},{"index":0.38,"rgb":[25,99,212]},{"index":0.5,"rgb":[68,131,200]},{"index":0.63,"rgb":[114,156,197]},{"index":0.75,"rgb":[157,181,203]},{"index":0.88,"rgb":[200,208,216]},{"index":1,"rgb":[241,237,236]}],

	"freesurface-red": [{"index":0,"rgb":[60,9,18]},{"index":0.13,"rgb":[100,17,27]},{"index":0.25,"rgb":[142,20,29]},{"index":0.38,"rgb":[177,43,27]},{"index":0.5,"rgb":[192,87,63]},{"index":0.63,"rgb":[205,125,105]},{"index":0.75,"rgb":[216,162,148]},{"index":0.88,"rgb":[227,199,193]},{"index":1,"rgb":[241,237,236]}],

	"oxygen": [{"index":0,"rgb":[64,5,5]},{"index":0.13,"rgb":[106,6,15]},{"index":0.25,"rgb":[144,26,7]},{"index":0.38,"rgb":[168,64,3]},{"index":0.5,"rgb":[188,100,4]},{"index":0.63,"rgb":[206,136,11]},{"index":0.75,"rgb":[220,174,25]},{"index":0.88,"rgb":[231,215,44]},{"index":1,"rgb":[248,254,105]}],

	"par": [{"index":0,"rgb":[51,20,24]},{"index":0.13,"rgb":[90,32,35]},{"index":0.25,"rgb":[129,44,34]},{"index":0.38,"rgb":[159,68,25]},{"index":0.5,"rgb":[182,99,19]},{"index":0.63,"rgb":[199,134,22]},{"index":0.75,"rgb":[212,171,35]},{"index":0.88,"rgb":[221,210,54]},{"index":1,"rgb":[225,253,75]}],

	"phase": [{"index":0,"rgb":[145,105,18]},{"index":0.13,"rgb":[184,71,38]},{"index":0.25,"rgb":[186,58,115]},{"index":0.38,"rgb":[160,71,185]},{"index":0.5,"rgb":[110,97,218]},{"index":0.63,"rgb":[50,123,164]},{"index":0.75,"rgb":[31,131,110]},{"index":0.88,"rgb":[77,129,34]},{"index":1,"rgb":[145,105,18]}],

	"salinity": [{"index":0,"rgb":[42,24,108]},{"index":0.13,"rgb":[33,50,162]},{"index":0.25,"rgb":[15,90,145]},{"index":0.38,"rgb":[40,118,137]},{"index":0.5,"rgb":[59,146,135]},{"index":0.63,"rgb":[79,175,126]},{"index":0.75,"rgb":[120,203,104]},{"index":0.88,"rgb":[193,221,100]},{"index":1,"rgb":[253,239,154]}],

	"temperature": [{"index":0,"rgb":[4,35,51]},{"index":0.13,"rgb":[23,51,122]},{"index":0.25,"rgb":[85,59,157]},{"index":0.38,"rgb":[129,79,143]},{"index":0.5,"rgb":[175,95,130]},{"index":0.63,"rgb":[222,112,101]},{"index":0.75,"rgb":[249,146,66]},{"index":0.88,"rgb":[249,196,65]},{"index":1,"rgb":[232,250,91]}],

	"turbidity": [{"index":0,"rgb":[34,31,27]},{"index":0.13,"rgb":[65,50,41]},{"index":0.25,"rgb":[98,69,52]},{"index":0.38,"rgb":[131,89,57]},{"index":0.5,"rgb":[161,112,59]},{"index":0.63,"rgb":[185,140,66]},{"index":0.75,"rgb":[202,174,88]},{"index":0.88,"rgb":[216,209,126]},{"index":1,"rgb":[233,246,171]}],

	"velocity-blue": [{"index":0,"rgb":[17,32,64]},{"index":0.13,"rgb":[35,52,116]},{"index":0.25,"rgb":[29,81,156]},{"index":0.38,"rgb":[31,113,162]},{"index":0.5,"rgb":[50,144,169]},{"index":0.63,"rgb":[87,173,176]},{"index":0.75,"rgb":[149,196,189]},{"index":0.88,"rgb":[203,221,211]},{"index":1,"rgb":[254,251,230]}],

	"velocity-green": [{"index":0,"rgb":[23,35,19]},{"index":0.13,"rgb":[24,64,38]},{"index":0.25,"rgb":[11,95,45]},{"index":0.38,"rgb":[39,123,35]},{"index":0.5,"rgb":[95,146,12]},{"index":0.63,"rgb":[152,165,18]},{"index":0.75,"rgb":[201,186,69]},{"index":0.88,"rgb":[233,216,137]},{"index":1,"rgb":[255,253,205]}],

	"cubehelix": [{"index":0,"rgb":[0,0,0]},{"index":0.07,"rgb":[22,5,59]},{"index":0.13,"rgb":[60,4,105]},{"index":0.2,"rgb":[109,1,135]},{"index":0.27,"rgb":[161,0,147]},{"index":0.33,"rgb":[210,2,142]},{"index":0.4,"rgb":[251,11,123]},{"index":0.47,"rgb":[255,29,97]},{"index":0.53,"rgb":[255,54,69]},{"index":0.6,"rgb":[255,85,46]},{"index":0.67,"rgb":[255,120,34]},{"index":0.73,"rgb":[255,157,37]},{"index":0.8,"rgb":[241,191,57]},{"index":0.87,"rgb":[224,220,93]},{"index":0.93,"rgb":[218,241,142]},{"index":1,"rgb":[227,253,198]}]
};

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


/**
* A Colormap instance is a range of color and can be used in two ways. The first,
* is by getting a single color using `.getValueAt(p)` where `p` is a position in [0, 1] and, second,
* by building en entire LUT with a given granularity and then getting back these values.
* In case of intensive use (ie. applying fake colors), building a LUT is a faster option.
* Once a LUT is built,  an image of this LUT can be created (horizontal or vertical, flipped or not).
* This image, which is an Image2D is not supposed to be used as a LUT but just as a visual reference.
*
* **Usage**
* - [examples/colormap.html](../examples/colormap.html)
*
*/
class Colormap extends PixpipeObject {

  /**
  * Build a colormap with some options.
  * @param {Object} options - here is the list of options:
  *     style {String} - one of the available styles (see property names in ColorScales.js)
  *     description {Object} - colormap description like in ColorScales.js. Can also be the equivalent JSON string.
  *     lutSize {Number} - Number of samples to pregenerate a LUT
  *     Note: "style" and "description" are mutually exclusive and "style" has the priority in case both are set.
  */
  constructor( options = {} ) {
    super();
    this._type = Colormap.TYPE();
    this._colormapDescription = null;
    this._LUT = [];

    var style = this._getOption(options, "style", null);

    if( style ){
      this.setStyle( style );
    }else {
      var description = this._getOption(options, "description", null);
      this.setDescription( description );
    }

    if( this._colormapDescription ){
      var lutSize = this._getOption(options, "lutSize", null);
      if( lutSize ){
        this.buildLut( lutSize );
      }
    }

  }


  /**
  * Hardcode the datatype
  */
  static TYPE(){
    return "COLORMAP";
  }


  /**
  * [STATIC]
  * Get all the style id available
  * @return {Array} all the styles
  */
  static getAvailableStyles(){
    return Object.keys(ColorScales)
  }


  /**
  * Define the style of the colormap
  * @param {String} style - the colormap style. They are all listed with `Colormap.getAvailableStyles()`
  */
  setStyle( style ){
    if(style in ColorScales){
      if( this._validateDescription( ColorScales[ style ] ) ){
        this._colormapDescription = JSON.parse(JSON.stringify( ColorScales[ style ] ));
      }
    }else {
      console.warn("The given colormap style des not exist.");
    }
  }


  /**
  * Set the description of the colormap. See ColorScales.js for the format
  * @param {Object} d - description, can be the equivalent JSON string
  */
  setDescription( d ){
    // the description in argument can be a json string
    var description = typeof d === "string" ? JSON.parse( d ) : d;

    if(description && this._validateDescription(description) ){
      this._colormapDescription = description;
    }
  }


  /**
  * [PRIVATE]
  * Validates a colormap description integrity.
  * @return {Boolean} true is the description is valid, false if not
  */
  _validateDescription( d ){
    if( ! Array.isArray(d) ){
      console.warn("The colormap description has to be an Array");
      return false;
    }

    for(var i=0; i<d.length; i++){
      // each color segment is an object containing a position as 'index'
      // and an array of number as "rgb"

      // each is a non-null object
      if( d[i] !== null && typeof d[i] === 'object' ){
        if( "index" in d[i] && "rgb" in d[i]){
          if(typeof d[i].index === 'number'){
            if( d[i].index < 0 || d[i].index >1 ){
              console.warn("Each colormap segment 'index' property should be in [0, 1]");
              return false;
            }
          }else{
            console.warn("Each colormap segment 'index' property should be a number.");
            return false;
          }

          // the rgb property has to be an array
          if( Array.isArray( d[i].rgb ) ){
            if(d[i].rgb.length == 3){
              for(var j=0; j<d[i].rgb.length; j++){
                if( d[i].rgb[j] < 0 || d[i].rgb[j] > 255 ){
                  console.warn("The colormap must have only values in [0, 255]");
                  return false;
                }
              }
            }else{
              console.warn("Each colormap segment 'rgb' should contain 3 values");
              return false;
            }
          }
        }else{
          console.warn("Each colormap segment must have a 'index' property and a 'rgb' property.");
          return false;
        }
      }else{
        console.warn("Each colormap segment must be a non-null object");
        return false;
      }
    }
    return true;
  }


  /**
  * Get the color at the colormap position
  * @param {Number} position - position within the colormap in [0, 1]
  * @return {Array} color array as [r, g, b] , values being in [0, 255]
  */
  getValueAt( position ){
    if( !this._colormapDescription ){
      console.warn("The colormap description is not defined.");
      return null;
    }

    // case 1: before the first "index" position
    if(position <= this._colormapDescription[0].index){
      return this._colormapDescription[0].rgb.slice()
    }

    // case 2: after the last "index" position
    if(position >= this._colormapDescription[this._colormapDescription.length - 1].index){
      return this._colormapDescription[this._colormapDescription.length - 1].rgb.slice()
    }

    // case 3: between 2 values of the descrition (most likely to happen)
    for(var i=0; i<this._colormapDescription.length-1; i++){
      if( position >= this._colormapDescription[i].index && position < this._colormapDescription[i+1].index ){

        var unitDistanceToFirst = (position - this._colormapDescription[i].index) / (this._colormapDescription[i+1].index -  this._colormapDescription[i].index);
        var unitDistanceToSecond = 1 - unitDistanceToFirst;

        var color = [
          Math.round(this._colormapDescription[i].rgb[0] * unitDistanceToSecond + this._colormapDescription[i+1].rgb[0] * unitDistanceToFirst), // R
          Math.round(this._colormapDescription[i].rgb[1] * unitDistanceToSecond + this._colormapDescription[i+1].rgb[1] * unitDistanceToFirst), // G
          Math.round(this._colormapDescription[i].rgb[2] * unitDistanceToSecond + this._colormapDescription[i+1].rgb[2] * unitDistanceToFirst), // B
        ];

        return color;
      }
    }
  }


  /**
  * Build a LUT from the colormap description
  * @param {Number} size - number of samples in the LUT
  */
  buildLut( size ){
    if( !this._colormapDescription ){
      console.warn("The colormap description is not defined, the LUT cannot be created");
      return null;
    }

    if( size < 0 ){
      console.warn("Size of the colormap can not be negative.");
      return;
    }

    this._LUT = new Array( size );

    for(var i=0; i<size; i++){
      this._LUT[i] = this.getValueAt( i/size  + 0.5/size );
    }
  }


  /**
  * Get the color within the internal LUT
  * @param {Number} index - the index in the LUT
  * @return {Array} color array as [r, g, b] , values being in [0, 255]
  */
  getLutAt( index ){
    if( index <0 || index > this._LUT.length )
      return null;

    return this._LUT[ index ];
  }


  /**
  * Creates a horizontal Image2D of the colormap. The height is 1px and
  * the width is the size of the LUT currently in use.
  * @param {Boolean} flip - flips the colormap image
  * @return {Image2D} the result image
  */
  createHorizontalLutImage( flip=false ){
    if(! this._LUT ){
      console.warn("The LUT must be built before creating a LUT image.");
      return;
    }

    var LutSize = this._LUT.length;
    var colorStrip = new Image2D({width: LutSize, height: 1, color: [0, 0, 0]});

    for(var i=0; i<LutSize; i++){
      var positionInLut = flip ? (LutSize - i - 1) : i;
      colorStrip.setPixel( {x: i, y: 0},  this._LUT[ positionInLut ] );
    }

    return colorStrip;
  }


  /**
  * Creates a vertical Image2D of the colormap. The height is 1px and
  * the width is the size of the LUT currently in use.
  * @param {Boolean} flip - flips the colormap image
  * @return {Image2D} the result image
  */
  createVerticalLutImage( flip=false ){
    if(! this._LUT ){
      console.warn("The LUT must be built before creating a LUT image.");
      return;
    }

    var LutSize = this._LUT.length;
    var colorStrip = new Image2D({width: 1, height: LutSize, color: [0, 0, 0]});

    for(var i=0; i<LutSize; i++){
      var positionInLut = flip ? (LutSize - i - 1) : i;
      colorStrip.setPixel( {x: 0, y: i},  this._LUT[ positionInLut ] );
    }

    return colorStrip;
  }


  /**
  * Add a color to the color description. This color must be at a non-taken index
  * @param {Number} index - index to place the color, must be in [0, 1]
  * @param {Array} rgb - rgb array of the form [r, g, b], each value being in [0, 255]
  * @return {Boolean} true if the color was succesfully added, false if not
  */
  addColor( index, rgb ){
    // the colormap is possibly empty
    if( !this._colormapDescription ){
      this._colormapDescription = [];
    }

    if(index<0 || index>1){
      console.warn("The color cannot be added because its index is out of range [0, 1]");
      return false;
    }

    // checking if a color is already present at the given index
    var indexAlreadyPresent = this._colormapDescription.find(function(indexAndColor){
      return indexAndColor.index == index;
    });

    if( indexAlreadyPresent ){
      console.warn("A color is already present at index " + index);
      return false;
    }

    if( rgb && Array.isArray(rgb) && rgb.length == 3){
      for(var i=0; i<rgb.length; i++){
        if(typeof rgb[i] !== 'number' || rgb[i] < 0  || rgb[i] > 255){
          console.warn("The rgb colors must be in [0, 255]");
          return false;
        }
      }
    }else{
      console.warn("The color cannot be added because its rgb array is the wrong size.");
      return false;
    }

    // data integrity is ok
    this._colormapDescription.push({"index":index,"rgb":rgb.slice()});
    this._colormapDescription.sort(function(a, b) {
      return a.index - b.index;
    });

    return true;
  }


  /**
  * Remove the color at the given index
  * @param {Number} index - the [0, 1] index of the color to remove
  * @return {Boolean} true if successfully remove, false if not
  */
  removeColor( index ){
    if( !this._colormapDescription ){
      console.warn("The colormap description is empty.");
      return false;
    }

    var indexAlreadyIn = this._colormapDescription.findIndex(function(element){
      return (element.index == index);
    });

    if( indexAlreadyIn == -1 ){
      console.warn("Such index does not exist.");
      return false;
    }

    this._colormapDescription.splice(indexAlreadyIn, 1);
    return true;
  }


  /**
  * Get a json version of the colormap description
  * @return {String} the json string
  */
  toJson(){
    return JSON.stringify(this._colormapDescription);
  }


} /* END of class Colormap */

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


/**
* An instance of Image3DToMosaicFilter takes an Image3D as Input and output a
* mosaic composed of each slice. The axis: "xspace", "yspace" or "zspace" can be
* specified with `setMetadata("axis", "xspace")`, the default being xspace.
* The default output image is 4096x4096 but these boundaries can be changed using
* `setMetadata("maxWidth", n)` and `setMetadata("maxHeight", m)`.
* These are boundaries so the size of the output image(s) will possibly be lower
* to not contain unused space.
* If mosaicing the whole given Image3D does not fit in maxWidth*maxHeight, more
* Image2D will be created and accessible through `getOutput(n)`.
* All output image have the same size so that the last one may have dead space.
* To know precisely the size of the output mosaic use `getMetadata("gridWidth")`
* and `getMetadata("gridHeight")`, this will give the number of slices used in
* horizontal and vertical respectively.
*
* **Usage**
* - [examples/niftiToMosaic.html](../examples/niftiToMosaic.html)
*/
class Image3DToMosaicFilter extends Filter{

  constructor(){
    super();
    this.addInputValidator(0, Image3D);

    // default settings
    this.setMetadata("maxWidth", 4096);
    this.setMetadata("maxHeight", 4096);
    this.setMetadata("axis", "xspace");
    this.setMetadata("time", 0);
  }


  _run(){
    if(! this.hasValidInput() ){
      return;
    }

    var inputImage3D = this._getInput(0);
    var spaceInfo = inputImage3D.getMetadata( this.getMetadata("axis") );

    if(!spaceInfo){
      console.warn("Sampling axis for mosaicing was not poperly set. Has to be 'xspace', 'yspace' or 'zspace'.");
      return;
    }

    var numOfSlices = spaceInfo.space_length;
    var width = spaceInfo.width;
    var height = spaceInfo.height;
    
    // dealing with time series
    var startTime = 0;
    var endTime = 1;
    
    if( inputImage3D.hasMetadata("time") ){
      var timeInfo = inputImage3D.getMetadata("time");
      var timeLength = timeInfo.space_length;
      
      if(this._metadata.time == -1 ){
        startTime = 0;
        endTime = timeLength;
      }else if( this._metadata.time < timeLength){
        startTime = this._metadata.time;
        endTime = startTime + 1;
      }
    }
    
    var numberOfSlicesWithTime = numOfSlices * (endTime-startTime);

    // number of image we can fit in the with and heigth of an output image
    var widthFit = Math.floor( this.getMetadata("maxWidth") / width );
    var heightFit = Math.floor( this.getMetadata("maxHeight") / height );

    // size of the ouput image(s)
    var outputWidth = widthFit * width;
    var outputHeight = heightFit * height;
    var slicePerOutputIm = widthFit * heightFit;

    // Number of output image(s) necessary to cover the whole Image3D dataset
    //var outputNecessary = Math.ceil( numOfSlices / slicePerOutputIm ); // does not work for time series
    var outputNecessary = Math.ceil( numberOfSlicesWithTime / slicePerOutputIm );

    // if only one output, maybe it's not filled entirely, so we can make it a bit smaller
    if( outputNecessary == 1){
      outputHeight = Math.ceil( numberOfSlicesWithTime / widthFit ) * height;
    }

    this.setMetadata("gridWidth", outputWidth / width);
    this.setMetadata("gridHeight", outputHeight / height);

    var outputCounter = 0;
    var sliceCounter = 0;
    var sliceIndexCurrentOutput = 0;

    var outImage = null;

    // the 3 following functions are a work around to fetch voxel along the right axis
    function fetchAlongXspace(i, j, sliceIndex, time){
      return inputImage3D.getIntensity_xyz(sliceIndex, i, j, time)
    }

    function fetchAlongYspace(i, j, sliceIndex, time){
      return inputImage3D.getIntensity_xyz(i, sliceIndex, j, time)
    }

    function fetchAlongZspace(i, j, sliceIndex, time){
      return inputImage3D.getIntensity_xyz(i, j,  sliceIndex, time)
    }

    var fetchAlongAxis = null;

    if( this._metadata.axis === "xspace")
      fetchAlongAxis = fetchAlongXspace;
    else if( this._metadata.axis === "yspace")
      fetchAlongAxis = fetchAlongYspace;
    else if( this._metadata.axis === "zspace")
      fetchAlongAxis = fetchAlongZspace;
    
    if( !fetchAlongAxis ){
      console.warn("The axis to sample along for the mosaic was not properly set.");
      return;
    }

    // to make it works no matter the ncpp
    var initPixel = new Array( inputImage3D.getMetadata("ncpp") ).fill(0);
    
    for(var t=startTime; t<endTime; t++){

      // for each slice
      for(var sliceIndex=0; sliceIndex<numOfSlices; sliceIndex++){
        
        // create a new output image when the current is full (or not init)
        if( sliceCounter%slicePerOutputIm == 0 ){
          outImage = new Image2D({width: outputWidth, height: outputHeight, color: initPixel});
          this._output[ outputCounter ] = outImage;
          sliceIndexCurrentOutput = 0;
          outputCounter++;
        }

        var col = sliceIndexCurrentOutput % widthFit;
        var row = Math.floor( sliceIndexCurrentOutput / widthFit );
        sliceIndexCurrentOutput ++;

        var offsetPixelCol = col * width;
        var offsetPixelRow = row * height;

        // for each row of the input slice
        for(var y=0; y<height; y++){
          // for each col of the output image
          for(var x=0; x<width; x++){
            var voxelValue = [fetchAlongAxis(x, y,  sliceIndex, t)];
            
            outImage.setPixel(
              {x: offsetPixelCol+x, y: offsetPixelRow+y},
              voxelValue
            );
          }
        }
        sliceCounter ++;

      } /* END for each slice*/
    
    } /* END for each time sample */

  }

} /* END of class Image3DToMosaicFilter */

exports.PixpipeObject = PixpipeObject;
exports.Filter = Filter;
exports.Signal1D = Signal1D;
exports.Image2D = Image2D;
exports.Image3D = Image3D;
exports.ImageToImageFilter = ImageToImageFilter;
exports.MniVolume = MniVolume;
exports.LineString = LineString;
exports.CanvasImageWriter = CanvasImageWriter;
exports.UrlImageReader = UrlImageReader;
exports.FileImageReader = FileImageReader;
exports.FileToArrayBufferReader = FileToArrayBufferReader;
exports.UrlToArrayBufferReader = UrlToArrayBufferReader;
exports.Minc2Decoder = Minc2Decoder;
exports.NiftiDecoder = NiftiDecoder;
exports.PixpEncoder = PixpEncoder;
exports.PixpDecoder = PixpDecoder;
exports.Image3DGenericDecoder = Image3DGenericDecoder;
exports.TiffDecoder = TiffDecoder;
exports.MghDecoder = MghDecoder;
exports.EegModDecoder = EegModDecoder;
exports.PixBinEncoder = PixBinEncoder;
exports.PixBinDecoder = PixBinDecoder;
exports.JpegDecoder = JpegDecoder;
exports.PngDecoder = PngDecoder;
exports.ComponentProjectionImage2DFilter = ComponentProjectionImage2DFilter;
exports.ComponentMergeImage2DFilter = ComponentMergeImage2DFilter;
exports.ForwardFourierSignalFilter = ForwardFourierSignalFilter;
exports.InverseFourierSignalFilter = InverseFourierSignalFilter;
exports.ForwardFourierImageFilter = ForwardFourierImageFilter;
exports.InverseFourierImageFilter = InverseFourierImageFilter;
exports.ForEachPixelImageFilter = ForEachPixelImageFilter;
exports.SpectralScaleImageFilter = SpectralScaleImageFilter;
exports.ImageBlendExpressionFilter = ImageBlendExpressionFilter;
exports.SpatialConvolutionFilter = SpatialConvolutionFilter;
exports.MultiplyImageFilter = MultiplyImageFilter;
exports.SimpleThresholdFilter = SimpleThresholdFilter;
exports.ImageDerivativeFilter = ImageDerivativeFilter;
exports.GradientImageFilter = GradientImageFilter;
exports.NormalizeImageFilter = NormalizeImageFilter;
exports.ContourImage2DFilter = ContourImage2DFilter;
exports.FloodFillImageFilter = FloodFillImageFilter;
exports.ContourHolesImage2DFilter = ContourHolesImage2DFilter;
exports.ForEachPixelReadOnlyFilter = ForEachPixelReadOnlyFilter;
exports.TerrainRgbToElevationImageFilter = TerrainRgbToElevationImageFilter;
exports.NearestNeighborSparseInterpolationImageFilter = NearestNeighborSparseInterpolationImageFilter;
exports.IDWSparseInterpolationImageFilter = IDWSparseInterpolationImageFilter;
exports.TriangulationSparseInterpolationImageFilter = TriangulationSparseInterpolationImageFilter;
exports.CropImageFilter = CropImageFilter;
exports.SimplifyLineStringFilter = SimplifyLineStringFilter;
exports.AngleToHueWheelHelper = AngleToHueWheelHelper;
exports.LineStringPrinterOnImage2DHelper = LineStringPrinterOnImage2DHelper;
exports.Colormap = Colormap;
exports.Image3DToMosaicFilter = Image3DToMosaicFilter;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=pixpipe.js.map
