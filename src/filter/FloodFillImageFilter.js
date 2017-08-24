/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


import { Image2D } from '../core/Image2D.js';
import { ImageToImageFilter } from '../core/ImageToImageFilter.js';


/**
* A FloodFillImageFilter instance takes an Image2D as input and gives a Image2D
* as output.  
* The starting point of the flood (seed) has to be set using `.setMetadata("seed", [x, y])`
* where `x` and `y` are winthin the boundaries of the image.  
* The tolerance can also be set using `.setMetadata("tolerance", n)`.
* The tolerance is an absolute average over each component per pixel.
* 
* Neighbour connexity can be 4 or 8 using `.setMetadata("connexity", n)`.
* Destination color can be set with `.setMetadata("color", [r, g, b])`.
* The color array depends on your input image and can be of size 1 (intensity),
* 3 (RGB), 4 (RBGA) or other if multispectral.
*
* In addition to the output image, the list of internal hit points is created and
* availble with `.getOutput("hits")`.
*
*
* **Usage**
* - [examples/floodFillImage2D.html](../examples/floodFillImage2D.html)
*
*
*/
class FloodFillImageFilter extends ImageToImageFilter {
  
  constructor(){
    super();
    this.addInputValidator(0, Image2D);
    this.setMetadata("tolerance", 1);
    this.setMetadata("connexity", 4);
    this.setMetadata("color", null);
    this.setMetadata("onlyHits", false);
    
    this._directionListConnexity4 = [
      [ 0 ,-1], // [0] => N
      [-1 , 0], // [1] => W
      [ 0 , 1], // [2] => S
      [ 1 , 0]  // [3] => E
    ];
    
    this._directionListConnexity8 = [
      [ 0  , -1], // [0] => N
      [-1  , -1], // [1] => NW
      [-1  ,  0], // [2] => W
      [-1  ,  1], // [3] => SW
      [ 0  ,  1], // [4] => S
      [ 1  ,  1], // [5] => SE
      [ 1  ,  0], // [6] => E
      [ 1  , -1]  // [7] => NE
    ];
    
  }
  
  
  _run(){
    
    // the input checking
    if( ! this.hasValidInput()){
      console.warn("A filter of type FloodFillImageFilter requires 1 input of category '0'.");
      return;
    }
    
    var imageIn = this._getInput(0);
    var ncpp = imageIn.getNcpp();
    var width = imageIn.getWidth();
    var height = imageIn.getHeight();
    var directionList = null;
    
    if( this.getMetadata("connexity") == 8){
      directionList = this._directionListConnexity8;
    }else{
      directionList = this._directionListConnexity4;
    }
    
    var replacementColor = new Array(ncpp); // red
    replacementColor[0] = 255;
    
    var paintColor = this.getMetadata("color") || replacementColor;
    
    // checking color validity
    if(paintColor.length != ncpp){
      if(!(paintColor.length == 3 && ncpp ==4)){
        console.warn("The color to fill must have the same number of components as the input image. (RGB color for RGBA image is accepted)");
        return;
      }
    }
    
    
    
    // to mark the place we've been in the filling
    var markerImage = new Image2D({width: width, height: height, color: [0]});
    var seed = this.getMetadata("seed");
    var seedColor = imageIn.getPixel({x: seed[0], y: seed[1]});
    var tolerance = this.getMetadata("tolerance");
    var onlyHits = this.getMetadata("onlyHits");
    
    var imageOut = null;
    if(!onlyHits){
      imageOut = imageIn.clone();
    }
    
    
    // the points in this list are points at the edge, except the edge of the image
    var edgePointList = [];
    
    var pixelStack = [];
    pixelStack.push( seed );
    
    while(pixelStack.length > 0){
      
      var currentPixel = pixelStack.pop();
      var x = currentPixel[0];
      var y = currentPixel[1];
      
      if(x<0 || x>=width || y<0 || y>=height){
        continue;
      }
      
      // if the image was not filled here...
      if(markerImage.getPixel({x: x, y: y})[0] == 0){
        
        // mark as visited
        markerImage.setPixel({x: x, y: y}, [1]);
        
        // paint the image
        if(!onlyHits){
          imageOut.setPixel({x: x, y: y}, paintColor);
        }
        
        // check neighbours upon connexity degree
        var potentialPosition = [0, 0];
        var isOnEdge = false;
        
        for(var i=0; i<directionList.length; i++){
          potentialPosition[0] = x + directionList[i][0];
          potentialPosition[1] = y + directionList[i][1];
          
          if(potentialPosition[0]<0 || potentialPosition[0]>=width || 
             potentialPosition[1]<0 || potentialPosition[1]>=height )   
          { 
            continue;
          }
          
          var targetColor = imageIn.getPixel({x:potentialPosition[0], y: potentialPosition[1] });
          
          var isWithinTolerance = true;
          for(var c=0; c<seedColor.length; c++){
            if(Math.abs( targetColor[c] - seedColor[c] ) > tolerance ){
              isWithinTolerance = false;
              isOnEdge = true;
              break;
            }
          } /* END for loop color channels */
          
          if(isWithinTolerance ){
            var newCandidate = [potentialPosition[0], potentialPosition[1]];
            pixelStack.push( newCandidate );
          }
          
        } /* END for loop direction*/
        
        if(isOnEdge){
          if(x!=0 && x!=(width-1) && y!=0 && y!=(height-1)){ // we dont want the edge of the image
            edgePointList.push( currentPixel );
          }
        }
        
      } /* END if image was not filled at this position */
      
    } /* END while loop unstacking the points */
    
    if(!onlyHits){
      this._output[0] = imageOut;
    }
  
    this._output["edgePoints"] = edgePointList;
    
  } /* END of _run() */
  
  
  
  
} /* END of class FloodFillImageFilter */

export { FloodFillImageFilter }
