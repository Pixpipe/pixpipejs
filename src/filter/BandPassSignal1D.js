/*
* Author    Jonathan Lurie - http://me.jonathanlurie.fr
*
* License   MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { Filter } from "../core/Filter.js";
import { Signal1D } from "../core/Signal1D.js";
import { ForwardFourierSignalFilter } from "../core/ForwardFourierSignalFilter.js";
import { LowPassFreqSignal1D } from "../core/LowPassFreqSignal1D.js";


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
    var filterType = this.setMetadata("filterType");
    var gaussianTolerance = this.setMetadata("gaussianTolerance");
    
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
    
    // the hi cutoff freq can not be higher than the lo cutoff freq (unless we want to perform a hi pass)
    if( loCutoffFreq > 0 && hiCutoffFreq > loCutoffFreq ){
      console.warn("Band pass filter: the hiCutoffFrequency cannot be greater than the loCutoffFrequency.");
      return;
    }
    
    
    // compute the Fourier Transform of the signal
    var phaseHollow = signal.hollowClone()
    var forwardFtfilter = new ForwardFourierSignalFilter();
    forwardFtfilter.addInput(signal, 0);
    forwardFtfilter.addInput(phaseHollow, 1);
    forwardFtfilter.update();
    
    var signalFreq = {
      real: forwardFtfilter.getOutput(0),
      imag: forwardFtfilter.getOutput(1)
    }
    
    
    
    if( loCutoffFreq > 0 ){
      
    }
    
    
  }
  
  
  /**
  * [PRIVATE]
  * Compute a lo pass filter
  */
  _computeFreqLoPass( signalFreq, cutoff, filterType, gaussianTolerance ){
    
    
    // in any case, we have to compute the lo-pass in Fourier
    var freqLoPassFilter = new LowPassFreqSignal1D();
    freqLoPassFilter.addInput( signalFreq.real, "real" );
    freqLoPassFilter.addInput( signalFreq.imag, "imaginary" );
    freqLoPassFilter.setMetadata("filterType", filterType);
    freqLoPassFilter.setMetadata("cutoffFrequency", cutoff);
    freqLoPassFilter.setMetadata("gaussianTolerance", gaussianTolerance);
    freqLoPassFilter.update();
    
    signalFreqLoPass = {
      real: freqLoPassFilter.getOutput("real"),
      imag: freqLoPassFilter.getOutput("imaginary")
    }
    
    return signalFreqLoPass;
  }
  
  
} /* END of class BandPassSignal1D */

export { BandPassSignal1D };
