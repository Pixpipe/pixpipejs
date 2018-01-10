/*
* Author    Jonathan Lurie - http://me.jonathanlurie.fr
*
* License   MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


import { Decoder } from '../core/Decoder.js';
import { PixBinDecoder } from './PixBinDecoder.js';


/**
* GenericDecoderInterface is an intreface and should not be used as is.
* GenericDecoderInterface provides the elementary kit ti build a multiformat decoder.
* Classes that implements GenericDecoderInterface must have a list of decoder constructors
* stored in `this._decoders`.
* The classes `Image2DGenericDecoder`, `Image3DGenericDecoderAlt` and `Mesh3DGenericDecoder`
* are using `GenericDecoderInterface`.
*
*/
class GenericDecoderInterface extends Decoder {

  constructor(){
    super();
    this._decoders = [];
    this.setMetadata("enablePixBin", false);
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

    var succesWithBasicDecoder = false;

    // takes all the types by the registered decoders and out them here
    // (uses only if this generic decoders uses the pixBin decoder)
    var targetTypes = [];

    // try with each decoder
    for(var d=0; d<this._decoders.length; d++){
      var decoder = new this._decoders[d]();
      decoder.addInput( inputBuffer );
      decoder.update();

      var targetType = decoder.getMetadata("targetType");
      if( targetTypes.indexOf(targetType) === -1 ){
        targetTypes.push( targetType)
      }

      if(decoder.getNumberOfOutputs()){
        succesWithBasicDecoder = true;
        this._output[0] = decoder.getOutput();
        this.setMetadata("decoderConstructor", this._decoders[d]);
        this.setMetadata("decoderName", this._decoders[d].name);
        break;
      }
    }
    
    if( succesWithBasicDecoder )
      return;

    if( !this.getMetadata("enablePixBin") )
      return;

    this.setMetadata("targetType", targetTypes);

    // from this point, the basic decoders had no chance and we can try to decoder
    // with pixBin and see if there is a modality we want -- and only the modality
    // we want (e.g. Image3DAlt )
    var that = this;
    var pbDecoder = new PixBinDecoder();

    // we get the typenames of the _decoders set for this genric decoder and build
    // the whitelist of format for the PixBinDecoder

    pbDecoder.setMetadata("targetType", this.getMetadata("targetType"));
    pbDecoder.addInput( inputBuffer )
    pbDecoder.update();

    pbDecoder.forEachOutput(function(category, output){
      that._output[category] = output;
    });

  }

} /* END of class/interface GenericDecoderInterface */

export { GenericDecoderInterface };
