/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


import { Image2D } from '../core/Image2D.js';
import { ImageToImageFilter } from '../core/ImageToImageFilter.js';


/**
* Multiply two Image2D pixel by pixel. They must have the same number of components per pixel
* and the same size.
* Output an new Image3D.
* Equivalent to `SpectralScaleImageFilter`.
*
* **Usage**
*  - [examples/multiplyImage2D.html](../examples/multiplyImage2D.html)
*
*/
class MultiplyImageFilter extends ImageToImageFilter {

  constructor(){
    super();
    this.addInputValidator(0, Image2D);
    this.addInputValidator(1, Image2D);
  }


  _run(){

    // the input checking
    if( ! this.hasValidInput()){
      console.warn("A filter of type MultiplyImageFilter requires 1 input of category '0' and one input of category '1'.");
      return;
    }
      
    if( !this.hasSameNcppInput() || !this.hasSameSizeInput() ){
      return;
    }

    this.addTimeRecord("step1");

    var img0 = this._getInput( 0 );
    var img1 = this._getInput( 1 );


    var img1Buffer = img1.getData();
    this.addTimeRecord("step1.5");
    var outputBuffer = img0.getDataCopy();

    this.addTimeRecord("step2");

    for(var i=0; i<outputBuffer.length; i++){
      outputBuffer[ i ] *= img1Buffer[ i ];
    }

    this.addTimeRecord("step3");



    var img2D = this._addOutput( Image2D );

    img2D.setData(
      outputBuffer,
      img0.getWidth(),
      img0.getHeight()
    );

    this.addTimeRecord("step4");
    this.getTime("step1", "step1.5", true);
    this.getTime("step1.5", "step2", true);
    this.getTime("step2", "step3", true);
    this.getTime("step3", "step4", true);
  }

} /* END class MultiplyImageFilter */


export { MultiplyImageFilter }
