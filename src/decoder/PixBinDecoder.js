/*
* Author    Jonathan Lurie - http://me.jonahanlurie.fr
*
* License   MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


import md5 from 'js-md5';
import { Filter } from '../core/Filter.js';
import { CodecUtils } from './CodecUtils.js';
import { PixBlockEncoder } from './PixBlockEncoder.js';
import { PixBinEncoder } from './PixBinEncoder.js';

/**
* A PixBinDecoder instance decodes a *.pixp file and output an Image2D or Image3D.
* The input, specified by `.addInput(...)` must be an ArrayBuffer
* (from an `UrlToArrayBufferFilter`, an `UrlToArrayBufferReader` or anothrer source ).
*
* **Usage**
* - [examples/pixpFileToImage2D.html](../examples/pixpFileToImage2D.html)
*/
class PixBinDecoder extends Filter {
  constructor(){
    super();
    this.addInputValidator(0, ArrayBuffer);
    this.setMetadata("verifyChecksum", false);
  }


  _run(){

    if(! this.hasValidInput() ){
      console.warn("PixBinDecoder can only decode ArrayBuffer.");
      return;
    }


    var verifyChecksum = this.getMetadata("verifyChecksum");
    var input = this._getInput();
    var inputByteLength = input.byteLength;
    var magicNumberToExpect = PixBinEncoder.MAGIC_NUMBER();

    // control 1: the file must be large enough
    if( inputByteLength < (magicNumberToExpect.length + 5) ){
      console.warn("This buffer does not match a PixBin file.");
      return;
    }

    var view = new DataView( input );
    var movingByteOffset = 0;
    var magicNumber = CodecUtils.getString8FromBuffer(input, magicNumberToExpect.length )

    // control 2: the magic number
    if( magicNumber !== magicNumberToExpect){
      console.warn("This file is not of PixBin type. (wrong magic number)");
      return;
    }

    movingByteOffset = magicNumberToExpect.length;
    var isLittleEndian = view.getUint8(movingByteOffset);

    // control 3: the endianess must be 0 or 1
    if(isLittleEndian != 0 && isLittleEndian != 1){
      console.warn("This file is not of PixBin type. (wrong endianess code)");
      return;
    }

    movingByteOffset += 1;
    var pixBinIndexBinaryStringByteLength = view.getUint32( movingByteOffset, isLittleEndian );
    movingByteOffset += 4;
    var pixBinIndexObj = CodecUtils.ArrayBufferToObject( input.slice(movingByteOffset, movingByteOffset + pixBinIndexBinaryStringByteLength));
    movingByteOffset += pixBinIndexBinaryStringByteLength;

    // we will be reusing the same block decoder for all the blocks
    var blockDecoder = new pixpipe.PixBlockDecoder();
    var outputCounter = 0;


    this._output["meta"] = pixBinIndexObj;

    // decoding each block
    for(var i=0; i<pixBinIndexObj.pixblocksInfo.length; i++){
      var blockInfo = pixBinIndexObj.pixblocksInfo[i];
      var pixBlock = input.slice(movingByteOffset, movingByteOffset + blockInfo.byteLength);
      movingByteOffset += blockInfo.byteLength;

      if( verifyChecksum && md5( pixBlock ) !== blockInfo.checksum){
        console.warn("Modality " + (i+1) + "/" + pixBinIndexObj.pixblocksInfo.length + " (" + blockInfo.type + ") could not comply to checksum validation." );
        continue;
      }

      blockDecoder.addInput( pixBlock )
      blockDecoder.update();
      var decodedBlock = blockDecoder.getOutput();

      if( decodedBlock ){
        this._output[outputCounter] = decodedBlock;
        outputCounter ++;
      }


    }

  }


} /* END of class PixBinDecoder */

export { PixBinDecoder }
