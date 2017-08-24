/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


import { Image2D } from '../core/Image2D.js';
import { Filter } from '../core/Filter.js';


/**
* This Filter is a bit special in a sense that it does not output anything. It takes
* an Image2D as output "0" and the event "pixel" must be defined, with a callback taking
* two arguments: the position as an object {x: Number, y: Number} and the color as
* an array, ie. [Number, Number, Number] for an RGB image.
*
* This filter is convenient for computing statistics or for anything where the output is mannually
* created ( because the filter ForEachPixelImageFilter creates an output with same number of band.)
*
* **Usage**
* - [the filter TerrainRgbToElevationImageFilter](https://github.com/Pixpipe/pixpipejs/blob/master/src/filter/TerrainRgbToElevationImageFilter.js)
*
*/
class ForEachPixelReadOnlyFilter extends Filter {

  constructor(){
    super();
    this.addInputValidator(0, Image2D);
  }


  _run(){

    // the input checking
    if( ! this.hasValidInput()){
      console.warn("A filter of type ForEachPixelReadOnlyFilter requires 1 input of category '0'.");
      return;
    }

    if( ! ( this.hasEvent("pixel"))){
      console.warn("No function to apply per pixel was specified.");
      return;
    }

    var imageIn = this._getInput(0);
    var ncpp = imageIn.getNcpp();
    var width = imageIn.getWidth();
    var height = imageIn.getHeight();

    // reading pixel by pixel
    for(var j=0; j<height; j++){
      for(var i=0; i<width; i++){
        var position = {x: i, y: j};
        var color = imageIn.getPixel( position );
        this.triggerEvent("pixel", position, color);
      }
    }
  }

} /* END of class ForEachPixelReadOnlyFilter */

export { ForEachPixelReadOnlyFilter }
