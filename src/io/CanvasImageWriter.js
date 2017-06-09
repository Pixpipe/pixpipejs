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
* If the input Image2D has values not in [0, 255], you can remap/stretch using
* setMetadata("min", xxx ) default: 0
* setMetadata("max", xxx ) default: 255
*
* **Usage**
* - [examples/imageToCanvasFilter.html](../examples/imageToCanvasFilter.html)
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

    this.addInputValidator(0, Image2D);
    
    this.setMetadata("alpha", false);
    this.setMetadata("min", 0);
    this.setMetadata("max", 255);
    this.setMetadata("reset", true);


    // so that we can flush the content
    this._canvas = null;
    this._ctx = null;
  }


  /**
  * Get the canvas used to print the Image2D;
  * @return {Object} canvas
  */
  getCanvas(){
    return this._canvas;
  }
  

  /**
  * [PRIVATE]
  * Initialize a new canvas object
  */
  _init(){


    var parentElem = document.getElementById( this.getMetadata("parentDivID") );

    if(! parentElem ){
      return false;
    }

    // reset content
    if(this.getMetadata("reset")){
      while (parentElem.firstChild) {
          parentElem.removeChild(parentElem.firstChild);
      }
    }

    // creating a canvas element
    this._canvas = document.createElement("canvas");
    this._canvas.style = "image-rendering: pixelated;";
    this._ctx = this._canvas.getContext('2d');

    // not sure this is useful since the style is "pixelated"
    // (does not seem to well super well with Firefox)
    this._ctx.imageSmoothingEnabled = false;
    this._ctx.mozImageSmoothingEnabled = false;
    this._ctx.webkitImageSmoothingEnabled = false;
    this._ctx.ctxmsImageSmoothingEnabled = false;

    document.getElementById(this.getMetadata("parentDivID")).appendChild(this._canvas);

    return true;
  }


  /**
  * Overwrite the generic (empty) method.
  */
  _run(){
    var that = this;

    // abort if invalid input
    if(!this.hasValidInput() )
      return;

    var image = this._input[0];
    var ncppSrc = image.getComponentsPerPixel();

    // only Image2d with 1 or 4 bands can be displayed
    if( ncppSrc != 1 && ncppSrc != 3 && ncppSrc != 4){
      console.warn("Cannot write Image in canvas if contains other than 1, 3 or 4 bands.");
      return;
    }

    if(!this.getMetadata("parentDivID")){
      console.error("The parent DIV ID to place the canvas element was not specified. Unable to display anything.");
      return;
    }

    // build a new canvas
    if( !this._init() ){
      console.warn("The parent div was not specified or does not exist.");
      return;
    }
    var useAlphaBand = this.getMetadata("alpha");

    // resizing the canvas
    this._canvas.width = image.getWidth();
    this._canvas.height = image.getHeight();

    var canvasImageData = this._ctx.getImageData(0, 0, this._canvas.width, this._canvas.height);
    var canvasImageDataArray = canvasImageData.data;

    // getting Image object data
    var originalImageDataArray = image.getData();

    // input image is RGBA
    if(ncppSrc == 4){
      for(var i=0; i<originalImageDataArray.length; i++){
        if(!useAlphaBand && i%4 == 3){
          canvasImageDataArray[i] = 255;
        }else{
          canvasImageDataArray[i] = this._stretchMinMax( originalImageDataArray[ i ] );
        }
      }

    // input image is mono chanel
    }else if(ncppSrc == 1){

      for(var i=0; i<originalImageDataArray.length; i++){
        var index1D = i*4;
        var stretchedValue = this._stretchMinMax(originalImageDataArray[i]);
        canvasImageDataArray[index1D] = stretchedValue;
        canvasImageDataArray[index1D + 1] = stretchedValue;
        canvasImageDataArray[index1D + 2] = stretchedValue;
        canvasImageDataArray[index1D + 3] = 255;
      }

    // input image is RGB
    }else if(ncppSrc == 3){
      var counter = 0;

      for(var i=0; i<canvasImageDataArray.length; i++){
        if(i%4 == 3){
          canvasImageDataArray[i] = 255;
        }else{
          canvasImageDataArray[i] = this._stretchMinMax(originalImageDataArray[ counter ]);
          counter ++;
        }
      }
    }
    
    this._ctx.putImageData(canvasImageData, 0, 0);
  }


  /**
  * [PRIVATE]
  * remap the intensity between getMetadata("min") and getMetadata("max")
  * @param {Number} intensity - input pixel value
  * @return {Number} the adjusted number
  */
  _stretchMinMax( intensity ){
    var min = this._metadata.min;
    var max = this._metadata.max;

    if(min == 0 && max == 255){
      return intensity;
    }

    return ( (intensity - min) / (max - min) ) * 255;
  }

}

export { CanvasImageWriter }
