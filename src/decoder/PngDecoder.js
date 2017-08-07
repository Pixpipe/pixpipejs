/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link     https://github.com/jonathanlurie/pixpipejs
* Lab      MCIN - Montreal Neurological Institute
*/



//import pngjs from 'pngjs'; // ependency issues
import png from 'upng-js'; // does not halt when wrong format + additional line!
import { Filter } from '../core/Filter.js';
import { Image2D } from '../core/Image2D.js';


/**
* An instance of PngDecoder will decode a PNG image in native Javascript and
* output an Image2D. This is of course slower than using `io/FileImageReader.js`
* but this is compatible with Node and not rely on HTML5 Canvas.
*
* **Usage**
* - [examples/fileToPng.html](../examples/fileToPng.html)
*/
class PngDecoder extends Filter {
  constructor() {
    super();
    this.addInputValidator(0, ArrayBuffer);
  }
  
  _run(){
    var inputBuffer = this._getInput(0);

    if(!inputBuffer){
      console.warn("PngDecoder requires an ArrayBuffer as input \"0\". Unable to continue.");
      return;
    }
    
    try{
      var pngData = png.decode( inputBuffer );
      var ncpp = Math.round(pngData.data.length / (pngData.width*pngData.height) );
      var outputImage = new Image2D();
      var croppedArray = new pngData.data.constructor( pngData.data.buffer, 0, pngData.width * pngData.height * ncpp);
      outputImage.setData(croppedArray, pngData.width, pngData.height, ncpp);
      this._output[ 0 ] = outputImage;
    }catch(e){
      console.warn(e);
      //console.warn("This is not a PNG file, unable to decode this file.");
    }
  }
} /* PngDecoder */

export { PngDecoder }
