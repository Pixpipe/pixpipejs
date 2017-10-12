/*
* Author   Jonathan Lurie - http://me.jonathanlurie.fr
* License  MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { Image2D } from '../core/Image2D.js';
import { Filter } from '../core/Filter.js';

/**
* An instance of FileImageReader takes a HTML5 File object of a png or jpeg image 
* as input and returns an Image2D as output.  For Tiff format, use TiffDecoder instead.
* The point is mainly to use it with a file dialog.
* Use the regular `addInput()` and `getOuput()` with no argument for that.
* Reading a local file is an asynchronous process. For this
* reason, what happens next, once the Image2D is created must take place in the
* callback defined by the event .on("ready", function(){ ... }).
*
*
*
* **Usage**
* - [examples/fileToImage2D.html](../examples/fileToImage2D.html)
*
* @example
* var file2ImgFilter = new pixpipe.file2ImgFilter( ... );
* file2ImgFilter.addInput( fileInput.files[0] );
* file2ImgFilter.update();
*/
class FileImageReader extends Filter {

  constructor(){
    super();
    this._allowedTypes = /image.*/;
  }


  /**
  * Overload the default method because HTML5 File is not a Pixpipe type
  */
  hasValidInput(){
    var valid = false;
    var file = this._getInput();

    if (file && file.type.match( this._allowedTypes )) {
      valid = true;
    }else{
      console.error("The file must be an image (jpg/png). The type " + file.type + " is not compatible with FileImageReader.");
    }

    return valid;
  }


  /**
  * Run the reading
  */
  _run(){

    if(! this.hasValidInput() )
      return

    var that = this;
    var file = this._getInput();
		var reader = new FileReader();
    
    reader.onload = function(e) {
      var img = new Image();
    
      img.onload = function(){
        
        var tmpCanvas = document.createElement("canvas");
        tmpCanvas.width = img.width;
        tmpCanvas.height = img.height;
        var canvasContext = tmpCanvas.getContext('2d');
        canvasContext.drawImage(img, 0, 0);
        var imageData = canvasContext.getImageData(0, 0, img.width, img.height);
        var dataArray = imageData.data;

        var img2D = that._addOutput( Image2D, 0 );
        img2D.setData( dataArray, img.width, img.height);

        // the "ready" can now be called
        that.triggerEvent("ready");
      }

      img.src = reader.result;
    }
    
    
		reader.readAsDataURL( file );
  }



} /* END of class UrlImageReader */

export { FileImageReader }
