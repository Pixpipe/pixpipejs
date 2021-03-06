import { Decoder } from '../core/Decoder.js';
//import { QeegModFileParser } from 'qeegmodfile';
import qeegmodfile from 'qeegmodfile';


class EegModDecoder extends Decoder {

  constructor() {
    super();
    //this.setMetadata("targetType", Signal1D.constructor.name); // not determined yet if it will take place in a Signal1D
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

    var modParser = new qeegmodfile.QeegModFileParser();
    modParser.setRawData( inputBuffer );
    var qeegData = modParser.parse();

    if( qeegData ){
      this._output[0] = qeegData;
    }

  }

} /* END of class EegModDecoder */

export { EegModDecoder }
