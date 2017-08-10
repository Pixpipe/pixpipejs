/*
* Author    Jonathan Lurie - http://me.jonahanlurie.fr
*
* License   MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import pako from 'pako';
import { Filter } from '../core/Filter.js';
import { PixpipeContainer } from '../core/PixpipeContainer.js';
import { CodecUtils } from './CodecUtils.js';


/**
* A PixBlockDecoder instance is a Filter that takes an ArrayBuffer that is the result
* of a PixBlock compression. This filter ouputs an object of a type inherited from
* PixpipeContainer (Image2D/Image3D/etc.)  
* If the data within the block was compressed, it will automatically be decompressed.
* If the data object was composed of several subset (eg. mesh), the subset will be
* retrieved in the same order as the where in the original data
* (no matter if compressed or not).
*
* **Usage**
* - [examples/Image2DToPixblock.html](../examples/Image2DToPixblock.html)
*/
class PixBlockDecoder extends Filter {
  constructor(){
    super();
    this.addInputValidator(0, ArrayBuffer);
  }
  
  _run(){
    if(! this.hasValidInput() ){
      console.warn("PixBinDecoder can only decode ArrayBuffer.");
      return;
    }
    
    var input = this._getInput();
    var view = new DataView( input );
    var isLtlt = view.getUint8( 0 );
    var readingByteOffset = 0;
    
    // get the endianess used to encode the file
    var isLittleEndian = view.getUint8(0)
    readingByteOffset += 1
    
    // get the length of the string buffer (unicode json) that follows
    var metadataBufferByteLength = view.getUint32(1, readingByteOffset);
    readingByteOffset += 4;
    
    // get the string buffer
    var strBuffer = input.slice( readingByteOffset, readingByteOffset + metadataBufferByteLength )
    var metadataObj = CodecUtils.ArrayBufferToObject( strBuffer );
    console.log( metadataObj );
    readingByteOffset += metadataBufferByteLength;
    
    // the data streams are the byte streams when they are converted back to actual typedArrays/Objects
    var dataStreams = []
    
    for(var i=0; i<metadataObj.byteStreamInfo.length; i++){
      // act as a flag: if not null, it means data were compressed
      var compressedByteLength = metadataObj.byteStreamInfo[i].compressedByteLength
      
      // meaning, the stream is compresed
      if( compressedByteLength ){
        // fetch the compresed dataStream
        var compressedByteStream = new Uint8Array( input, readingByteOffset, compressedByteLength );
        
        // inflate the dataStream
        var inflatedByteStream = pako.inflate( compressedByteStream );
        
        // create a typed array out of the inflated buffer
        var typedArrayConstructor = this._getArrayTypeFromByteStreamInfo(metadataObj.byteStreamInfo[i]);
        var dataStream = new typedArrayConstructor( inflatedByteStream );
        
        dataStreams.push( dataStream )
        readingByteOffset += compressedByteLength;
        
      }
      // the stream were NOT compressed
      else{
        var dataStream = CodecUtils.extractTypedArray(
          input,
          readingByteOffset,
          this._getArrayTypeFromByteStreamInfo(metadataObj.byteStreamInfo[i]),
          metadataObj.byteStreamInfo[i].length
        )
        
        dataStreams.push( dataStream )
        readingByteOffset += metadataObj.byteStreamInfo[i].byteLength;
      }
    }
    
    // If data is a single typed array (= not composed of a subset)
    // we get rid of the useless wrapping array
    if( dataStreams.length == 1){
      dataStreams = dataStreams[0]
    }
    
    var output = new pixpipe[ metadataObj.pixpipeType ];
    output.setRawData( dataStreams );
    output.setRawMetadata( metadataObj.containerMeta );
    this._output[0] = output;
  }
  
  
  /**
  * Get the array type based on byte stream info.
  * The returned object can be used as a constructor
  * @return {Function} constructor of a typed array
  */
  _getArrayTypeFromByteStreamInfo( bsi ){
    var arrayType = null;
    
    if( bsi.type === "int" ){
      arrayType = bsi.signed ? "Uint" : "Int"
    }else{
      arrayType = "Float"
    }
    
    arrayType += bsi.bytesPerElements*8 + "Array";
    var globalObject = CodecUtils.getGlobalObject()
    return ( globalObject[ arrayType ] )
  }
  
  
} /* END of class PixBlockDecoder */

export { PixBlockDecoder }
