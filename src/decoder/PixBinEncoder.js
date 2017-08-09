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



  _run(){
    var today = new Date();
    this._rejectCyclingObjects();

    // this object is the JSON description at the begining of a PixBin
    var pixBinIndex = {
      date: today.toISOString(),
      createdWith: "pixpipejs",
      description: this.getMetadata( "description" ),
      userObject: this.getMetadata( "userObject" ),
      pixblocksInfo: []
    }
    
    // array of binary blocks (each are Uint8Array or ArrayBuffer)
    var pixBlocks = []
    
    // just a convenient shortcut
    var pixblocksInfo = pixBinIndex.pixblocksInfo;
    
    var growingPixBlockOffset = 0;

    this._forEachInput(function( category, input ){
      
      var pixBlock = this._getPixBlock( input );
      
      if( !pixBlock ){
        console.warn("The PixBlock corresponding to input category " + category + " could not be created, and thus will not be added to the PixBin container.");
        return;
      }
      
      // adding an entry to the PixBin index
      var pixBinIndexEntry = {
        type: input.constructor.name,
        description: input.getMetadata( "description" ),
        offset: growingPixBlockOffset
      };
      
      growingPixBlockOffset += pixBlock.buffer.byteLength;
      
      pixblocksInfo.push( pixBinIndexEntry )
    });

    return;

    var input = this._getInput();

    var pixBinMetadata = {
      dataType: input.getData().constructor.name, // typed array type
      pixpipeType: input.constructor.name, // most likely "Image2D", "Image3D", "MniVolume", "LineString", etc.
      metadata: input.getMetadataCopy(),  // Image2D/Image3D._metadata
    }

    // this is a typed array
    var data = input.getData();
    
    var metadataJsonString = JSON.stringify( pixBinMetadata );
    var metadataByteArray = new Uint8Array( metadataJsonString.length );
    
    // converting the json string into a byte stream
    for(var i = 0; i < metadataJsonString.length; ++i)
      metadataByteArray[i] = metadataJsonString.charCodeAt(i);

    // creating the buffer
    var metadataBuffer = new ArrayBuffer( 4 + metadataByteArray.length );

    // the data view is used to write into the buffer
    var view = new DataView( metadataBuffer );
    
    var offsetFromHere = 0;
    
    // write the size of the metadata string
    view.setUint32(offsetFromHere, metadataByteArray.length );
    
    // write the metadata themselves
    offsetFromHere += 4;
    for(var i=0; i<metadataByteArray.length; i++){
      view.setUint8(offsetFromHere, metadataByteArray[i] );
      offsetFromHere++;
    }

    // making a blob to be saved
    this._output[0] = new Blob([metadataBuffer, data], {type: 'application/octet-binary'} );
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
