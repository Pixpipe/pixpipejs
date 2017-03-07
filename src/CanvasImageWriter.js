/**
* CanvasImageWriter is a filter to output an instance of Image into a
* HTML5 canvas element.
* See examples/imageToCanvasFilter.html to see how it works.
*/


import { Image2D } from './Image2D.js';
import { Filter } from './Filter.js';

class CanvasImageWriter extends Filter{

  /**
  * @param {String} idOfParent - dom id of the future canvas' parent.
  * (most likely the ID of a div)
  */
  constructor( idOfParent){
    // call Filter constructor
    super();

    // so that we can flush the content
    this._parentId = idOfParent;
    this._canvas = null;
    this._ctx = null;
  }


  /**
  * Overloaded validation method.
  */
  validateInput(){

    try{
      this._isInputValid = this._input[0].isOfType( Image2D.TYPE() );
    }catch(e){
      this._isInputValid = false;
      console.error("The input is not valid");
    }

  }


  /**
  * [PRIVATE]
  * Initialize a new canvas object
  */
  _init(){
    var parentElem = document.getElementById(this._parentId);
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

    document.getElementById(this._parentId).appendChild(this._canvas);
  }


  /**
  * Overwrite the generic (empty) method.
  */
  update(){
    this.validateInput();

    // abort if invalid input
    if(!this._isInputValid)
      return;

    // build a new canvas
    this._init();

    var image = this._input[0];

    // resizing the canvas
    this._canvas.width = image.getWidth();
    this._canvas.height = image.getHeight();

    var canvasImageData = this._ctx.getImageData(0, 0, this._canvas.width, this._canvas.height);
    var canvasImageDataArray = canvasImageData.data;

    // getting Image object data
    var originalImageDataArray = image.getData();

    // copying the data into the canvas array (clamped uint8)
    originalImageDataArray.forEach( function(value, index){
      canvasImageDataArray[index] = value;
    });
    this._ctx.putImageData(canvasImageData, 0, 0);



  }

}

export { CanvasImageWriter }
