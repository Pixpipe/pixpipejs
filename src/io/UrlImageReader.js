/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { Image2D } from '../core/Image2D.js';
import { Filter } from '../core/Filter.js';


/**
* An instance of UrlImageReader takes an image URL as input and
* returns an Image2D as output. Use the regular `addInput()` and `getOuput()`
* with no argument for that.
* Reading a file from URL takes an AJAX request, which is asynchronous. For this
* reason, what happens next, once the Image2D is created must take place in the
* callback defined by the event .on("imageLoaded", function(){ ... }).
* Usage: examples/urlToImage2D.html
*
* UrlImageReader can also load multiple images and call the "imageLoaded" event
* only when all of them are loaded.
* Usage: examples/urlToImage2D_multiple.html
*
*
* @example
* var url2ImgFilter = new pixpipe.UrlImageReader( ... );
* url2ImgFilter.addInput( "images/sd.jpg" );
* url2ImgFilter.update();
*/
class UrlImageReader extends Filter {

  /**
  * @param {function} callback - function to call when the image is loaded.
  * The _this_ object will be in argument of this callback.
  */
  constructor( callback ){
    super();
    this._loadedCounter = 0;
    this._addOutput( Image2D, 0 );

  }


  /**
  * Run the reading
  */
  update_ORIG(){
    var that = this;

    var img = new Image();
    img.src = this._getInput();

    img.onload = function() {
      var tmpCanvas = document.createElement("canvas");
      tmpCanvas.width = img.width;
      tmpCanvas.height = img.height;
      var canvasContext = tmpCanvas.getContext('2d');
      canvasContext.drawImage(img, 0, 0);

      try{
        var imageData = canvasContext.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height);
        var dataArray = imageData.data;

        var img2D = that.getOutput( category );
        img2D.setData( dataArray, img.width, img.height);

        // call the loaded callback only when all images are loaded
        if( "imageLoaded" in that._events){
          that._events.imageLoaded( that )
        }

      }catch(e){
        console.error(e);
      }

    };


  }


  update(){
    var that = this;
    var inputCategories = this.getInputCategories();

    inputCategories.forEach( function(category){
      that._addOutput( Image2D, category );
      that._loadImage( category );
    })
  }


  _loadImage( inputCategory ){
    var that = this;

    var img = new Image();
    img.src = this._getInput(inputCategory);

    img.onload = function() {
      var tmpCanvas = document.createElement("canvas");
      tmpCanvas.width = img.width;
      tmpCanvas.height = img.height;
      var canvasContext = tmpCanvas.getContext('2d');
      canvasContext.drawImage(img, 0, 0);

      try{
        var imageData = canvasContext.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height);
        var dataArray = imageData.data;
        var img2D = that.getOutput( inputCategory );
        img2D.setData( dataArray, img.width, img.height);

        that._loadedCounter ++;

        // call the loaded callback only when all images are loaded
        if(that._loadedCounter == that.getNumberOfInputs() && "imageLoaded" in that._events){
          that._events.imageLoaded( that )
        }

      }catch(e){
        console.error(e);
      }

    };

  }


} /* END of class UrlImageReader */

export { UrlImageReader }
