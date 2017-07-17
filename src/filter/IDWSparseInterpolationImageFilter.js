/*
* Author    Jonathan Lurie - http://me.jonahanlurie.fr
*
* License   MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


import { Filter } from '../core/Filter.js';
import { Image2D } from '../core/Image2D.js';

/**
* Ressources:
* https://www.e-education.psu.edu/geog486/node/1877
* 
* **Usage**
* - [examples/nearestSparseInterpolation.html](../examples/nearestSparseInterpolation.html)
*/ 
class IDWSparseInterpolationImageFilter extends Filter {
  constructor(){
    super()
    this.setMetadata( "strength",2 );
    this.setMetadata( "outputSize", {width: 0, height: 0})
  }
  
  _run(){
    
    var points = null;
    
    // getting the input
    if( "0" in this._input ){
      points = this._input[ 0 ];
    }else{
      console.warn("No input point set were given.");
      return;
    }
    
    var outputSize = this.getMetadata( "outputSize" );
    
    // checking output size
    if( outputSize.width == 0 || outputSize.height == 0 ){
      console.warn("The output size cannot be 0.");
      return;
    }
    
    // creating the output image
    var out = new pixpipe.Image2D({width: outputSize.width, height: outputSize.height, color: [0]})
    var strength = this.getMetadata( "strength" );
    var distances = new Float32Array( points.length )
    
    
    // for each pixel of the image...
    for(var i=0; i<outputSize.width; i++){
      for(var j=0; j<outputSize.height; j++){
        
        if( i == 90 && j == 90 ){
          console.log( "here" );
        }
        
        var numerator = 0;
        var denominator = 0;
        
        // value taken when a pixel is exactely on one of the original point
        var pointValue = null;
        var isOnPoint = false;
        
        // for each point of the original set...
        for(var p=0; p<points.length; p++){
          // compute euclidian distance from [i, j] to p(x, y)
          var d = Math.sqrt( Math.pow( points[p].x - i, 2 ) + Math.pow( points[p].y - j, 2) );
          
          if( d == 0){
            isOnPoint = true;
            pointValue = points[p].value;
            break;
          }
          
          
          numerator += ( points[p].value / Math.pow( d, strength ) );
          denominator += ( 1 / Math.pow(d, strength ) );
        }
        
        var pixelValue = isOnPoint ? pointValue : ( numerator / denominator );
        
        out.setPixel( {x: i, y: j}, [ pixelValue ] );
      }
    }
    
    this._output[ 0 ] = out;
  }
  
} /* END of class IDWSparseInterpolationImageFilter */

export { IDWSparseInterpolationImageFilter }
