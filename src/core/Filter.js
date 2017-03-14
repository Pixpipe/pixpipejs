/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { PixpipeObject } from './PixpipeObject.js';
import { Pipeline } from './Pipeline.js';


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

    // the category may not exist, we create it
    if( !(category in this._output) ){
      var outputObject = new dataType();
      this._output[category] = outputObject;
    }else{
      // TODO: if output object exists but is not from dataType: error!
      outputObject = this._output[category];
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
      valid = valid && that._getInput( key ).isOfType( that._inputValidator[ key ] )
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

export { Filter }
