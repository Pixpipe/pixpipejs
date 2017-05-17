/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { Image2D } from '../core/Image2D.js';
import { ImageToImageFilter } from '../core/ImageToImageFilter.js';

/**
* An instance of GradientImageFilter takes 2 input Image2D: a derivative in x,
* with the category "dx" and a derivative in y with the category "dy". They must
* be the same size and have the same number of  components per pixel.
*
* **Usage**
* - [examples/gradientImage2D.html](../examples/gradientImage2D.html)
*/
class GradientImageFilter extends ImageToImageFilter {
  
  constructor(){
    super();
    
    this.addInputValidator('dx', Image2D);
    this.addInputValidator('dy', Image2D);
  }
  
  _run(){
    // the input checking
    if( ! this.hasValidInput()){
      console.warn("A filter of type GradientImageFilter requires 1 input of category 'dx' and 1 input of category 'dy'.");
      return;
    }
    
    // they must be the same size and same ncpp
    if(!this.hasSameSizeInput() || !this.hasSameNcppInput()){
      return;
    }
    
    var dxImage = this._getInput("dx");
    var dxImageData = dxImage.getData();
    
    var dyImage = this._getInput("dy");
    var dyImageData = dyImage.getData();
    
    var gradMagnitude = dxImage.hollowClone();
    var gradMagnitudeData = gradMagnitude.getData();
    
    var gradDirection = dxImage.hollowClone();
    var gradDirectionData = gradDirection.getData();
    
    var magnitudeExtrema = {min: Infinity, max: -Infinity};
    var directionExtrema = {min: Infinity, max: -Infinity};
    
    for(var i=0; i<dxImageData.length; i++){
      // gradient magnitude
      gradMagnitudeData[i] = Math.sqrt(dxImageData[i]*dxImageData[i] + dyImageData[i]*dyImageData[i]);
      if(! isNaN(gradMagnitudeData[i])){
        magnitudeExtrema.min = Math.min(magnitudeExtrema.min, gradMagnitudeData[i]);
        magnitudeExtrema.max = Math.max(magnitudeExtrema.max, gradMagnitudeData[i]);
      }
      
      // gradient direction
      gradDirectionData[i] = Math.atan(dyImageData[i] / dxImageData[i]);
      if(! isNaN(gradDirectionData[i])){
        directionExtrema.min = Math.min(directionExtrema.min, gradDirectionData[i]);
        directionExtrema.max = Math.max(directionExtrema.max, gradDirectionData[i]);
      }
    }
    
    gradMagnitude.setMetadata("min", magnitudeExtrema.min);
    gradMagnitude.setMetadata("max", magnitudeExtrema.max);
    
    gradDirection.setMetadata("min", directionExtrema.min);
    gradDirection.setMetadata("max", directionExtrema.max);
    
    this._output["direction"] = gradDirection;
    this._output["magnitude"] = gradMagnitude;
  }
  
  
} /* END of class GradientImageFilter  */

export { GradientImageFilter }
