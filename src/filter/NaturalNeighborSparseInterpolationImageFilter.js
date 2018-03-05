/*
* Author    Jonathan Lurie - http://me.jonathanlurie.fr
*
* License   MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { natninter } from 'natninter';
import { Filter } from '../core/Filter.js';
import { Image2D } from '../core/Image2D.js';


class NaturalNeighborSparseInterpolationImageFilter extends Filter {
  constructor(){
    super()
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


    var nnInter = new natninter.Interpolator();
    nnInter.computeMap();
    var samplingMap = nnInter.getMap();

    // creating the output image
    var out = new pixpipe.Image2D({width: outputSize.width, height: outputSize.height, color: [0]})

    // for each pixel of the image...
    for(var i=0; i<outputSize.width; i++){
      for(var j=0; j<outputSize.height; j++){
        var index1D = i + j * outputSize.height;
        var pixValue = 0;


        out.setPixel( {x: i, y: j}, [ points[nearestPointIndex].value ] );
      }
    }

    this._output[ 0 ] = out;
  }

} /* END of class NaturalNeighborSparseInterpolationImageFilter */

export { NaturalNeighborSparseInterpolationImageFilter }
