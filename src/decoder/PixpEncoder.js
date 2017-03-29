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
//import JSZip from "jszip";
import { Filter } from '../core/Filter.js';
import { Image2D } from '../core/Image2D.js';
import { Image3D } from '../core/Image3D.js';


/**
* A PixpEncoder instance takes an Image2D or Image3D as input with `addInput(...)`
* and encode it so that it can be saved as a *.pixp file.
* An output filename can be specified using `.setMetadata("filename", "yourName.pixp");`,
* by default, the name is "untitled.pixp".
*/
class PixpEncoder extends Filter {
  constructor(){
    super();
    this.setMetadata("filename", "untitled.pixp");
  }


  /**
  * [PRIVATE]
  * Only accept Image2D and Image3D
  */
  _hasValidInput(){
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
      pixpipeType: input.constructor.name
    }

    var pixpString = JSON.stringify( arrayAndMeta );
    //var pixpBinaryString = pako.deflate(pixpString/*, { to: 'string' }*/);
    //var pixpBinaryRaw = pako.deflateRaw(pixpString);

    // making a blob to be saved
    //var blob = new Blob([pixpBinaryString], {type: "example/binary"}/*, {type: "text/plain;charset=utf-8"}*/);
    //FileSaver.saveAs(blob, this.getMetadata("filename"));


    //var zip = new JSZip();
    //zip.file(this.getMetadata("filename"), pixpString);

    zip.generateAsync({type:"blob"})
    .then(function (blob) {
        FileSaver.saveAs(blob, "hello.zip");
    });

    // TODO: try to see how JSZip does

    //var file = new File([pixpBinaryRaw], this.getMetadata("filename"), {type: "application/gzip;charset=utf-8"});
    //FileSaver.saveAs(file);

    //this._download( this.getMetadata("filename"),  pixpBinaryString);

    // **************************** decompress

    //var pixpString2 = pako.inflate(pixpBinaryString, { to: 'string' });
    //var pixpObject = JSON.parse( pixpString2 );
    //console.log( pixpObject );
  }





  _download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
  }

} /* END of class PixpEncoder */

export { PixpEncoder }
