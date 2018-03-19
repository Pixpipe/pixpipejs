/*
* Author    Jonathan Lurie - http://me.jonathanlurie.fr
*
* License   MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import * as natninter from 'natninter'; // ok and then use natninter.Interpolator
import { Filter } from '../core/Filter.js';
import { Image2D } from '../core/Image2D.js';

/**
 * Inputs are alternatively
 * - "seeds" , an array of seeds
 * - "samplingMap"
 *
 * As metadata:
 * - "outputSize" as {width: Number, height: Number}
 * - "samplingMapOnly" as a boolean. If true generated only the sampling map, if false, generate the sampling map and the output image
 *
 * As output:
 * - "0" or not arg, the output image
 * - "samplingMap", the sampling map. Only available if "samplingMap" is not already as input
 *
 * @extends Filter
 */
class NaturalNeighborSparseInterpolationImageFilter extends Filter {
  constructor(){
    super()
    this.setMetadata( "outputSize", {width: 0, height: 0});
    this.setMetadata( "samplingMapOnly", false);

    console.log( natninter );
  }



  _run(){
    var inputSeeds = this._getInput("seeds");
    var inputSamplingMap = this._getInput("samplingMap");
    var outputSize = this.getMetadata("outputSize");
    var samplingMapOnly = this.getMetadata("samplingMapOnly");

    if( !inputSeeds ){
      console.log("The sparse nn interpolation needs seeds to process.");
      return;
    }

    if( !(outputSize && outputSize.width > 0 && outputSize.height > 0)){
      console.log("The output size must be of form {width: Number, height: Number}, both being positive.");
      return;
    }

    //

    var nnInter = new natninter.Interpolator();
    nnInter.setOutputSize( outputSize.width, outputSize.height );
    nnInter.addSeeds( inputSeeds );

    if( nnInter.getNumberOfSeeds() === 0 ){
      console.log("Seeds are probably of the wrong format, check documentation.");
      return;
    }

    // here we have the alternative, or we already have a sampling map to use...
    if( inputSamplingMap ){
      var validSize = nnInter.setMap( inputSamplingMap );
      if( !validSize ){
        console.log("The provided sampling map is of the wrong size.");
        return;
      }

    // ...of compute the sampling map
    }else{
      var mapOk = nnInter.generateMap();
      if( !mapOk ){
        console.log("The sampling map generation went wrong.");
        return;
      }else{
        this._output["samplingMap"] = nnInter.getMap();
      }
    }

    if( samplingMapOnly )
      return;

    var imgArray = nnInter.generateImage();
    var out = new Image2D();
    out.setData( imgArray._data, outputSize.width, outputSize.height, 1 );

    var min = +Infinity;
    var max = -Infinity;
    for(var i=0; i<inputSeeds.length; i++){
      min = Math.min( min, inputSeeds[i].value );
      max = Math.max( max, inputSeeds[i].value );
    }
    out.setMetadata( "min", min );
    out.setMetadata( "max", max );

    this._output[0] = out;
  }

} /* END of class NaturalNeighborSparseInterpolationImageFilter */

export { NaturalNeighborSparseInterpolationImageFilter }
