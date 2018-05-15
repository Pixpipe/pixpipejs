/*
* Author    Jonathan Lurie - http://me.jonathanlurie.fr
*
* License   MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


import { GenericDecoderInterface } from './GenericDecoderInterface.js';
import { Image2DGenericDecoder } from './Image2DGenericDecoder.js';
import { Signal1DGenericDecoder } from './Signal1DGenericDecoder.js';
import { Image3DGenericDecoder } from './Image3DGenericDecoder.js';
import { Mesh3DGenericDecoder } from './Mesh3DGenericDecoder.js';


/**
* AllFormatsGenericDecoder is a generic decoder for all the file formats Pixpipe
* can handle. This means an instance of `AllFormatsGenericDecoder` can output
* object of various modality: a `Image3D`, `Image2D`, `Signal1D` or a `Mesh3D`.
* As any generic decoder, this one performs attemps of decoding and if it suceeds,
* an object is created. Some of the compatible formats do not have a easy escape
* like a magic number checking and thus need a full decoding attemps before the
* decoder can take a decision if wether or not the buffer being decoded matches
* the such or such decoder. This can create a bottel neck and we advise not to use
* `AllFormatsGenericDecoder` if you know your file will be of a specific type or
* of a specific modality.
*
* Notice: at the moment, `AllFormatsGenericDecoder` does not decode the `pixBin` format.
*/
class AllFormatsGenericDecoder extends GenericDecoderInterface {
  constructor(){
    super();

    this._decoders = [
      Signal1DGenericDecoder,
      Image2DGenericDecoder,
      Image3DGenericDecoder,
      Mesh3DGenericDecoder,
    ];
  }

}

export { AllFormatsGenericDecoder }
