/*
* Author    Jonathan Lurie - http://me.jonahanlurie.fr
*
* License   MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import pako from 'pako';
import FileSaver from 'file-saver';
import { Filter } from '../core/Filter.js';
import { Image2D } from '../core/Image2D.js';
import { Image3D } from '../core/Image3D.js';


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
  }


  _run(){

    if(! this.hasValidInput() ){
      console.warn("PixBinDecoder can only decode ArrayBuffer.");
      return;
    }

    var input = this._getInput();
    var inputByteLength = input.byteLength;

    // the view to decode the buffer
    var view = new DataView( input );
    var offsetFromHere = 0;
    
    // fetch the extendedMetadata string length
    var extendedMetadataStringLength = view.getUint32( offsetFromHere );
    offsetFromHere += 8;
    
    // getting extendedMetadata
    var extendedMetadataBytes = new Uint8Array(input, offsetFromHere, extendedMetadataStringLength);
    var extendedMetadata = JSON.parse( String.fromCharCode( ...extendedMetadataBytes ) );
    offsetFromHere += extendedMetadataStringLength;
    
    // getting the data
    var constructorHost = null;
    
    try{
      constructorHost = window; // in a web browser
    }catch( e ){
      try{
        constructorHost = GLOBAL; // in node
      }catch( e ){
        console.warn( "You are not in a Javascript environment?? Weird." );
        return;
      }
    }
    
    if(! constructorHost[ extendedMetadata.dataType ]){
      console.warn( "Data array from pixb file is unknown: " + extendedMetadata.dataType );
      return;
    }
    
    /*
      There is a known issues in JS that a TypedArray cannot be created starting at a non-multiple-of-2 start offset 
      if the type of data within this array is supposed to take more than one byte (ie. Uint16, Float32, etc.).
      The error is stated like that (in Chrome):
      "Uncaught RangeError: start offset of Uint16Array should be a multiple of 2"
      When it comes to Float32, Chrome wants an offset that is multiple of 4, and so on.
      
      The workaround is to slice the buffer to take only the data part of it (basically to remove what is before)
      so that this new array starts with an offset 0, no matter what was before.
    */
    
    var data = new constructorHost[ extendedMetadata.dataType ]( input.slice( offsetFromHere ) )
    
    var output = new pixpipe[ extendedMetadata.pixpipeType ];
    output.setRawData( data );
    output.setRawMetadata( extendedMetadata.metadata );

    this._output[0] = output;
  }


} /* END of class PixBinDecoder */

export { PixBinDecoder }
