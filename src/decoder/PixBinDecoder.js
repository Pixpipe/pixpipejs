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

    if( inputByteLength < 12 ){
      console.warn("This buffer does not match a PixBin file.");
      return;
    }

    // the view to decode the buffer
    var view = new DataView( input );

    var entryStringLength = 7;
    var movingByteOffset = 0;
    
    // this should be "pixpipe"
    var entryString = CodecUtils.getString8FromBuffer(input, entryStringLength )
    movingByteOffset = entryStringLength;
    var isLittleEndian = view.getUint8(movingByteOffset);
    movingByteOffset += 1;
    var pixBinIndexBinaryStringByteLength = view.getUint32( movingByteOffset, isLittleEndian );
    movingByteOffset += 4;
    var pixBinIndexObj = CodecUtils.ArrayBufferToObject( input.slice(movingByteOffset, movingByteOffset + pixBinIndexBinaryStringByteLength));
    movingByteOffset += pixBinIndexBinaryStringByteLength;
    
    console.log( pixBinIndexObj );
    
    var blockDecoder = new pixpipe.PixBlockDecoder();
    var outputCounter = 0;
    this._output["meta"] = pixBinIndexObj;
    
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
