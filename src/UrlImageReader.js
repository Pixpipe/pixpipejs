/**
*
*/


import { Image2D } from './Image2D.js';
import { Filter } from './Filter.js';

class UrlImageReader extends Filter {

  /**
  * @param {String} url - path of the image to be loaded
  * @param {function} callback - function to call when the image is loaded.
  * The _this_ object will be in argument of this callback.
  */
  constructor( url, callback){
    super();
    
    this._imageUrl = url;
    this._onReadCallback = callback;
  }


  update(){
    var that = this;

    var img = new Image();
    img.src = this._imageUrl;

    img.onload = function() {
      var tmpCanvas = document.createElement("canvas");
      tmpCanvas.width = img.width;
      tmpCanvas.height = img.height;
      var canvasContext = tmpCanvas.getContext('2d');
      canvasContext.drawImage(img, 0, 0);

      //try{
        var imageData = canvasContext.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height);
        var dataArray = imageData.data;
        var img2D = new Image2D();
        img2D.setData( dataArray, img.width, img.height);
        console.log(img2D);

        that._setOutput( img2D );

        that._onReadCallback && that._onReadCallback( that );
      /*}catch(e){
        console.error("The server of the specified image URL does not allow Cross Origin data access. Pixpipe cannot create an Image2D object.");

        console.error(e);
      }*/

    };


  }


} /* END of class UrlImageReader */

export { UrlImageReader }
