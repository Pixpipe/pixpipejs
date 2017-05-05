/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { Image2D } from '../core/Image2D.js';
import { ImageToImageFilter } from '../core/ImageToImageFilter.js';

/**
*
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
      console.warn("A filter of type SpatialConvolutionFilter requires 1 input of category '0' and one input of category '1'.");
      return;
    }
    
    // they must be the same size and same ncpp
    if(!this.hasSameSizeInput() || !this.hasSameNcppInput()){
      return;
    }
    
    
  }
  
  
} /* END of class GradientImageFilter  */
