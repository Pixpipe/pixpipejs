/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

//import tiff from 'tiff';
import { UTIF } from '../non_npm_modules/UTIF.js/UTIF.js';
import { Filter } from '../core/Filter.js';
import { Image2D } from '../core/Image2D.js';


/**
* Read and decode Tiff format
*/
class TiffDecoder extends Filter {
  constructor() {
    super();
    this.addInputValidator(0, ArrayBuffer);
  }
  
  _run(){

    var inputBuffer = this._getInput(0);

    if(!inputBuffer){
      console.warn("NiftiDecoder requires an ArrayBuffer as input \"0\". Unable to continue.");
      return;
    }
    
    var utifDecoded = UTIF.decode(inputBuffer);
    console.log( utifDecoded );
    
    if( utifDecoded ){
      if( utifDecoded.length ){
        console.log(utifDecoded[0]);
        var width = utifDecoded[0].width;
        var height = utifDecoded[0].height;
        var data = utifDecoded[0].data;
        var ncpp = data.length / (width * height);
        
        var outputImg = this._addOutput( Image2D );
        outputImg.setData( data, width, height, ncpp);
        
      }
    }
    
    /*
    var decoded = tiff.decode( inputBuffer)
    
    console.log(decoded);
    
    if(decoded.length > 0){
      var tiffIfd = decoded[0];
      console.log( tiffIfd.data );
      console.log( tiffIfd.width );
      console.log( tiffIfd.height );
      console.log( tiffIfd.bitsPerSample );
      console.log( tiffIfd.components );
      console.log( tiffIfd.imageDescription );
      console.log( tiffIfd );
      
      
      var outputImg = this._addOutput( Image2D );
      outputImg.setData( tiffIfd.data, tiffIfd.width, tiffIfd.height, tiffIfd.components);
      
      
      
      
      
    }else{
      console.warn("Could no decode this tiff file.");
    }
    */
    
    
    
  }
  
  
} /* END of class TiffDecoder */

export { TiffDecoder }
