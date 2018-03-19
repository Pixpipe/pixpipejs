/*
* Author   Jonathan Lurie - http://me.jonathanlurie.fr
* License  MIT
* Link     https://github.com/Pixpipe/pixpipejs
* Lab      MCIN - Montreal Neurological Institute
*/



import { Decoder } from '../core/Decoder.js';
import { Signal1D } from '../core/Signal1D.js';

/**
* An instance of EdfDecoder takes an ArrayBuffer as input. This ArrayBuffer must
* come from a edf file (European Data Format). Such file can have multiple signals
* encoded internally, usually from different sensors, this filter will output as
* many Signal1D object as there is signal in the input file. In addition, each
* signal is composed of records (e.g. 1sec per record). This decoder concatenates
* records to output a longer signal. Still, the metadata in each Signal1D tells
* what the is the length of original record.
*
* **Usage**
* - [examples/fileToEDF.html](../examples/fileToEDF.html)
* - [examples/differenceEqSignal1D.html](../examples/differenceEqSignal1D.html)
*
*/
class JSONDecoder extends Decoder {

  constructor() {
    super();
    this.setMetadata("targetType", Signal1D.name);
    this.addInputValidator(0, ArrayBuffer);
    this.setMetadata("debug", false);
    this.setMetadata("concatenateRecords", true);

  }


  _run(){
    var inputBuffer = this._getInput(0);

    if(!inputBuffer){
      console.warn("JSONDecoder requires an JSON string as input \"0\". Unable to continue.");
      return;
    }

    var out = null;

    try{
      out = JSON.parse( inputBuffer )
    }catch( e ){
      console.log("ERR: " + e.message);
      return;
    }

    this._output[0] = out;
  }

} /* END of class EdfDecoder */

export { JSONDecoder }
