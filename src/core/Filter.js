/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


import { PixpipeObject } from './PixpipeObject.js';


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
    if("TYPE" in InputType){
      this._inputValidator[ category ] = InputType.TYPE();
    }else{
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
    var inputCategories = Object.keys( this._inputValidator );
    var valid = true;

    if(inputCategories.length == 0){
      valid = false;
      console.warn("No input validator was added. Filter cannot run. Use addInputValidator(...) to specify input types.");
    }

    inputCategories.forEach( function(key){
      var inputOfCategory = that._getInput( key );

      if(inputOfCategory){
        if("isOfType" in inputOfCategory){
          valid = valid && inputOfCategory.isOfType( that._inputValidator[ key ] )
        }else{
          try{
            valid = valid && (inputOfCategory instanceof that._inputValidator[ key ] );
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
    this._timer[ recordName ] = 0;
  }


  /**
  * @return {Number} the elapsed time in ms between fromRecord and toRecord.
  * Return -1 if one or both time record
  */
  getTime(fromRecord, toRecord, print=false){
    if( fromRecord in this._timer && toRecord in this._timer ){
      var t = Math.abs(this._timer[toRecord] - this._timer[fromRecord])

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

        returnValue = this._events[eventName].apply(this, argToSend )
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

export { Filter }
