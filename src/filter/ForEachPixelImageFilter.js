/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { Image2D } from '../core/Image2D.js';
import { PixelWiseImageFilter } from '../core/PixelWiseImageFilter.js';

/**
* A filter of type ForEachPixelImageFilter can perform a operation on evey pixel
* of an Image2D with a simple interface. For this purpose, we have to write a
* callback that will be used for every pixel. This callback will be called with
* the current position and the current color as argument and must return a array
* of colors the same size of the number of compnents per pixel. If this callback
* returns null, then the original color is not modified.
*
* Usage: examples/forEachPixel.html
*
* @example
* var forEachPixelFilter = new pixpipe.ForEachPixelImageFilter(
*   function(position, color){
*
*     return [
*       color[1], // red (takes the values from green)
*       color[0], // green (takes the values from red)
*       color[2] * 0.5, // blue get 50% darker
*       255 // alpha, at max
*     ]
*
*   }
* );
*
*/
class ForEachPixelImageFilter extends PixelWiseImageFilter {

  /**
  * @param {function} cb - callback of what to do for each pixel
  */
  constructor( cb = null ){
    super();
    this._perPixelCallback = cb;
  }


  /**
  * Run the filter
  */
  update(){
    if( ! this.hasValidInput())
      return;

    var inputImage2D = this._getInput();
    var firstPixel = 0;
    var lastPixel = inputImage2D.getWidth() * inputImage2D.getHeight();
    var increment = 1;

    this._inputBuffer = inputImage2D.getDataCopy();

    this._forEachPixelOfSuch(firstPixel, lastPixel, increment, this._perPixelCallback );

    // building the output
    var img2D = new Image2D();
    img2D.setData( this._inputBuffer, inputImage2D.getWidth(), inputImage2D.getHeight());
    this._setOutput( img2D );
  }

} /* END class ForEachPixelImageFilter */

export { ForEachPixelImageFilter }
