/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { ImageToImageFilter } from './ImageToImageFilter.js';

/**
* PixelWiseImageFilter is not supposed to be use as is and is just to
* be inherited by other filters.
* This class does not overload the update() method.
*/
class PixelWiseImageFilter extends ImageToImageFilter{

  constructor(){
    super();
  }


  /**
  * [PRIVATE]
  * generic function for painting row, colum or whole
  * @param {Number} firstPixel - Index of the first pixel in 1D array
  * @param {Number} lastPixel - Index of the last pixel in 1D array
  * @param {Number} increment - jump gap from a pixel to another (in a 1D style)
  */
  _forEachPixelOfSuch(firstPixel, lastPixel, increment ){
    // abort if no callback per pixel
    if( ! "pixel" in this._events){
      console.warn("No function to apply per pixel was specified.");
      return;
    }

    var inputImage2D = this._getInput();
    var inputBuffer = this._inputBuffer;
    var componentPerPixel = inputImage2D.getComponentsPerPixel();

    var currentColor = null;

    for(var p=firstPixel; p<lastPixel; p+=increment ){
      var firstCompoPos1D = p * componentPerPixel;
      var position2D = inputImage2D.get2dPositionFrom1dIndex(p);
      currentColor = inputBuffer.slice(firstCompoPos1D, firstCompoPos1D + componentPerPixel)

      var newColor = this._events.pixel( position2D, currentColor);

      if(newColor && newColor.length == componentPerPixel){
        for(var i=0; i<componentPerPixel; i++){
          inputBuffer[firstCompoPos1D + i] = newColor[i];
        }
      }

    }
  }


} /* END of class PixelWiseImageFilter */

export { PixelWiseImageFilter }
