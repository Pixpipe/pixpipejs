/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { Image2D } from '../core/Image2D.js';
import { ImageToImageFilter } from '../core/ImageToImageFilter.js';

/**
* A filter of type ForEachPixelImageFilter can perform a operation on evey pixel
* of an Image2D with a simple interface. For this purpose, a per-pixel-callback
* must be specified using method
* .on( "pixel" , function( coord, color ){ ... })
* where coord is of form {x, y} and color is of form [r, g, b, a] (with possibly)
* a different number of components per pixel.
* This callback must return, or null (original color not modified),
* or a array of color (same dimension as the one in arguments).
*
* **Usage**
* - [examples/forEachPixel.html](../examples/forEachPixel.html)
*
* @example
* var forEachPixelFilter = new pixpipe.ForEachPixelImageFilter();
* forEachPixelFilter.on( "pixel", function(position, color){
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
class ForEachPixelImageFilter extends ImageToImageFilter {

  constructor(){
    super();
  }


  /**
  * Run the filter
  */
  _run(){
    if( ! this.hasValidInput() )
      return;

    var inputImage2D = this._getInput();
    var firstPixel = 0;
    var lastPixel = inputImage2D.getWidth() * inputImage2D.getHeight();
    var increment = 1;

    var bufferCopy = inputImage2D.getDataCopy();

    this._forEachPixelOfSuch(bufferCopy, firstPixel, lastPixel, increment );

    // 1 - init the output
    var outputImg = this._addOutput( Image2D );

    // 2 - tune the output
    outputImg.setData(
      bufferCopy,
      inputImage2D.getWidth(),
      inputImage2D.getHeight(),
      inputImage2D.getComponentsPerPixel()
    );

  }


  /**
  * [PRIVATE]
  * generic function for painting row, colum or whole
  * @param {Number} firstPixel - Index of the first pixel in 1D array
  * @param {Number} lastPixel - Index of the last pixel in 1D array
  * @param {Number} increment - jump gap from a pixel to another (in a 1D style)
  */
  _forEachPixelOfSuch(buffer, firstPixel, lastPixel, increment ){
    // abort if no callback per pixel
    //if( ! ("pixel" in this._events)){
    if( ! ( this.hasEvent("pixel"))){
      console.warn("No function to apply per pixel was specified.");
      return;
    }

    var inputImage2D = this._getInput();
    var inputBuffer = inputImage2D.getData();
    var componentPerPixel = inputImage2D.getComponentsPerPixel();

    var currentColor = null;

    for(var p=firstPixel; p<lastPixel; p+=increment ){
      var firstCompoPos1D = p * componentPerPixel;
      var position2D = inputImage2D.get2dPositionFrom1dIndex(p);
      currentColor = inputBuffer.slice(firstCompoPos1D, firstCompoPos1D + componentPerPixel)

      var newColor = this.triggerEvent("pixel", position2D, currentColor);

      if(newColor && newColor.length == componentPerPixel){
        for(var i=0; i<componentPerPixel; i++){
          buffer[firstCompoPos1D + i] = newColor[i];
        }
      }

    }
  }


} /* END class ForEachPixelImageFilter */

export { ForEachPixelImageFilter }
