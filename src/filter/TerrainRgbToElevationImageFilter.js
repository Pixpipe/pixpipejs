/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


import { Image2D } from '../core/Image2D.js';
import { ImageToImageFilter } from '../core/ImageToImageFilter.js';
import { ForEachPixelReadOnlyFilter } from './ForEachPixelReadOnlyFilter.js';


/**
* This filter's purpose is to convert Mapbox's TerrainRGB image data into monochannel
* elevation (in meter).
* See more info about the format here: https://www.mapbox.com/blog/terrain-rgb/
* The filter takes an Image2D that respect Mapbox's format (can be a result of stictching tiles together)
* and output a single component image with possibly up to 16777216 different values.
*
* **Usage**
* - [examples/terrainRgbToElevation.html](../examples/terrainRgbToElevation.html)
*
*/
class TerrainRgbToElevationImageFilter extends ImageToImageFilter {

  constructor(){
    super();
    this.addInputValidator(0, Image2D);
  }

  _run(){
    // the input checking
    if( ! this.hasValidInput()){
      console.warn("A filter of type TerrainRgbToElevationImageFilter requires 1 input of category '0'.");
      return;
    }

    var imageIn = this._getInput(0);
    var ncpp = imageIn.getNcpp();
    var width = imageIn.getWidth();
    var height = imageIn.getHeight();

    // the image must be RGB or RGBA (we dont use A)
    if(ncpp < 3){
      console.warn("A filter of type TerrainRgbToElevationImageFilter requires an input with at least 3 components per pixel.");
      return;
    }

    // monochannel output, init with zeros
    var outputImg = new pixpipe.Image2D({width: width, height: height, color: [0]})
    var forEachPixelFilterRead = new pixpipe.ForEachPixelReadOnlyFilter();

    // add the input input
    forEachPixelFilterRead.addInput( imageIn );

    forEachPixelFilterRead.on( "pixel", function(position, color){
      var elevation = -10000 + ((color[0] * 256 * 256 + color[1] * 256 + color[2]) * 0.1)
      outputImg.setPixel( position, [ elevation ])
    });

    forEachPixelFilterRead.update();
    this._output[0] = outputImg;
  }

} /* END of class TerrainRgbToElevationImageFilter */


export { TerrainRgbToElevationImageFilter }
