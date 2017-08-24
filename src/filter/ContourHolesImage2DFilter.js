/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


import { Filter } from '../core/Filter.js';
import { Image2D } from '../core/Image2D.js';
import { LineString } from '../core/LineString.js';
import { ContourImage2DFilter } from './ContourImage2DFilter.js';
import { FloodFillImageFilter } from './FloodFillImageFilter.js';


/**
*
*/
class ContourHolesImage2DFilter extends Filter {
  
  constructor() {
    super();
    this.addInputValidator(0, Image2D);
    this.setMetadata("connexity", 4);
    this.setMetadata("seed", [0, 0]);
  }
  
  
  _run(){
    
    // the input checking
    if( ! this.hasValidInput()){
      console.warn("A filter of type ContourHolesImage2DFilter requires 1 input of category '0'.");
      return;
    }
    
    var imageIn = this._getInput(0);
    var ncpp = imageIn.getNcpp();
    var width = imageIn.getWidth();
    var height = imageIn.getHeight();
    var directionList = null;
    var contours = [];
    
    var connexity = this.getMetadata("connexity");
    var seed = this.getMetadata("seed");
    
    // finding the 1st contour
    var contourDetector = new ContourImage2DFilter();
    contourDetector.addInput( imageIn );
    contourDetector.setMetadata("connexity", connexity);
    contourDetector.setMetadata("seed", seed);
    contourDetector.update();
    
    contours.push( contourDetector.getOutput() );
    
    // From the same seed, flood fill - we dont care about the filled image, but
    // we want the hit points from it
    var filler = new FloodFillImageFilter();
    filler.addInput( imageIn );
    filler.setMetadata('onlyHits', false); // if we are not interested in the image but just want the hit points, this must be true.
    filler.setMetadata("connexity", 4); // could be 4
    filler.setMetadata("tolerance", 0); // in pixel value, applied to each component
    filler.setMetadata("seed", seed);
    filler.update();
    
    var fillingEdgePoints = filler.getOutput("edgePoints");
    
    var flyContourDetector = new ContourImage2DFilter(); // will be reused several times
    flyContourDetector.setMetadata("time", false);  // prevent every little contour finding to print their time
    
    // for each point found while filling, we check if already in one of the contours.
    // if not already, we launch a new contour extraction from this point (as a seed)
    // and add a new contour.
    for(var i=0; i<fillingEdgePoints.length; i++){
      var edgePoint = fillingEdgePoints[i];
      
      var isAlreadyPartOfContour = false;
      
      for(var c=0; c<contours.length; c++){
        if( contours[c].hasPoint(edgePoint) ){
          isAlreadyPartOfContour = true;
          break;
        }
      }
      
      if(!isAlreadyPartOfContour){
        // finding the 1st contour
        
        flyContourDetector.addInput( imageIn );
        flyContourDetector.setMetadata("connexity", connexity);
        flyContourDetector.setMetadata("seed", edgePoint);
        flyContourDetector.update();
        
        contours.push( flyContourDetector.getOutput() );
      }
      
    } /* END of for loop over edge points */
    
    for(var i=0; i<contours.length; i++){
      this._output[i] = contours[i];
    }
    
  }
  
} /* END of class ContourHolesImage2DFilter */

export { ContourHolesImage2DFilter };
