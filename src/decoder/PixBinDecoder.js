/*
* Author    Jonathan Lurie - http://me.jonathanlurie.fr
*
* License   MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { CodecUtils } from 'codecutils';
import {PixBinDecoder as PBDecoder} from 'pixbincodec'
import { Decoder } from '../core/Decoder.js';
import { CoreTypes } from '../core/CoreTypes.js';


/**
* A PixBinDecoder instance decodes a *.pixp file and output an Image2D or Image3D.
* The input, specified by `.addInput(...)` must be an ArrayBuffer
* (from an `UrlToArrayBufferFilter`, an `UrlToArrayBufferReader` or anothrer source ).
*
* **Usage**
* - [examples/pixpFileToImage2D.html](../examples/pixpFileToImage2D.html)
*/
class PixBinDecoder extends Decoder {
  constructor(){
    super();
    this.addInputValidator(0, ArrayBuffer);
    this.setMetadata("blockVerification", false);
  }


  _run(){
    if(! this.hasValidInput() ){
      console.warn("PixBinDecoder can only decode ArrayBuffer.");
      return;
    }

    var input = this._getInput();
    var pbDecoder = new PBDecoder();
    pbDecoder.enableBlockVerification( this.getMetadata("blockVerification") );
    pbDecoder.setInput( input );

    // dont go further is buffer is not valid
    if( !pbDecoder.isValid() ){
      console.warn("The input buffer is invalid.");
      return;
    }

    var pixBinMetaObj = {
      creationDate: pbDecoder.getBinCreationDate(),
      description: pbDecoder.getBinDescription(),
      userObject: pbDecoder.getBinUserObject(),
      numberOfBlocks: pbDecoder.getNumberOfBlocks()
    }

    // perform the decoding
    var numberOfBlocks = pbDecoder.getNumberOfBlocks();

    for(var i=0; i<numberOfBlocks; i++){
      var blockType = pbDecoder.getBlockType( i );
      var block = pbDecoder.fetchBlock( i )
      var output = null;
      var objectConstructor = CoreTypes.getCoreType( blockType );

      // the encoded object matches to a pixpipe type
      if( objectConstructor ){
        output = new objectConstructor();
        output.setRawData( block._data );
        output.setRawMetadata( block._metadata );
      }
      // Fallback on a not-pixpipe type
      else{
        var globalObject = CodecUtils.getGlobalObject();
        if( blockType in globalObject ){
          output = new globalObject[ blockType ]();
          output._metadata = block._metadata;
          output._data = block._data;
        }

      }

      this._output[ i ] = output;
    }

    // adding the metadata only if there are blocks
    if( numberOfBlocks ){
      this._output[ "PixBinMeta" ] = pixBinMetaObj;
    }
  }


} /* END of class PixBinDecoder */

export { PixBinDecoder }
