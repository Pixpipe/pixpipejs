/*
* Author    Jonathan Lurie - http://me.jonahanlurie.fr
*           Robert D. Vincent
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
* A PixpDecoder instance decodes a *.pixp file and output an Image2D or Image3D.
* The input, specified by `.addInput(...)` must be an ArrayBuffer
* (from an `UrlToArrayBufferFilter`, an `UrlToArrayBufferReader` or anothrer source ).
*/
class PixpDecoder extends Filter {
  constructor(){
    super();

  }


  /**
  * [PRIVATE]
  * Only accept Image2D and Image3D
  */
  _hasValidInput(){
    var input = this._getInput();
    return input &&  input instanceof ArrayBuffer;
  }


  _run(){

    if(! this.hasValidInput() ){
      console.warn("PixpDecoder can only decode ArrayBuffer.");
      return;
    }

    var input = this._getInput();
    console.log(input);

    var pixpString2 = pako.inflate(input, { to: 'string' });
    var pixpObject = JSON.parse( pixpString2 );

    /*
    var fileReader = new FileReader();
    fileReader.onload = function() {
      var arrayBuffer = this.result;
      var pixpString2 = pako.inflate(arrayBuffer, { to: 'string' });
      var pixpObject = JSON.parse( pixpString2 );
      console.log( pixpObject );
    };
    fileReader.readAsArrayBuffer(input);
    */


    return;

    /*
    var arrayAndMeta = {
      dataType: input.getData().constructor.name, // typed array type
      data: Array.prototype.slice.call( input.getData() ),  // data of pixel/voxel
      metadata: input.getMetadataCopy(),  // Image2D/Image3D._metadata
      pixpipeType: input.constructor.name
    }

    var pixpString = JSON.stringify( arrayAndMeta );
    var pixpBinaryString = pako.deflate(pixpString, { to: 'string' });

    // making a blob to be saved
    var blob = new Blob([pixpBinaryString], {type: "text/plain;charset=utf-8"});
    FileSaver.saveAs(blob, "untitled_" + arrayAndMeta.pixpipeType + ".pixp");
    */
    // **************************** decompress

    //var pixpString2 = pako.inflate(pixpBinaryString, { to: 'string' });
    //var pixpObject = JSON.parse( pixpString2 );
    //console.log( pixpObject );
  }



} /* END of class PixpDecoder */

export { PixpDecoder }
