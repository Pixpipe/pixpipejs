/*
* Author    Jonathan Lurie - http://me.jonahanlurie.fr
*
* License   MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import pako from 'pako';
import { Filter } from '../core/Filter.js';
import { PixpipeContainer } from '../core/PixpipeContainer.js';
import { CodecUtils } from './CodecUtils.js';


class PixBlockDecoder extends Filter {
  constructor(){
    super();
    this.addInputValidator(0, ArrayBuffer);
  }
  
  _run(){
    if(! this.hasValidInput() ){
      console.warn("PixBinDecoder can only decode ArrayBuffer.");
      return;
    }
    
    var input = this._getInput();
    var view = new DataView( input );
    var isLtlt = view.getUint8( 0 );
    
    var isLittleEndian = new Uint8Array( input , 0, 1 )[0]
    var metadataBufferLength = new Uint32Array( input , 1, 1 )[0]
  }
  
  
} /* END of class PixBlockDecoder */

export { PixBlockDecoder }
