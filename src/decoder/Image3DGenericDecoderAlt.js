/*
* Author    Jonathan Lurie - http://me.jonathanlurie.fr
*
* License   MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


import { Image3DGenericDecoder } from './Image3DGenericDecoder.js';


/**
* DEPRECATED: use Image3DGenericDecoder instead of Image3DGenericDecoderAlt
*/
class Image3DGenericDecoderAlt extends Image3DGenericDecoderAlt {

  constructor(){
    super();
    console.warn("DEPRECATED: use Image3DGenericDecoder instead of Image3DGenericDecoderAlt");
  }

} /* END of class Image3DGenericDecoderAlt */

export { Image3DGenericDecoderAlt }
