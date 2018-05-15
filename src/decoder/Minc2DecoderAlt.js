/*
* Author    Jonathan Lurie - http://me.jonathanlurie.fr
*           Robert D. Vincent
*
* License   MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { Minc2DecoderAlt } from './Minc2DecoderAlt.js';


/**
* DEPRECATED: use Minc2Decoder instead of Minc2DecoderAlt
*/
class Minc2DecoderAlt extends Minc2DecoderAlt{

  constructor(){
    super();
    console.warn("DEPRECATED: use Minc2Decoder instead of Minc2DecoderAlt");
  }

} /* END of class Minc2DecoderAlt */

export { Minc2DecoderAlt }
