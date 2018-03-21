/*
* Author    Jonathan Lurie - http://me.jonathanlurie.fr
*
* License   MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


import { Filter } from '../core/Filter.js';
import { Image2D } from '../core/Image2D.js';

/**
* With a given set of seeds ( each being {x: Number, y: Number, value: Number} )
* An instance of NearestNeighborSparseInterpolationImageFilter creates an image where
* each value is the closest from the given point.
*
* The original seeds must be given as an Array of Object using
* the method `.addInput( seeds, "seeds")`
*
* The output image size must be set using the method
* `.setMetadata( "outputSize", {width: Number, height: Number})`
*
* The given point can be outside the output image boundaries.
*
* **Usage**
* - [examples/nearestSparseInterpolation.html](../examples/nearestSparseInterpolation.html)
*/
class NearestNeighborSparseInterpolationImageFilter extends Filter {
  constructor(){
    super()
    this.setMetadata( "outputSize", {width: 0, height: 0})
  }

  _run(){
    var seeds = this._getInput("seeds");

    // getting the input
    if( !seeds ){
      console.warn("No input seeds were given.");
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

    // for each pixel of the image...
    for(var i=0; i<outputSize.width; i++){
      for(var j=0; j<outputSize.height; j++){

        var nearestPointIndex = 0;
        var nearestDistance = Infinity;

        // for each point of the original set...
        for(var p=0; p<seeds.length; p++){

          // compute euclidian distance from [i, j] to p(x, y)
          var d = Math.sqrt( Math.pow( seeds[p].x - i, 2 ) + Math.pow( seeds[p].y - j, 2) );

          if( d < nearestDistance){
            nearestDistance = d;
            nearestPointIndex = p;
          }
        }

        out.setPixel( {x: i, y: j}, [ seeds[nearestPointIndex].value ] );
      }
    }

    this._output[ 0 ] = out;
  }

} /* END of class NearestNeighborSparseInterpolationImageFilter */

export { NearestNeighborSparseInterpolationImageFilter }
