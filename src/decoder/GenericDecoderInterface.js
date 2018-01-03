/*
* Author    Jonathan Lurie - http://me.jonathanlurie.fr
*
* License   MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


import { Filter } from '../core/Filter.js';


/**
* 
*
*/
class GenericDecoderInterface extends Filter {

  constructor(){
    super();
    this._decoders = [];
  }

  _run(){
    if( this._decoders.length === 0 ){
      console.warn("No decoder was specified. Unable to continue.");
      return;
    }

    var inputBuffer = this._getInput(0);

    if(!inputBuffer){
      console.warn("The input buffer must not be null.");
      return;
    }

    // try with each decoder
    for(var d=0; d<this._decoders.length; d++){
      var decoder = new this._decoders[d]();
      decoder.addInput( inputBuffer );
      decoder.update();

      if(decoder.getNumberOfOutputs()){
        this._output[0] = decoder.getOutput();
        console.log( this._output[0] );
        this.setMetadata("decoderConstructor", this._decoders[d]);
        this.setMetadata("decoderName", this._decoders[d].name);
        break;
      }
    }
  }

} /* END of class/interface GenericDecoderInterface */

export { GenericDecoderInterface };
