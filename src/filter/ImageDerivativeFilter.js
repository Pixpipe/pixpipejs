/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { Image2D } from '../core/Image2D.js';
import { ImageToImageFilter } from '../core/ImageToImageFilter.js';


/**
* A ImageDerivativeFilter filter will compute the dx and dy derivative using the filters
* h = [1, -1]
* 
* You can change the built-in filters that perform the derivative by setting the metadata
*  "dxFilter" and "dyFilter" with the method `.setMetadata()`. See the documentation of
* `SpatialConvolutionFilter` to make your custom filter compatible.
*
* **Usage**
* - [examples/derivativeImage2D.html](../examples/derivativeImage2D.html)
*
*/
class ImageDerivativeFilter extends ImageToImageFilter {
  
  constructor(){
    super();
    this.addInputValidator(0, Image2D);
    
    // filters for derivative
    var dx = [
        [1, -1]
      ];
      
    var dy = [
        [1],
        [-1]
      ];
      
    this.setMetadata("dxFilter", dx);
    this.setMetadata("dyFilter", dy);
  }
  
  _run(){
    // the input checking
    if( ! this.hasValidInput()){
      console.warn("A filter of type ImageDerivativeFilter requires 1 input of category '0' and one input of category '1'.");
      return;
    }
    
    var inputImg = this._getInput( 0 );
    
    var dx = this.getMetadata('dxFilter');
    var dy = this.getMetadata('dyFilter');
  
    var spatialConv = new pixpipe.SpatialConvolutionFilter();
    spatialConv.addInput( inputImg );
    
    spatialConv.setMetadata("filter", dx);
    spatialConv.update();
    
    this._output["dx"] = spatialConv.getOutput();
    
    spatialConv.setMetadata("filter", dy);
    spatialConv.update();
    
    this._output["dy"] = spatialConv.getOutput();
    
  }
  
} /* END class ImageDerivativeFilter */


export { ImageDerivativeFilter }
