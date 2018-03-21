/*
* Author   Jonathan Lurie - http://me.jonathanlurie.fr
* License  MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { Image2D } from '../core/Image2D.js';
import { ImageToImageFilter } from '../core/ImageToImageFilter.js';
import { Colormap } from '../helper/Colormap.js';

/**
* An instance of ApplyColormapFilter applies a colormap on a chose channel (aka. component) of an Image2D.
* Several optional `metadata` are available to tune the end result:
* - `.setMetadata("style", xxx: String);` see the complete list at http://www.pixpipe.io/pixpipejs/examples/colormap.html . Default is "jet"
* - `.setMetadata("flip", xxx; Bolean );` a fliped colormap reverses its style. Default: false
* - `.setMetadata("min", xxx: Number );` and `.setMetadata("max", xxx: Number );` if specified, will replace the min and max of the input image. This can be used to enhance of lower the contrast
* - `setMetadata("clusters", xxx: Number );` The number of color clusters. If not-null, this will turn a smooth gradient into a set of xxx iso levels of color. Default: null
* - `.setMetadata("component", xxx: Number )` The component to use on the input image to perform the colormapping. Default: 0
*
* This filter requires an Image2D as input `0` and output a 3-components RGB Image2D of the same size as the input.
*
* **Usage**
* - [examples/nniColormap.html](../examples/nniColormap.html)
* - [examples/photoColorMap.html](../examples/photoColorMap.html)
*
*/
class ApplyColormapFilter extends ImageToImageFilter {
  constructor(){
    super();
    this.addInputValidator(0, Image2D);

    // the default colormap style is jet (rainbow)
    this.setMetadata("style", "jet");

    // flip the colormap (no by default)
    this.setMetadata("flip", false );

    // min and max should come from the min and max of the input image,
    // thought they can be changed manually to adapt the colormap to a different range
    this.setMetadata("min", undefined );
    this.setMetadata("max", undefined );

    // how many color cluster? For smooth gradient, keep it null
    this.setMetadata("clusters", null );

    // In case of using an image with more than 1 component per pxel (ncpp>1)
    // we must choose on which component is computer the colormap
    // (default: the 0th, so the Red for a RGB image)
    this.setMetadata("component", 0)
  }


  _run(){
    if( ! this.hasValidInput()){
      console.warn("A filter of type CropImageFilter requires 1 input of category '0' (Image2D)");
      return;
    }

    var inputImage = this._getInput( 0 );
    var inputWidth = inputImage.getWidth();
    var inputHeight = inputImage.getHeight();
    var ncpp = inputImage.getNcpp();
    var component = this.getMetadata("component");

    if( component >= ncpp ){
      console.warn("The chosen component must be lower than the input ncpp");
      return;
    }

    var min = this.getMetadata( "min" ) || inputImage.getMin();
    var max = this.getMetadata( "max" ) || inputImage.getMax();
    var clusters = this.getMetadata( "clusters" );

    if( Math.abs(min - max) < 1e-6 ){
      console.warn("Min and max values are similar, no interpolation is possible.");
      return;
    }

    var cm = new Colormap();
    cm.setMetadata("flip", this.getMetadata("flip") );
    cm.setStyle( this.getMetadata("style") );

    var lookupFunction = cm.getValueAt.bind(cm);
    if( clusters ){
      lookupFunction = cm.getValueAtWithClusters.bind(cm);
    }

    var inputData = inputImage.getData();

    var outputImage = new Image2D({
      width  : inputWidth,
      height : inputHeight,
      color  : new Uint8Array( [0, 0, 0] )
    })

    cm.buildLut();

    for( var i=0; i<inputWidth; i++){
      for( var j=0; j<inputHeight; j++){
        var inputColor = inputImage.getPixel({ x: i, y: j})[component];
        
        var normalizedIntensity = ( inputColor - min ) / ( max - min );
        var color = lookupFunction( normalizedIntensity, clusters )

        outputImage.setPixel(
          {x: i, y: j},
          color
        )
      }
    }

    this._output[ 0 ] = outputImage;
  }


} /* END of class ApplyColormapFilter */

export { ApplyColormapFilter }
