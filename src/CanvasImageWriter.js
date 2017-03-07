/**
*
*/


import { Image } from './Image.js';
import { Filter } from './Filter.js';

class CanvasImageWriter extends Filter{

  /**
  * @param {String} id - dom id of the canvas element
  */
  constructor( id ){
    // call Filter constructor
    super();

    // creating a canvas element
    this._canvas = document.getElementById(id);
    this._canvas.style = "image-rendering: pixelated;"

    this._ctx = this._canvas.getContext('2d');

    // not sure this is useful since the style is "pixelated"
    // (does not seem to well super well with Firefox)
    this._ctx.imageSmoothingEnabled = true;
    this._ctx.mozImageSmoothingEnabled = false;
    this._ctx.webkitImageSmoothingEnabled = false;
    this._ctx.ctxmsImageSmoothingEnabled = false;

  }


  /**
  * Overloaded validation method.
  */
  validateInput(){

    try{
      this._isInputValid = this._input[0][0].isOfType( Image.TYPE() );
    }catch(e){
      this._isInputValid = false;
      console.error("The input is not valid");
    }

  }


  /**
  * Overwrite the generic (empty) method.
  */
  update(){
    this.validateInput();

    // abort if invalid input
    if(!this._isInputValid)
      return;

    

  }




}

export { CanvasImageWriter }
