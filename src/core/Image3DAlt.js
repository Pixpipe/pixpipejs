/*
* Author   Jonathan Lurie - http://me.jonathanlurie.fr
* License  MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


import { Image3D } from './Image3D.js';


/**
* DEPRECATED: use Image3D instead
*/
class Image3DAlt extends Image3D{

  constructor( options=null ){
    super(options);
    this._type = Image3DAlt.TYPE();

    console.warn("DEPRECATED: Use Image3D instead of Image3DAlt");
  }


  /**
  * Hardcode the datatype
  */
  static TYPE(){
    return "IMAGE3DALT";
  }


} /* END of class Image3DAlt */

// register this type as a CoreType
CoreTypes.addCoreType( Image3DAlt );

export { Image3DAlt }
