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
* An instance of IDWSparseInterpolationImageFilter performs a 2D interpolation from
* a sparse dataset using the method of Inverse Distance Weighting.
*
* The original dataset is specified using the method `.addInput( seeds )`, where
* `seeds` is an `Array` of `{x: Number, y: Number, value: Number}`. You specify
* the seeds with the methodd `.addInput( seeds , "seeds" );`.
* This filter outputs an `Image2D` with interpolated values. The size of the output must be
* specified using the method `.setMetadata( "outputSize", {width: Number, height: Number})`.
*
* The IDW algorithm can be tuned with a "strength", which is essentially the value
* of exponent of the distances. Default is `2` but it is common the see a value
* of `1` or `3`. With higher values, the output will look like a cells pattern.
* The strength can be defined using the method `.setMetadata( "strength", Number )`
*
* The metadata "k" specifies the number of closest neighbors seed to consider for each
* pixel of the output. If larger than the number of seeds, it will be automatically
* clamped to the number of seeds. Set "k" with `.setMetadata( "k", Number )`
*
* To make the interpolation faster when done several times with seed of
* the same position but different values, a distance map is built at the begining.
* The map that is firstly built will be reuse unless the metadata 'forceBuildMap'
* is set to 'true'. If true, the map will be rebuilt at every run. It can take a
* while so make sure you rebuild the map only if you need (= seed changed position,
* output image changed size). Use the method `.setMetadata( "forceBuildMap", Boolean )`
*
* Note 1: seeds can be outside the boundaries of the original image
* Note 2: interpolated values are floating point
*
* Note that only single-component images are outputed from this filter.
* Ressources:
* https://www.e-education.psu.edu/geog486/node/1877
*
* **Usage**
* - [examples/nearestSparseInterpolation.html](../examples/nearestSparseInterpolation.html)
*/
class IDWSparseInterpolationImageFilter extends Filter {
  constructor(){
    super()
    this.setMetadata( "strength", 2 );
    this.setMetadata( "k", -1 );
    this.setMetadata( "forceBuildMap", false );
    this.setMetadata( "outputSize", {width: 256, height: 256});

    this._map = null;
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

    // build the distance map
    if( this.getMetadata( "forceBuildMap" ) || !this._map ){
      this._buildMap();
    }

    // look for min max. With IDW the min and max of the end image are the
    // min and max of the seeds. It's always less expansive than looping all the image...
    var min = +Infinity;
    var max = -Infinity;
    for(var i=0; i<seeds.length; i++){
      min = Math.min(min, seeds[i].value);
      max = Math.max(max, seeds[i].value);
    }

    // creating the output image
    var out = new pixpipe.Image2D({width: outputSize.width, height: outputSize.height, color: [0]})
    var strength = this.getMetadata( "strength" );

    var metadataK = this.getMetadata( "k" );
    var k = metadataK <= 0 ? seeds.length : Math.min( metadataK , seeds.length );

    console.time("make")
    // for each pixel of the image...
    for(var i=0; i<outputSize.width; i++){
      for(var j=0; j<outputSize.height; j++){

        var numerator = 0;
        var denominator = 0;

        // value taken when a pixel is exactely on one of the original point
        var pointValue = null;
        var isOnPoint = false;

        var index1D = i + j*outputSize.width;
        var localMap = this._map[ index1D ]

        // for each point of the original set...
        for(var p=0; p<k; p++){
          // compute euclidian distance from [i, j] to p(x, y)
          var d = localMap[ p ].distance;
          var index = localMap[ p ].index;

          if( d == 0){
            isOnPoint = true;
            pointValue = seeds[index].value;
            break;
          }

          var w = 1 / Math.pow( d, strength );
          numerator += ( seeds[index].value * w );
          denominator += w ;
        }

        var pixelValue = isOnPoint ? pointValue : ( numerator / denominator );

        out.setPixel( {x: i, y: j}, [ pixelValue ] );
      }
    }

    out.setMetadata("min", min);
    out.setMetadata("max", max);
    this._output[ 0 ] = out;
  }


  /**
  * @private
  * Build the distance map. The point is to build it once and reuse it multiple times
  * as long as the position of the seeds and the sixe of the output don't change.
  */
  _buildMap(){
    var outputSize = this.getMetadata( "outputSize" );
    var seeds = this._getInput("seeds");
    //var k = Math.min( this.getMetadata( "k" ) , seeds.length );

    var metadataK = this.getMetadata( "k" );
    var k = metadataK <= 0 ? seeds.length : Math.min( metadataK , seeds.length );

    this._map = new Array( outputSize.width * outputSize.height );

    // for each pixel of the image
    for(var i=0; i<outputSize.width; i++){
      for(var j=0; j<outputSize.height; j++){

        var index1D = i + j*outputSize.width;
        var localMap = new Array( p );

        for(var p=0; p<seeds.length; p++){
          // compute euclidian distance from [i, j] to p(x, y)
          var d = Math.sqrt( Math.pow( seeds[p].x - i, 2 ) + Math.pow( seeds[p].y - j, 2) );
          localMap[ p ] = { index: p, distance: d};
        }

        localMap.sort( function(a, b){ return (a.distance < b.distance)?-1:1  });
        localMap = localMap.slice(0, k);
        this._map[ index1D ] = localMap;
      }
    }
  }


} /* END of class IDWSparseInterpolationImageFilter */

export { IDWSparseInterpolationImageFilter }
