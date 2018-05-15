/*
* Author    Jonathan Lurie - http://me.jonathanlurie.fr
*
* License   MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { NiftiDecoder } from './NiftiDecoder.js';


/**
* DEPRECATED: use NiftiDecoder instead of NiftiDecoderAlt
*/
class NiftiDecoderAlt extends NiftiDecoder {
  constructor(){
    super();
    console.warn("DEPRECATED: use NiftiDecoder instead of NiftiDecoderAlt.");
  }

} /* END of class NiftiDecoderAlt */

export { NiftiDecoderAlt }
