/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { Image2D } from '../core/Image2D.js';
import { ImageToImageFilter } from '../core/ImageToImageFilter.js';


/**
* A NormalizeImageFilter instance takes an Image2D as input and outputs an Image2D.
* The output images will have values in [0.0, 1.0]. One of the usage is that is can then
* be used as a scaling function.
* 
* The max value to normalize with will be the max value of the input image (among all components)
* but an manual max value can be given to this filter using `.setMetadata("max", m)`.
*
* **Usage**
* - [examples/gradientHueWheelImage2D.html](../examples/gradientHueWheelImage2D.html)
*
*/
class NormalizeImageFilter extends ImageToImageFilter {
  
  constructor(){
    super();
    this.addInputValidator(0, Image2D);
    
    this.setMetadata("max", NaN);
  }
  
  
  _run(){
    // the input checking
    if( ! this.hasValidInput()){
      console.warn("A filter of type */ requires 1 input of category '0'.");
      return;
    }
    
    var inputImage = this._input[0];
    var inputData = inputImage.getData();
    var outputImg = inputImage.hollowClone();
    var outputData = outputImg.getData();
    
    var max = this.getMetadata("max");
    if(isNaN(max)){
      max = inputImage.getMax();
    }
    
    for(var i=0; i<inputData.length; i++){
      outputData[i] = inputData[i] / max;
    }
    
    this._output[0] = outputImg;
  }
  
  
} /* END class NormalizeImageFilter */

export { NormalizeImageFilter }
