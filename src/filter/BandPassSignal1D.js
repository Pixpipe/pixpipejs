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
import { HiPassSignal1D } from "./HighPassSignal1D.js";


/**
*
*/
class BandPassSignal1D extends Filter {
  constructor(){
    super();

    this.addInputValidator(0, Signal1D);
    this.setMetadata("hiCutoffFrequency", 0);
    this.setMetadata("loCutoffFrequency", 0);
    this.setMetadata("filterType", "gaussian");
    this.setMetadata("gaussianTolerance", 0.01);
  }


  _run(){
    // the input checking
    if( ! this.hasValidInput()){
      console.warn("A filter of type BandPassSignal1D requires 1 input of type Signal1D and of category 0");
      return;
    }

    var input = this._getInput();
    var samplingFreq = input.getMetadata("samplingFrequency");
    var hiCutoffFreq = this.getMetadata("hiCutoffFrequency");
    var loCutoffFreq = this.getMetadata("loCutoffFrequency");
    var filterType = this.getMetadata("filterType");
    var gaussianTolerance = this.getMetadata("gaussianTolerance");

    // at least one freq must be non-null to perform something...
    if( hiCutoffFreq === 0 && loCutoffFreq === 0){
      console.warn("At least one of the following metadata must be greater than zero: hiCutoffFrequency loCutoffFrequency");
      return;
    }

    // the cutoff frequencies have to respect Nyquist
    if( hiCutoffFreq > samplingFreq/2 || loCutoffFreq > samplingFreq/2 ){
      console.warn("The cutoff frequency cannot be greater than half of the sampling frequency (cf. Nyquist).");
      return;
    }

    // the hi cutoff freq can not be higher than the lo cutoff freq (unless we want to perform a hi-pass only or a lo-pass only)
    if( loCutoffFreq > 0 && hiCutoffFreq > 0 && hiCutoffFreq > loCutoffFreq ){
      console.warn("Band pass filter: the hiCutoffFrequency cannot be greater than the loCutoffFrequency.");
      return;
    }

    var filtered = null;

    if(loCutoffFreq > 0){
      var loPassFilter = new pixpipe.LowPassSignal1D();
      loPassFilter.addInput( input );
      loPassFilter.setMetadata("cutoffFrequency", loCutoffFreq);
      loPassFilter.setMetadata("filterType", filterType);
      loPassFilter.setMetadata("gaussianTolerance", gaussianTolerance);
      loPassFilter.update();
      filtered = loPassFilter.getOutput();
    }

    if( hiCutoffFreq > 0 ){
      var hiPassFilter = new pixpipe.HighPassSignal1D();
      hiPassFilter.addInput( filtered || input );
      hiPassFilter.setMetadata("cutoffFrequency", hiCutoffFreq);
      hiPassFilter.setMetadata("filterType", filterType);
      hiPassFilter.setMetadata("gaussianTolerance", gaussianTolerance);
      hiPassFilter.update();
      filtered = hiPassFilter.getOutput();
    }

    this._output[0] = filtered;
  }

} /* END of class BandPassSignal1D */

export { BandPassSignal1D };
