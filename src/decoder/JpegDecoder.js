/*
* Author   Jonathan Lurie - http://me.jonathanlurie.fr
* License  MIT
* Link     https://github.com/Pixpipe/pixpipejs
* Lab      MCIN - Montreal Neurological Institute
*/

import jpeg from 'jpeg-js';
import { Filter } from '../core/Filter.js';
import { Image2D } from '../core/Image2D.js';


/**
* An instance of JpegDecoder will decode a JPEG image in native Javascript and
* output an Image2D. This is of course slower than using `io/FileImageReader.js`
* but this is compatible with Node and not rely on HTML5 Canvas.
*
* **Usage**
* - [examples/fileToJpeg.html](../examples/fileToJpeg.html)
*/
class JpegDecoder extends Filter {
  constructor() {
    super();
    this.addInputValidator(0, ArrayBuffer);
  }
  
  _run(){

    var inputBuffer = this._getInput(0);

    if(!inputBuffer){
      console.warn("JpegDecoder requires an ArrayBuffer as input \"0\". Unable to continue.");
      return;
    }
  
    try{
      var jpegData = jpeg.decode( inputBuffer );
      var ncpp = jpegData.data.length / (jpegData.width*jpegData.height);
      var outputImage = new Image2D();
      var pixelData = new Uint8Array( jpegData.data.buffer );
      
      outputImage.setData( pixelData, jpegData.width, jpegData.height, ncpp);
      this._output[ 0 ] = outputImage;
    }catch(e){
      //console.warn(e);
      //console.warn("This is not a JPEG file, unable to decode this file.");
    }
  }
} /* JpegDecoder */

export { JpegDecoder }
