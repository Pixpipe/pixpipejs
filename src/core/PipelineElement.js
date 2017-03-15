/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { PixpipeObject } from './PixpipeObject.js';


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

export { PipelineElement }
