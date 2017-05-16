/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { Filter } from './Filter.js';
import { Image2D } from './Image2D.js';
import { LineString } from './LineString.js';


/**
*
*/
class ContourImage2DFilter extends Filter {
  
  constructor(){
    super();
    this.addInputValidator(0, Image2D);
    this.setMetadata("component", 0);
    this.setMetadata("seed", [0, 0]);
  }
  
  
  _run(){
    // the input checking
    if( ! this.hasValidInput()){
      console.warn("A filter of type AngleToHueWheelHelper requires 1 input of category '0'.");
      return;
    }
    
    
    
    var imageIn = this._getInput(0);
    var ncpp = imageIn.getNcpp();
    var component = this.getMetadata("component");
    var width = imageIn.getWidth();
    var height = imageIn.getHeight();
    
    var directionList = [
      [ 0 ,-1], // [0] => N
      [-1 , 0], // [0] => W
      [ 0 , 1], // [0] => S
      [ 1 , 0]  // [0] => E
    ];
    
    // handy color comparison
    function isSameColor(c1, c2){
      if(c1.length != c2.length)
        return false;
      
      for(var i=0; i<c1.length. i++){
        if(c1[i] != c2[i])
          return false;
      }
      return true;
    }
    
    var direction = 1; // once top north, we go west
    var newSeed = this._metadata.seed.slice();
    
    if(newSeed[0]<0 || newSeed[1]<0 || newSeed[0]>=width || newSeed[1]>= height){
      console.warn("The seed is out of image range.");
      return;
    }
    
    var clusterColor = imageIn.getPixel( {x: newSeed[0], y: newSeed[1]} );
    var newColor = clusterColor;
    var atNorth = newSeed.slice();
    
    // first, we go to the north border of our cluster
    while( true ){
      atNorth[0] += directionList[0][0];
      atNorth[1] += directionList[0][1];
      
      // we reached the border of the image
      if(atNorth[0]<0){
        newSeed[0] = 0;
        newSeed[1] = atNorth[1];
        break;
      }
      
      newColor = imageIn.getPixel( {x: atNorth[0], y: atNorth[1]} );
      
      if( isSameColor(newColor, clusterColor) ){
        newSeed[0] = atNorth[0];
        newSeed[1] = atNorth[1];
      }else{
        break;
      }
    }
    
    var movingPoint = newSeed.slice();
    var potentialPosition = [0, 0];
    var listOfValidPoints = [];
    listOfValidPoints.push(newSeed.slice());
    
    // return 0: the tested point is the starting point
    // return 1: the tested point is of the right color
    // return 2: the tested point id from the wrong color (test other direction)
    function tryPotientialPosition(){
      
      potentialPosition[0] = movingPoint[0] + direction[0];
      potentialPosition[1] = movingPoint[1] + direction[1];
        
      // test if the new direction goes with the same color
      if( isSameColor(imageIn.getPixel( {x: potentialPosition[0], y: potentialPosition[1]} ), clusterColor) ){
        
        if( movingPoint[0]==listOfValidPoints[0][0] && // the point just found is the
            movingPoint[0]==listOfValidPoints[0][0] )  // same as the very first
        {
          return 0; // break the loop
          
        }else{
          // we validate the point and keep moving
          movingPoint[0] = potentialPosition[0];
          movingPoint[1] = potentialPosition[1];
          listOfValidPoints.push( movingPoint.slice() );
          
        }
        return 1; // continue the loop
        
      }
      
      return 2; // try directions
    }
    
    // start the real navigation, starting from movingPoint
    main_loop:
    while( true ){
      
      // go the previous direction on the list
      direction = (direction-1);
      if(direction<0)
        direction = directionList.length - 1;
    
      var score = tryPotientialPosition();
      
      if( score == 0){  
        break main_loop;
      }else if(score == 1){
        continue;
      }else{
        
        // we try the other directions
        direction_loop:
        for(var i=0; i<directionList.length-1; i++){  // -1 beacuse we dont need to retry the last, since it's also the one done before
        
          direction += i;
          direction = direction%directionList.length;
          
          score = tryPotientialPosition();
          
          if( score == 0){  
            break main_loop;  // back to the start point/seed
          }else if(score == 1){
            break direction_loop; // point is good, 
          }else{
            continue; // try the next direction
          }
          
        }
      
        // if we arrive here, it means the seed was in a single pixel island :(
        break;
      
      }
      
    }
    
    // TODO: deal with the list of points listOfValidPoints
    
    
  } /* END of _run() */
  
  
} /* END of class ContourImage2DFilter */

export { ContourImage2DFilter };
