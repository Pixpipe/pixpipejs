/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


import { Image2D } from '../core/Image2D.js';
import { LineString } from '../core/LineString.js';
import { ImageToImageFilter } from '../core/ImageToImageFilter.js';


/**
* A instance of LineStringPrinterOnImage2DHelper prints a list of LineStrings on
* an Image2D. To add the Image2D input, use `.addInput(myImage2D)`.
* To add a LineString, use `.addLineString(ls, c );` where `ls` is a LineString 
* instance and `c` is an Array representing a color (i.e. [255, 0, 0] for red).
*
* **Usage**
* - [examples/contourImage2D.html](../examples/contourImage2D.html)
*
*/
class LineStringPrinterOnImage2DHelper extends ImageToImageFilter {
  
  constructor() {
    super();
    this.addInputValidator(0, Image2D);
    this.setMetadata("lineStrings", []);
    this.setMetadata("lineStringsColors", []);
  }
  
  
  /**
  * Add a LineString instance to be printed on the image
  * @param {LineString} ls - a linestring to add
  * @param {Array} color - of for [R, G, B] or [R, G, B, A] 
  */
  addLineString(ls, color){
    this._metadata.lineStrings.push( ls ) ;
    this._metadata.lineStringsColors.push( color ) ;
  }
  
  
  _run(){
    
    // the input checking
    if( ! this.hasValidInput()){
      console.warn("A filter of type LineStringPrinterOnImage2DHelper requires 1 input of category '0'.");
      return;
    }
    
    var imageIn = this._getInput();
    var imageOut = imageIn.clone();
    var width = imageIn.getWidth();
    var height = imageIn.getHeight();
    var ncpp = imageIn.getNcpp();
    
    var printed = false;
    
    var lineStrings = this._metadata.lineStrings;
    var colors = this._metadata.lineStringsColors;
    
    for(var i=0; i<lineStrings.length; i++){
      
      if(lineStrings[i].getMetadata("nod") != 2){
        console.warn("Linstring must be 2D to be printed on images.");
        continue;
      }
      
      // color verification: ok if same number of channel OR if giving RGB color to RGBA image
      if(ncpp == colors[i].length || (ncpp == 4 && colors[i].length == 3) ){
        
        var lineStringData = lineStrings[i].getData();
        
        for(var j=0; j<lineStringData.length-1; j+=2){
          imageOut.setPixel({x: lineStringData[j], y: lineStringData[j+1]}, colors[i] );
        }
        
        printed = true;
        
      }else{
        continue;
      }
    }
    
    if(printed){
      this._output[0] = imageOut;
    }
    
  } /* END of _run() */
  
  
} /* END of class LineStringPrinterOnImage2DHelper */

export { LineStringPrinterOnImage2DHelper }
