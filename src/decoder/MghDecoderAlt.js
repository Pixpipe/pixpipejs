/*
* Author    Jonathan Lurie - http://me.jonathanlurie.fr
*           Robert D. Vincent
*
* License   MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { MghDecoder } from './MghDecoder.js';


/**
* DEPRECATED: use MghDecoder instead of MghDecoderAlt
*/
class MghDecoderAlt extends MghDecoder {

  constructor() {
    super();
    console.warn("DEPRECATED: use MghDecoder instead of MghDecoderAlt");
  }


} /* END of class MghDecoderAlt */

export { MghDecoderAlt };
