/*
* Author    Jonathan Lurie - http://me.jonahanlurie.fr
*
* License   MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import pako from 'pako';
import FileSaver from 'file-saver';
//import JSZip from "jszip";
import { Filter } from '../core/Filter.js';
import { Image2D } from '../core/Image2D.js';
import { Image3D } from '../core/Image3D.js';


/**
* A PixpEncoder instance takes an Image2D or Image3D as input with `addInput(...)`
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
class PixpEncoder extends Filter {
  constructor(){
    super();
    this.setMetadata("filename", "untitled.pixp");

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
      console.warn("PixpEncoder can only encode Image2D and Image3D.");
      return;
    }

    var input = this._getInput();

    var arrayAndMeta = {
      dataType: input.getData().constructor.name, // typed array type
      data: Array.prototype.slice.call( input.getData() ),  // data of pixel/voxel
      metadata: input.getMetadataCopy(),  // Image2D/Image3D._metadata
      pixpipeType: input.constructor.name // most likely "Image2D", "Image3D", "MniVolume", "LineString", etc.
    }

    var pixpString = JSON.stringify( arrayAndMeta );

    var deflator = new pako.Deflate({
      level: 6,
      //to: 'string',
      gzip: true,
      header: {
          text: true,
          time: + new Date(),
          comment: "This file was created by Pixpipe.js"
        }
    });

    deflator.push(pixpString, true);

    // making a blob to be saved
    this._output[0] = new Blob([deflator.result], {type: "application/gzip"} );
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

} /* END of class PixpEncoder */

export { PixpEncoder }
