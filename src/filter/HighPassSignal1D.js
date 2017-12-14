/*
* Author    Jonathan Lurie - http://me.jonathanlurie.fr
*
* License   MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { Filter } from "../core/Filter.js";
import { Signal1D } from "../core/Signal1D.js";
import { LowPassSignal1D } from "./LowPassSignal1D.js";


/**
*
*/
class HighPassSignal1D extends Filter {
  constructor(){
    super();
    
    this.addInputValidator(0, Signal1D);
    this.setMetadata("cutoffFrequency", 0);
    this.setMetadata("filterType", "gaussian");
    this.setMetadata("gaussianTolerance", 0.01);
  }
  
  
  _run(){
    // the input checking
    if( ! this.hasValidInput()){
      console.warn("A filter of type HighPassSignal1D requires 1 input of type Signal1D and of category 0");
      return;
    }
    
    var input = this._getInput();
    var samplingFreq = input.getMetadata("samplingFrequency");
    var cutoffFreq = this.getMetadata("cutoffFrequency");
    var filterType = this.getMetadata("filterType");
    var gaussianTolerance = this.getMetadata("gaussianTolerance");
    
    
    // the cutoff frequencies have to respect Nyquist
    if( cutoffFreq > samplingFreq/2 ){
      console.warn("The cutoff frequency cannot be greater than half of the sampling frequency (cf. Nyquist).");
      return;
    }
    
    var lowPassSignal1D = new LowPassSignal1D();
    lowPassSignal1D.setMetadata("cutoffFrequency", cutoffFreq);
    lowPassSignal1D.setMetadata("filterType", filterType);
    lowPassSignal1D.setMetadata("gaussianTolerance", gaussianTolerance);
    lowPassSignal1D.addInput( input );
    lowPassSignal1D.update();
    
    var loPassSignal = lowPassSignal1D.getOutput();
    
    if( !loPassSignal ){
      console.warn("couldnt compute the low pass filter.");
      return;
    }
    
    var out = input.clone();
    var outData = out.getData();
    var loPassData = loPassSignal.getData();
    
    for(var i=0; i<outData.length; i++){
      outData[i] -= loPassData[i];
    }
    
    this._output[0] = out;
  }
  
} /* END of class HighPassSignal1D */

export { HighPassSignal1D };
