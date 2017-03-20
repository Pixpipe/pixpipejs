/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { Image2D } from '../core/Image2D.js';
import { Filter } from '../core/Filter.js';

/**
* CanvasImageWriter is a filter to output an instance of Image into a
* HTML5 canvas element.
* The metadata "parentDivID" has to be set using `setMetadata("parentDivID", "whatever")`
* The metadata "alpha", if true, enable transparency. Default: false.
* usage: examples/imageToCanvasFilter.html
*
* @example
// create an image
* var myImage = new pixpipe.Image2D({width: 100, height: 250, color: [255, 128, 64, 255]})
*
* // create a filter to write the image into a canvas
* var imageToCanvasFilter = new pixpipe.CanvasImageWriter( "myDiv" );
* imageToCanvasFilter.addInput( myImage );
* imageToCanvasFilter.update();
*/
class CanvasImageWriter extends Filter{

  /**
  * @param {String} parentDivID - dom id of the future canvas' parent.
  * (most likely the ID of a div)
  */
  constructor(){
    // call Filter constructor
    super();

    this._inputValidator[ 0 ] = Image2D.TYPE();
    this.setMetadata("alpha", false);

    // so that we can flush the content
    this._canvas = null;
    this._ctx = null;
  }


  /**
  * [PRIVATE]
  * Initialize a new canvas object
  */
  _init(){

    var parentElem = document.getElementById( this.getMetadata("parentDivID") );
    while (parentElem.firstChild) {
        parentElem.removeChild(parentElem.firstChild);
    }

    // creating a canvas element
    this._canvas = document.createElement("canvas");
    this._canvas.style = "image-rendering: pixelated;";
    this._ctx = this._canvas.getContext('2d');

    // not sure this is useful since the style is "pixelated"
    // (does not seem to well super well with Firefox)
    this._ctx.imageSmoothingEnabled = true;
    this._ctx.mozImageSmoothingEnabled = false;
    this._ctx.webkitImageSmoothingEnabled = false;
    this._ctx.ctxmsImageSmoothingEnabled = false;

    document.getElementById(this.getMetadata("parentDivID")).appendChild(this._canvas);
  }


  /**
  * Overwrite the generic (empty) method.
  */
  _run(){

    // abort if invalid input
    if(!this.hasValidInput() )
      return;

    var image = this._input[0];
    var ncppSrc = image.getComponentsPerPixel();

    // only Image2d with 1 or 4 bands can be displayed
    if( ncppSrc != 1 && ncppSrc != 4){
      console.warn("Cannot write Image in canvas if contains other than 1 or 4 bands.");
      return;
    }

    if(!this.getMetadata("parentDivID")){
      console.error("The parent DIV ID to place the canvas element was not specified. Unable to display anything.");
      return;
    }

    // build a new canvas
    this._init();
    var useAlphaBand = this.getMetadata("alpha");

    // resizing the canvas
    this._canvas.width = image.getWidth();
    this._canvas.height = image.getHeight();

    var canvasImageData = this._ctx.getImageData(0, 0, this._canvas.width, this._canvas.height);
    var canvasImageDataArray = canvasImageData.data;

    // getting Image object data
    var originalImageDataArray = image.getData();

    if(ncppSrc == 4){
      // copying the data into the canvas array (clamped uint8)
      originalImageDataArray.forEach( function(value, index){
        if(!useAlphaBand && index%4 == 3){
          canvasImageDataArray[index] = 255;
        }else{
          canvasImageDataArray[index] = value;
        }
      });

    }else if(ncppSrc == 1){
      originalImageDataArray.forEach( function(value, index){
        canvasImageDataArray[index*4] = value;
        canvasImageDataArray[index*4 + 1] = value;
        canvasImageDataArray[index*4 + 2] = value;
        canvasImageDataArray[index*4 + 3] = 255;
      });

    }

    this._ctx.putImageData(canvasImageData, 0, 0);

  }

}

export { CanvasImageWriter }
