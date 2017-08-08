/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { Image2D } from '../core/Image2D.js';
import { ImageToImageFilter } from '../core/ImageToImageFilter.js';

/**
* An instance of CropImageFilter is used to crop an `Image2D`. This filter accepts
* a single input, using `.addInput( myImage )`, then, it requires a top left point
* that must be set with `.setMetadata( "x", Number)` and `.setMetadata( "y", Number)`.
* In addition, you must specify the width and heigth of the output using 
* `.setMetadata( "w", Number)` and `.setMetadata( "h", Number)`.
*
* **Usage**
* - [examples/cropImage2D.html](../examples/cropImage2D.html)
*
*/
class CropImageFilter extends ImageToImageFilter {
  constructor(){
    super();
    this.addInputValidator(0, Image2D);
    
    this.setMetadata( "x", 0 );
    this.setMetadata( "y", 0 );
    this.setMetadata( "w", 0 );
    this.setMetadata( "h", 0 );
  }
  
  
  _run(){
    if( ! this.hasValidInput()){
      console.warn("A filter of type CropImageFilter requires 1 input of category '0' (Image2D)");
      return;
    }
    
    var startX = Math.round( this.getMetadata( "x" ) );
    var startY = Math.round(this.getMetadata( "y" ) );
    var outW = Math.round(this.getMetadata( "w" ) );
    var outH = Math.round(this.getMetadata( "h" ) );
    var endX = startX + outW;
    var endY = startY + outH;
    
    var inputImage = this._getInput( 0 );
    var inputWidth = inputImage.getWidth();
    var inputHeight = inputImage.getHeight();
    var ncpp = inputImage.getNcpp();
    
    if( startX < 0 || startY < 0 || startX >= inputWidth || startY >= inputHeight ||
        endX < 0 || endY < 0 || endX >= inputWidth || endY >= inputHeight){
      console.warn("The query area is out of bound");
      return;
    }
    
    var inputData = inputImage.getData();
    
    var outputImage = new Image2D({ 
      width  : outW,
      height : outH,
      color  : new inputData.constructor( ncpp )
    })
    
    for( var i=0; i<outW; i++){
      for( var j=0; j<outH; j++){
        var inputColor = inputImage.getPixel({ x: i+startX, y: j+startY})
        outputImage.setPixel(
          {x: i, y: j},
          inputColor
        )
      }
    }
    
    this._output[ 0 ] = outputImage;
  }
  
  
} /* END of class CropImageFilter */

export { CropImageFilter }
