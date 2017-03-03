
import { Image } from './Image.js';

class CanvasWriter {

  constructor( parentElement, id = null ){
    // creating a canvas element
    this._canvas = document.createElement("canvas");
    this._canvas.className  = "CanvasPix_canvas";
    this._canvas.style = "image-rendering: pixelated;"
    this._ctx = null;
    this._ncpp = 4; // number of components per pixel, rgba

    this._dataBuffer = null;

    if(id){
      this._canvas.id = id;
    }

    document.getElementById(parentElement).appendChild(this._canvas)

  }



  /**
  * Initialize the canvas as a blank image.
  * Thus all pixels are rgba(0, 0, 0, 0)
  * @param {Object} size - size in pixel {w, h}
  */
  initBlank( size, color=null ){
    this._canvas.width = size.w;
    this._canvas.height = size.h;

    this._initContext();

    if(color){
      this._fill(color);
    }
  }


  /**
  * [PRIVATE]
  * Fill the image with a given color
  * @param {Object} color - color as {r, g, b, a}
  */
  _fill( color ){
    if( this._ctx ){
      this._ctx.fillStyle = 'rgba(' + color.r + ', ' + color.g + ', ' + color.b + ', ' + color.a + ')';
      this._ctx.fillRect (0, 0, this._canvas.width, this._canvas.height);
    }
  }


  /**
  * Load the canvas with an image
  * @param {String} imgUrl - url of the image, local or distant
  * @param {function} onLoadCallback - callback of what to do when loading the image is done. Every further processing MUST be inside this callback.
  */
  initWithImage(imgUrl, onLoadCallback = null){
    var that = this;
    this._initContext();

    var img = new Image();
    img.src = imgUrl;

    img.onload = function() {
      that._canvas.width = img.width;
      that._canvas.height = img.height;
      that._ctx.drawImage(img, 0, 0);

      onLoadCallback && onLoadCallback();
    };

  }


  /**
  * [PRIVATE]
  */
  _initContext(){
    if (this._canvas.getContext) {
      this._ctx = this._canvas.getContext('2d');

      // not sure this is useful since the style is "pixelated"
      // (does not seem to well super well with Firefox)
      this._ctx.imageSmoothingEnabled = true;
      this._ctx.mozImageSmoothingEnabled = false;
      this._ctx.webkitImageSmoothingEnabled = false;
      this._ctx.ctxmsImageSmoothingEnabled = false;
    }
  }


  getOutput(){

  }

}
