/*
* Author    Jonathan Lurie - http://me.jonahanlurie.fr
*
* License   MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import pako from 'pako';
import FileSaver from 'file-saver';
//import JSZip from "jszip";
import { Filter } from '../core/Filter.js';
import { Image2D } from '../core/Image2D.js';
import { Image3D } from '../core/Image3D.js';


/**
* A PixBinEncoder instance takes an Image2D or Image3D as input with `addInput(...)`
* and encode it so that it can be saved as a *.pixp file.
* An output filename can be specified using `.setMetadata("filename", "yourName.pixp");`,
* by default, the name is "untitled.pixp".
* When `update()` is called, a gzip blog is prepared as output[0] and can then be downloaded
* when calling the method `.download()`. The gzip blob could also be sent over AJAX
* using a third party library.
*
* **Usage**
* - [examples/savePixpFile.html](../examples/savePixpFile.html)
*/
class PixBinEncoder extends Filter {
  constructor(){
    super();
    this.setMetadata("filename", "untitled.pixb");
    this.setMetadata("extension", "pixb");

  }


  /**
  * [PRIVATE]
  * overwrite the original from Filter
  * Only accept Image2D and Image3D
  */
  hasValidInput(){
    var input = this._getInput();
    return input && ( input.isOfType(Image2D.TYPE()) || input.isOfType(Image3D.TYPE()) );
  }


  _run(){

    if(! this.hasValidInput() ){
      console.warn("PixBinEncoder can only encode Image2D and Image3D.");
      return;
    }

    var input = this._getInput();

    var pixBinMetadata = {
      dataType: input.getData().constructor.name, // typed array type
      pixpipeType: input.constructor.name, // most likely "Image2D", "Image3D", "MniVolume", "LineString", etc.
      metadata: input.getMetadataCopy(),  // Image2D/Image3D._metadata
    }

    // this is a typed array
    var data = input.getDataCopy();
    
    var metadataJsonString = JSON.stringify( pixBinMetadata );
    var metadataByteArray = new Uint8Array( metadataJsonString.length );
    
    // converting the json string into a byte stream
    for(var i = 0; i < metadataJsonString.length; ++i)
      metadataByteArray[i] = metadataJsonString.charCodeAt(i);
    
    console.log( metadataByteArray );
    
    // creating the buffer
    var fileBuffer = new ArrayBuffer( 8 + metadataByteArray.length + data.buffer.byteLength );

    // the data view is used to write into the buffer
    var view = new DataView( fileBuffer );
    
    var offsetFromHere = 0;
    
    // write the size of the metadata string
    view.setUint32(offsetFromHere, metadataByteArray.length );
    
    // write the metadata themselves
    offsetFromHere += 8;
    for(var i=0; i<metadataByteArray.length; i++){
      view.setUint8(offsetFromHere, metadataByteArray[i] );
      offsetFromHere++;
    }
    
    // write the data
    var bytesPerElem = data.BYTES_PER_ELEMENT;
    for(var i=0; i<data.length; i++){
      view.setUint8(offsetFromHere, data[i] );
      offsetFromHere += bytesPerElem;
    }
    
    // making a blob to be saved
    //this._output[0] = new Blob([deflator.result], {type: "application/gzip"} );
    this._output[0] = new Blob([fileBuffer], {type: 'application/octet-binary'} );
  }


  

  /**
  * Download the generated file
  */
  download(){
    var output = this.getOutput();

    if(output){
      FileSaver.saveAs( this.getOutput(), this.getMetadata("filename"));
    }else{
      console.warn("No output computed yet.");
    }
  }

} /* END of class PixBinEncoder */

export { PixBinEncoder }
