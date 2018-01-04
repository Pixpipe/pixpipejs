import { Decoder } from '../core/Decoder.js';
import { QeegModFileParser } from 'qeegmodfile';


class EegModDecoder extends Decoder {

  constructor() {
    super();
    this.setMetadata("targetType", Signal1D.constructor.name);
    this.addInputValidator(0, ArrayBuffer);
    this.setMetadata("debug", false);

    // a soon-to-be DataView to read the input buffer
    this._view = null;
  }

  _run(){
    var inputBuffer = this._getInput(0);

    if(!inputBuffer){
      console.warn("EegModDecoder requires an ArrayBuffer as input \"0\". Unable to continue.");
      return;
    }

    var modParser = new QeegModFileParser();
    modParser.setRawData( inputBuffer );
    var qeegData = modParser.parse();

    if( qeegData ){
      this._output[0] = qeegData;
    }

  }

} /* END of class EegModDecoder */

export { EegModDecoder }
