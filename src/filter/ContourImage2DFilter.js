/*
* Author   Jonathan Lurie - http://me.jonathanlurie.fr
* License  MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { Filter } from '../core/Filter.js';
import { Image2D } from '../core/Image2D.js';
import { LineString } from '../core/LineString.js';


/**
* An instance of ContourImage2DFilter takes a seed (`.setMetadata("seed", [x, y])`)
* and finds the contour of the shape of a segmented image by going north.
* The input must be an `Image2D` and the output is a `LineString`.  
* Two options are availble for neighbour connexity: 4 or 8. Set this option using
* `.setMetadata("connexity", n)`.
*
* **Usage**
* - [examples/contourImage2D.html](../examples/contourImage2D.html)
*
*/
class ContourImage2DFilter extends Filter {
  
  constructor(){
    super();
    this.addInputValidator(0, Image2D);
    this.setMetadata("connexity", 8);
    this.setMetadata("seed", [0, 0]);
    
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
      console.warn("A filter of type AngleToHueWheelHelper requires 1 input of category '0'.");
      return;
    }
    
    var imageIn = this._getInput(0);
    var ncpp = imageIn.getNcpp();
    var width = imageIn.getWidth();
    var height = imageIn.getHeight();
    var directionList = null
    
    if( this.getMetadata("connexity") == 8){
      directionList = this._directionListConnexity8;
    }else{
      directionList = this._directionListConnexity4;
    }
    
    // handy color comparison
    function isSameColor(c1, c2){
      if(c1.length != c2.length)
        return false;
      
      for(var i=0; i<c1.length; i++){
        if(c1[i] != c2[i])
          return false;
      }
      return true;
    }
    
    
    var newSeed = this._metadata.seed.slice();
    var directionIncrement = directionList.length / 4;
    var direction = directionIncrement; // once top north, we go west
    
    if(newSeed[0]<0 || newSeed[1]<0 || newSeed[0]>=width || newSeed[1]>= height){
      console.warn("The seed is out of image range.");
      return;
    }
    
    var clusterColor = imageIn.getPixel( {x: newSeed[0], y: newSeed[1]} );
    var newColor = clusterColor;
    var atNorth = newSeed.slice();
    
    
    var canStartFromOriginalSeed = false;
    
    
    // test the local surrounding and avoid going North
    for(var i=0; i<this._directionListConnexity4.length; i++){
      var localColor = imageIn.getPixel( {x: newSeed[0] + this._directionListConnexity4[i][0], y: newSeed[1] + this._directionListConnexity4[i][1]} );
      
      if(! isSameColor(localColor, clusterColor)){
        canStartFromOriginalSeed = true;
        direction = i;
        
        if( this.getMetadata("connexity") == 8){
          direction *= 2;
        }
        
        direction += directionIncrement;
        break;
      }
    }
    
    
    // first, we go to the north border of our cluster
    while( true && !canStartFromOriginalSeed){
      atNorth[0] += directionList[0][0];
      atNorth[1] += directionList[0][1];
      
      // we reached the border of the image
      if(atNorth[0]<0){
        newSeed[0] = 0;
        newSeed[1] = atNorth[1];
        break;
      }
      
      // can be null if out of the image
      newColor = imageIn.getPixel( {x: atNorth[0], y: atNorth[1]} );
      
      if( newColor && isSameColor(newColor, clusterColor) ){
        newSeed[0] = atNorth[0];
        newSeed[1] = atNorth[1];
      }else{
        break;
      }
    }
    
    var movingPoint = newSeed.slice();
    var potentialPosition = [0, 0];
    var listOfValidPoints = [];
    listOfValidPoints.push(newSeed[0]);
    listOfValidPoints.push(newSeed[1]);
    
    // return 0: the tested point is the starting point
    // return 1: the tested point is of the right color
    // return 2: the tested point id from the wrong color (test other direction)
    function tryPotientialPosition(){
      
      potentialPosition[0] = movingPoint[0] + directionList[direction][0];
      potentialPosition[1] = movingPoint[1] + directionList[direction][1];
        
      // prevent from going ouside the image
      if(potentialPosition[0] < 0 || potentialPosition[1] < 0 || 
         potentialPosition[0] >= width || potentialPosition[1] >= height)
      {
        return 2;
      }
        
      var potentialPositionColor = imageIn.getPixel( {x: potentialPosition[0], y: potentialPosition[1]} );
        
      // test if the new direction goes with the same color
      if( isSameColor(potentialPositionColor, clusterColor) ){
        
        if( potentialPosition[0]==listOfValidPoints[0] && // the point just found is the
            potentialPosition[1]==listOfValidPoints[1] )  // same as the very first
        {
          return 0; // break the loop
        }else{
          // we validate the point and keep moving
          movingPoint[0] = potentialPosition[0];
          movingPoint[1] = potentialPosition[1];
          listOfValidPoints.push( movingPoint[0] );
          listOfValidPoints.push( movingPoint[1] );
        }
        return 1; // continue the loop
      }
      return 2; // try directions
    }
    
    
    // start the real navigation, starting from movingPoint
    main_loop:
    while( true ){
      
      // go the previous direction on the list
      direction -= directionIncrement;
      if(direction<0)
        direction = directionList.length - directionIncrement;
    
      var score = tryPotientialPosition();
      
      if( score == 0){  
        break main_loop;
      }else if(score == 1){
        continue;
      }else{  // score == 2
        
        var nbTrials = 0;
      
        // we try the other directions
        direction_loop:
        for(var i=0; i<directionList.length-1; i++){  // -1 because we don't need to retry the last, since it's also the one done before
        
          //direction += i;
          direction ++;
          direction = direction%directionList.length;
          score = tryPotientialPosition();
          
          if( score == 0){  
            break main_loop;  // back to the start point/seed
          }else if(score == 1){
            break direction_loop; // point is good, 
          }else{
            nbTrials++;
            continue; // try the next direction
          }

        }
      
        // it means the seed was in a single pixel island :(
        if(nbTrials == directionList.length-1){
          break;
        }
      }
    }
    
    var outputLineString = new LineString();
    outputLineString.setData(listOfValidPoints);
    outputLineString.setMetadata("closed", true);
    this._output[0] = outputLineString;
    
  } /* END of _run() */
  
  
} /* END of class ContourImage2DFilter */

export { ContourImage2DFilter };
