/*
* Author   Jonathan Lurie - http://me.jonathanlurie.fr
* License  MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import geotiff from 'geotiff';
import { Filter } from '../core/Filter.js';
import { Image2D } from '../core/Image2D.js';


/**
* Read and decode Tiff format. The decoder for BigTiff is experimental.
* Takes an ArrayBuffer of a tiff file as input and the TiffDecoder outputs an Image2D.
* Tiff format is very broad and this decoder, thanks to the Geotiff npm package
* is compatible with single or multiband images, with or without compression, using
* various bith depth and types (8bits, 32bits, etc.)
*
* Info: Tiff 6.0 specification http://www.npes.org/pdf/TIFF-v6.pdf
*
* **Usage**
* - [examples/fileToTiff.html](../examples/fileToTiff.html)
*
*/
class TiffDecoder extends Filter {
  constructor() {
    super();
    this.addInputValidator(0, ArrayBuffer);
  }
  
  _run(){

    var inputBuffer = this._getInput(0);

    if(!inputBuffer){
      console.warn("TiffDecoder requires an ArrayBuffer as input \"0\". Unable to continue.");
      return;
    }
    
    var success = false;
    
    try{
      var tiffData = geotiff.parse(inputBuffer);
      var tiffImage = tiffData.getImage();
      
      var data = tiffImage.readRasters( {interleave: true} );
      var width = tiffImage.getWidth();
      var height = tiffImage.getHeight();
      var ncpp = tiffImage.getSamplesPerPixel();
      
      if(ncpp == (data.length / (width*height))){
        success = true;
      }
      
      if( success ){
        var outputImg = this._addOutput( Image2D );
        outputImg.setData( data, width, height, ncpp);
      }else{
        console.warn("Tiff support is experimental and this file is not compatible.");
      }
    }catch(e){
      console.warn("This buffer is not from a TIFF file.");
    }
    
  }
  
  
} /* END of class TiffDecoder */

export { TiffDecoder }
