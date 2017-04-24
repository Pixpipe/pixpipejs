/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { Image2D } from '../core/Image2D.js';
import { ImageToImageFilter } from '../core/ImageToImageFilter.js';


/**
* An instance of SimpleThresholdFilter perform a threshold on an input image.
* The input must be an Image2D with 1, 3 or 4 bands.
* The default threshold can be changed using `.setMetadata("threshold", 128)`
* and the low and high value can be replaced using `.setMetadata("lowValue", 0)`
* and `.setMetadata("highValue", 255)`. In addition, in case of dealing with a
* RGBA image, you can decide of preserving the alpha channel or not, using 
* `.setMetadata("preserveAlpha", true)`.
*
* **Usage**
*  - [examples/imageThresholding.html](../examples/imageThresholding.html)
*/
class SimpleThresholdFilter extends ImageToImageFilter {
  
  constructor(){
    super();
    
    // default values
    this.setMetadata("threshold", 128);
    this.setMetadata("lowValue", 0);
    this.setMetadata("highValue", 255);
    this.setMetadata("preserveAlpha", false);
  }
  
  
  _run(){
    // the input checking
    if(!this.hasInputOfCategory(0)){
      console.warn("A filter of type SimpleThresholdFilter requires 1 input of category '0'.");
      return;
    }
    
    var inputImg = this._getInput( 0 );
    
    // creating a blank Image2D output
    this._addOutput( Image2D );
    
    // Number of bands
    var ncpp = inputImg.getComponentsPerPixel();
    
    // having a local value is faster than fetching an object
    var threshold = this.getMetadata("threshold");
    var lowValue = this.getMetadata("lowValue");
    var highValue = this.getMetadata("highValue");
    
    // get a copy of the input buffer so that we dont overwrite it!
    var outputBuffer = inputImg.getDataCopy();
    
    // if the input image has:
    // - a single band, OR
    // - three bands (assuming RGB), OR
    // - four bands (assuming RGBA)
    if(ncpp == 1 || ncpp == 3 || ncpp == 4){
      
      if( this.getMetadata("preserveAlpha") ){
        
        for(var i=0; i<outputBuffer.length; i++){
          // every four band is an alpha band
          if(i%4 == 3){
            continue;
          }
          outputBuffer[i] = outputBuffer[i] < threshold ? lowValue : highValue;
        }
        
      }else{
        // if 
        for(var i=0; i<outputBuffer.length; i++){
          outputBuffer[i] == outputBuffer[i] < threshold ? lowValue : highValue;
        }
        
      }
      
      // filling the output image
      var outputImg = this.getOutput();
      outputImg.setData(
        outputBuffer,
        inputImg.getWidth(),
        inputImg.getHeight(),
        ncpp
      );
      
    }else{
      console.warn("The input data must have 1, 3 or 4 components per pixel.");
      return;
    }
    
    
    
  }
  
} /* END of class SimpleThresholdFilter */

export { SimpleThresholdFilter }
