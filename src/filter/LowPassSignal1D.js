/*
* Author    Jonathan Lurie - http://me.jonathanlurie.fr
*
* License   MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { Filter } from "../core/Filter.js";
import { Signal1D } from "../core/Signal1D.js";
import { ForwardFourierSignalFilter, InverseFourierSignalFilter } from "./FourierSignalFilters.js";
//import { InverseFourierSignalFilter } from "./InverseFourierSignalFilter.js";
import { LowPassFreqSignal1D } from "./LowPassFreqSignal1D.js";


/**
*
*/
class LowPassSignal1D extends Filter {
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
      console.warn("A filter of type LowPassSignal1D requires 1 input of type Signal1D and of category 0");
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
    
    // compute the Fourier Transform of the signal
    var phaseHollow = input.hollowClone()
    var forwardFtfilter = new ForwardFourierSignalFilter();
    forwardFtfilter.addInput(input, 0);
    forwardFtfilter.addInput(phaseHollow, 1);
    forwardFtfilter.update();
    
    var signalFreq = {
      real: forwardFtfilter.getOutput(0),
      imag: forwardFtfilter.getOutput(1)
    }
    
    // compute the lo-pass in freq domain
    var freqLoPassFilter = new LowPassFreqSignal1D();
    freqLoPassFilter.addInput( signalFreq.real, "real" );
    freqLoPassFilter.addInput( signalFreq.imag, "imaginary" );
    freqLoPassFilter.setMetadata("filterType", filterType);
    freqLoPassFilter.setMetadata("cutoffFrequency", cutoffFreq);
    freqLoPassFilter.setMetadata("gaussianTolerance", gaussianTolerance);
    freqLoPassFilter.update();
    
    var signalFreqLoPass = {
      real: freqLoPassFilter.getOutput("real"),
      imag: freqLoPassFilter.getOutput("imaginary")
    }
    
    // inverse Fourier transform
    var ifftfilter = new pixpipe.InverseFourierSignalFilter();
    ifftfilter.addInput(signalFreqLoPass.real, 0);
    ifftfilter.addInput(signalFreqLoPass.imag, 1);
    ifftfilter.update();
    
    var out = ifftfilter.getOutput();
    
    if( out ){
      this._output[0] = out;
    }
    
  }
  
} /* END of class LowPassSignal1D */

export { LowPassSignal1D };
