/*
* Author    Jonathan Lurie - http://me.jonathanlurie.fr
*
* License   MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import codecutils from 'codecutils';
import pixbincodec from 'pixbincodec'
import { Decoder } from '../core/Decoder.js';
import { CoreTypes } from '../core/CoreTypes.js';


/**
* A PixBinDecoder instance decodes a *.pixp file and output an Image2D or Image3D.
* The input, specified by `.addInput(...)` must be an ArrayBuffer
* (from an `UrlToArrayBufferFilter`, an `UrlToArrayBufferReader` or anothrer source ).
* The metadata `targetType` can be a string or an array of
* string being the name(s) of the accepted contructor(s). The defaut value (`"*"`)
* means the decoder will decode blocks of the pixBin file that are of any type. If
* the you decide to use `myPixBinDecoder.setMetadata("targetType", ["Image2D", "Mesh3D"]);`
* then the block being something else will bne skiped and not part of the outputs.
*
* **Usage**
* - [examples/decodePixBin.html](../examples/decodePixBin.html)
*/
class PixBinDecoder extends Decoder {
  constructor(){
    super();
    this.setMetadata("targetType", "*");
    this.addInputValidator(0, ArrayBuffer);
    this.setMetadata("blockVerification", false);
  }


  _run(){
    if(! this.hasValidInput() ){
      console.warn("PixBinDecoder can only decode ArrayBuffer.");
      return;
    }

    var input = this._getInput();
    var pbDecoder = new pixbincodec.PixBinDecoder();
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
    var outputCounter = 0;

    for(var i=0; i<numberOfBlocks; i++){
      var blockType = pbDecoder.getBlockType( i );

      // if the type is not in the whitelist, we skip this block
      if(! this._shouldDecodeType(blockType) )
        continue;

      var block = pbDecoder.fetchBlock( i )
      var output = null;
      var objectConstructor = CoreTypes.getCoreType( blockType );

      // the encoded object matches to a pixpipe type
      if( objectConstructor ){
        output = new objectConstructor();
        output.setRawData( block._data );
        output.setRawMetadata( block._metadata );
      }
      // Fallback on a non -pixpipe type
      else{
        var globalObject = codecutils.CodecUtils.getGlobalObject();
        if( blockType in globalObject ){
          output = new globalObject[ blockType ]();
          output._metadata = block._metadata;
          output._data = block._data;
        }
      }

      this._output[ outputCounter ] = output;
      outputCounter ++;
    }

    // adding the metadata only if there are blocks
    if( numberOfBlocks ){
      this._output[ "PixBinMeta" ] = pixBinMetaObj;
    }
  }


  /**
  * [PRIVATE]
  * Tells if the given type matches the whitelist of types to decode.
  * This whitelist is specified in the `targetType` metadata and can be a single
  * string or an array of strings.
  * @param {String} t - the type to test is in the whitelist
  * @return {Boolean} true if the type in arg in in the whitelist, false if not
  */
  _shouldDecodeType( t ){
    var types = this.getMetadata("targetType");

    if( types === "*")
      return true;

    // if an array of type was given
    if( Array.isArray(types) )
      return (types.indexOf( t ) != -1 );


    if( t === types )
      return true;

    return false;
  }


} /* END of class PixBinDecoder */

export { PixBinDecoder }
