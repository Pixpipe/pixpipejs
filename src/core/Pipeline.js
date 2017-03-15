/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { PixpipeObject } from './PixpipeObject.js';

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

export { Pipeline };
