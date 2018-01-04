/*
* Author    Jonathan Lurie - http://me.jonathanlurie.fr
*
* License   MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


import { GenericDecoderInterface } from './GenericDecoderInterface.js';
// decoders
import { EdfDecoder } from './EdfDecoder.js';


/**
* This class implements `GenericDecoderInterface` that already contains the
* successive decoding logic. For this reason this filter does not need to have the
* `_run` method to be reimplemented.
*
* An instance of Signal1DGenericDecoder takes a ArrayBuffer
* as input 0 (`.addInput(myArrayBuffer)`) and output an Signal1D.
* The `update` method will perform several decoding attempts, using the readers
* specified in the constructor.
* In case of success (one of the registered decoder was compatible to the data)
* the metadata `decoderConstructor` and `decoderName` are made accessible and give
* information about the file format. If no decoder managed to decode the input buffer,
* this filter will not have any output.
*
* Developers: if a new 2D dataset decoder is added, reference it here and in the import list
*
* **Usage**
* - [examples/fileToGenericImage2D.html](../examples/fileToGenericImage2D.html)
*/
class Signal1DGenericDecoder extends GenericDecoderInterface {

  constructor(){
    super();
    this.setMetadata("enablePixBin", true);

    this._decoders = [
      EdfDecoder,
    ];
  }

} /* END of class Signal1DGenericDecoder */

export { Signal1DGenericDecoder }
