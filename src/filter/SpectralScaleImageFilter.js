/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { Image2D } from '../core/Image2D.js';
import { ImageToImageFilter } from '../core/ImageToImageFilter.js';

/**
* Multiply an image by the other, like a scaling function.
* The image requires two inputs named "0" and "1".
* Simply use `addInput( myImg1, "0" )`
* and `addInput( myImg2, "1" )`. The input "0" can have 1 or more bands while
* the input "1" can have only one band since the same scale is apply to each band.
*
* **Usage**
* - [examples/forEachPixelGadient.html](../examples/forEachPixelGadient.html)
*/
class SpectralScaleImageFilter extends ImageToImageFilter {

  constructor(){
    super();

    // both input are images.
    this.addInputValidator(0, Image2D);
    this.addInputValidator(1, Image2D);

    
  }


  /**
  * Run the filter
  */
  _run(){
    if(! this.hasValidInput() ){
      return;
    }
    
    // filter must have valid input of the same size
    if( !this.hasSameSizeInput() || !this.hasValidInput()){
      return;
    }

    var dataImg0 = this._getInput(0);
    var dataImg1 = this._getInput(1);

    // the input "1" (aka. the scaling data) must be single band
    if( dataImg1.getComponentsPerPixel() != 1 ){
      console.warn("The scaling image must have one single band.");
      return;
    }

    var nbOfPixels = dataImg0.getWidth() * dataImg0.getHeight();
    var ncpp = dataImg0.getComponentsPerPixel();

    var data0 = dataImg0.getDataCopy();
    var data1 = dataImg1.getData();

    // scale the spectral info
    for(var p=0; p<nbOfPixels; p++){
      for(var b=0; b<ncpp; b++){
        data0[ p*ncpp + b ] *=  data1[p];
      }
    }

    // building the output
    var img2D = this._addOutput( Image2D );
    img2D.setData(
      data0,
      dataImg0.getWidth(),
      dataImg0.getHeight()
    );

  }


} /* END class SpectralScaleImageFilter */

export { SpectralScaleImageFilter }
