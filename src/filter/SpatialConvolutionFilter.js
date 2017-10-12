/*
* Author   Jonathan Lurie - http://me.jonathanlurie.fr
* License  MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { Image2D } from '../core/Image2D.js';
import { ImageToImageFilter } from '../core/ImageToImageFilter.js';

/**
* An instance of SpatialConvolutionFilter perform a convolution in a spatial reference,
* this can be applying a Sobel filter, a median or gaussian blur or perform a derivative.
* The filter is a NxM (aka. an array of arrays) of the following form:
* ```
*   var medianBlurFilter = [
*     [1/9, 1/9, 1/9],
*     [1/9, 1/9, 1/9],
*     [1/9, 1/9, 1/9],
*   ];
* ```
* For example, in the case of a simple derivative, it will be like that:
* ```
*  var dx = [
*    [1, -1]
*  ];
*
*  // or
*
*  var dy = [
*    [1],
*    [-1]
*  ];
* ```
* 
* The filter must be specified using the method `.setMetadata('filter', ...)`.
*
* **Usage**
*  - [examples/spatialConvolImage2D.html](../examples/spatialConvolImage2D.html)
*
*/
class SpatialConvolutionFilter extends ImageToImageFilter {

  constructor(){
    super();
    this.addInputValidator(0, Image2D);
    this.setMetadata("filter", null);
  }

  
  _run(){
    // the input checking
    if( ! this.hasValidInput()){
      console.warn("A filter of type SpatialConvolutionFilter requires 1 input of category '0' and one input of category '1'.");
      return;
    }
    
    var filter = this.getMetadata("filter");
    
    if( !filter ){
      console.warn("A filter must be specified using .setMetadata('filter', [[]])");
      return;
    }
    
    // input
    var inputImg = this._getInput( 0 );
    var inputData = inputImg.getData();
    var ncpp = inputImg.getNcpp();
    var width = inputImg.getWidth();
    var height = inputImg.getHeight();
    
    // output 
    var outputImg = new Image2D( {width: width, height: height, color: new Array(ncpp).fill(0) } )
    var outputData = outputImg.getData();
    
    // filter
    var filterSize = filter.length;
    var filterHeight = filter.length;
    var filterWidth = filter[0].length;
    var filterHalfWidth = Math.floor( filterWidth / 2 );
    var filterHalfHeight = Math.floor( filterHeight / 2 );
    
    // looping info
    var startX = filterHalfWidth
    var startY = filterHalfHeight;
    var endX = width - filterHalfWidth;
    var endY = height - filterHalfHeight;
    
    // along image width
    for(var iImg=startX ; iImg<endX; iImg++){

      // along image height
      for(var jImg=startY ; jImg<endY; jImg++){

        // get the 1D position of the first component
        var linearPosition = (jImg * width + iImg) * ncpp;

        // along filter width
        for(var iFilter=0; iFilter<filterWidth; iFilter++){
          
          // along filter height
          for(var jFilter=0; jFilter<filterHeight; jFilter++){
            
            var iUnderFilter = iImg + iFilter - filterHalfWidth;
            var jUnderFilter = jImg + jFilter - filterHalfHeight;
            var colorUnderFilter = inputImg.getPixel({x: iUnderFilter, y: jUnderFilter})
            var curentFilterValue = filter[jFilter][iFilter];
            
            // looping around components
            for(var c=0; c<ncpp; c++){
              outputData[ linearPosition + c] += colorUnderFilter[c] * curentFilterValue;
            } /* END for-loop over components */
            
          } /* END for-loop over filter height */
          
        } /* END for-loop over filter width */
        
      } /* END for-loop over image height */
      
    } /* END for-loop over image width */
    
    this._output[0] = outputImg;
    
  }
  
} /* END of class SpatialConvolutionFilter */ 

export { SpatialConvolutionFilter }
