/*
* Author    Jonathan Lurie - http://me.jonathanlurie.fr
*
* License   MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


import { GenericDecoderInterface } from './GenericDecoderInterface.js';

// decoders
import { TiffDecoder } from './TiffDecoder.js';
import { JpegDecoder } from './JpegDecoder.js';
import { PngDecoder } from './PngDecoder.js';
import { PixpDecoder } from './PixpDecoder.js';
//import { PixBinDecoder } from './PixBinDecoder.js';


/**
* This class implements `GenericDecoderInterface` that already contains the
* successive decoding logic. For this reason this filter does not need to have the
* `_run` method to be reimplemented.
*
* An instance of Image2DGenericDecoder takes a ArrayBuffer
* as input 0 (`.addInput(myArrayBuffer)`) and output an Image2D.
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
class Image2DGenericDecoder extends GenericDecoderInterface {

  constructor(){
    super();

    this._decoders = [
      TiffDecoder,
      JpegDecoder,
      PngDecoder,
      PixpDecoder,
      //PixBinDecoder
    ];
  }

} /* END of class Image2DGenericDecoder */

export { Image2DGenericDecoder }
