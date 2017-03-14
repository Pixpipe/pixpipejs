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
    this._type = Filter.TYPE();

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
  }


  /**
  *
  */
  update(forceAll = false){

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
    for(var f=0; f<this._filters.length; f++){
      // TODO test if this particular filter must be updated
      this._filters[p].update();
    }
  }


} /* END of class Pipeline */

export { Pipeline };
