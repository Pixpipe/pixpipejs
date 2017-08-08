/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link     https://github.com/jonathanlurie/pixpipejs
* Lab      MCIN - Montreal Neurological Institute
*/

import simplify from 'simplify-js'
import { LineString } from '../core/LineString.js';
import { Filter } from '../core/Filter.js';

/**
*
*/
class SimplifyLineStringFilter extends Filter {
  
  constructor(){
    super();
    this.addInputValidator(0, LineString);
    this.setMetadata( "tolerance", 0.1 );
  }
  
  
  _run(){
    
    if( ! this.hasValidInput()){
      console.warn("A filter of type SimplifyLineStringFilter requires 1 input of category '0' (LineString)");
      return;
    }
    
    var inputString = this._getInput( 0 );
    var nod = inputString.getNod()
    var inputPoints = inputString.getData();
    var tolerance = this.getMetadata( "tolerance" );
    
    if( nod != 2){
      console.warn("SimplifyLineStringFilter is only for 2D LineStrings.");
      return;
    }
    
    // points need to be group in an array of {x: Number, y: Number}
    var groupedStringData = new Array( inputPoints.length / 2 )
    
    for(var i=0; i<groupedStringData.length; i++){
      groupedStringData[ i ] = {x: inputPoints[i*2], y: inputPoints[i*2 + 1]}
    }
    
    // simplifying the linestring
    var simplified = simplify(groupedStringData, tolerance, true)
    
    // putting back the data as a big array
    var linearStringData = new Array( simplified.length * 2 );
    
    for(var i=0; i<simplified.length-1; i++){
      linearStringData[i*2] = simplified[i].x;
      linearStringData[i*2 + 1] = simplified[i+1].y;
    }
    
    var outputLineString = new LineString();
    outputLineString.setData( linearStringData, nod )
    outputLineString.copyMetadataFrom( inputString )
    
    this._output[0] = outputLineString;
  }
  
} /* END of class SimplifyLineStringFilter */

export { SimplifyLineStringFilter }
