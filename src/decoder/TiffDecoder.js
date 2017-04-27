
import tiff from 'tiff';
import { Filter } from '../core/Filter.js';
import { Image2D } from '../core/Image2D.js';

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
    
    var decoded = tiff.decode( inputBuffer )
    
    if(decoded.length > 0){
      var tiffIfd = decoded[0];
      /*
      console.log( tiffIfd.width );
      console.log( tiffIfd.height );
      console.log( tiffIfd.bitsPerSample );
      console.log( tiffIfd.components );
      console.log( tiffIfd.imageDescription );
      console.log( tiffIfd );
      */
      
      var outputImg = this._addOutput( Image2D );
      outputImg.setData( tiffIfd.data, tiffIfd.width, tiffIfd.height, tiffIfd.components);

    }else{
      console.warn("Could no decode this tiff file.");
    }
    
    
    
    
  }
  
  
} /* END of class TiffDecoder */

export { TiffDecoder }
