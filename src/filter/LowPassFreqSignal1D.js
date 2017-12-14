/*
* Author    Jonathan Lurie - http://me.jonathanlurie.fr
*
* License   MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { Filter } from "../core/Filter.js";
import { Signal1D } from "../core/Signal1D.js";
import { FunctionGenerator } from "../utils/FunctionGenerator.js";


const F_TYPES = ["gaussian", "rectangular"];

/**
* An object of type LowPassFreqSignal1D perform a low pass in the frequency
* domain, which means the input Signal1D object must already be in the frequency
* domain.
* This filter requires 2 inputs:
* - the `real` part of the Fourier transform output as a `Signal1D`. To be set with  with `.addInput("real", Signal1D)`
* - the `imaginary` part of the Fourier transform output as a `Signal1D`. To be set with  with `.addInput("imaginary", Signal1D)`
* 
* In addition to data, few metada can be used:  
* - **mandatory** the `cutoffFrequency` in Hz using the method `.setMetadata("cutoffFrequency", Number)` - cannot be higher than half of the sampling frequency (cf. Nyquist)
* - *optional* the `filterType` in Hz using the method `.setMetadata("filterType", String)` can be `gaussian` or `rectangular` (default: `gaussian`)
* - *optional* the `gaussianTolerance` in Hz using the method `.setMetadata("gaussianTolerance", Number)` value (frequency response) under which we want to use 0 instead of the actual gaussian value. Should be small. (default: 0.01)
*
* Note: the filter type `rectangular` should be used with caution because it simply thresholds
* the frequency spectrum on a given range. When transformed back to the time domain, this is
* likely to produce artifact waves due to Gibbs phenomenon.
* 
* * **Usage**
* - [examples/fftLoPassSignal1D.html](../examples/fftLoPassSignal1D.html)
*/
class LowPassFreqSignal1D extends Filter {
  
  constructor(){
    super();
    this.addInputValidator("real", Signal1D);
    this.addInputValidator("imaginary", Signal1D);
    this.setMetadata("cutoffFrequency", 0);
    this.setMetadata("filterType", "gaussian");
    this.setMetadata("gaussianTolerance", 0.01);
  }
  
  
  _run(){
    
    // the input checking
    if( ! this.hasValidInput()){
      console.warn("A filter of type LowPassFreqSignal1D requires 2 input of type Signal1D and of category: 'real' and 'imaginary'.");
      return;
    }
    
    var real = this._getInput("real");
    var imag = this._getInput("imaginary");
    var cutoff = this.getMetadata("cutoffFrequency");
    var filterType = this.getMetadata("filterType");
    
    if( cutoff == 0 ){
      console.warn("The cutoff frequency cannot be 0.");
      return;
    }
    
    if( F_TYPES.indexOf(filterType) == -1 ){
      console.warn(`The filter type must be one of: ${F_TYPES.join(", ")}`);
      return;
    }
    
    var realOut = real.clone();
    var imagOut = imag.clone();
    
    var isValid = this[ "_" + filterType ](realOut, imagOut, cutoff);
    
    if( isValid ){
      this._output["real"] = realOut;
      this._output["imaginary"] = imagOut;
    }
    
  }
  
  
  /**
  * [PRIVATE]  
  * For a given Signal1D in frequency domain, return the index in the _data that corresponds to
  * the requested frequency.
  * @param {Signal1D} signal - a Signal1D object in frequency domain
  * @param {Number} freq - frequency (most likely cutoff freq)
  * @return {Number} the index in the _data
  */
  _getDataIndexFromFrequency( signal, freq ){
    return Math.round( freq * signal.getData().length / signal.getMetadata("samplingFrequency") );
  }
  
  
  /**
  * [PRIVATE]  
  * Perform a rectangular function on the signal, which basically means thresholding
  * the FT of the signal at a given cutoff frequency. This is a very bad lo-pass
  * filter, it sould be used only for testing (c.f. Gibbs phenomenon)
  * @param {Signal1D} real - the real part of the FT
  * @param {Signal1D} imag - the imaginary part of the FT
  * @param {Number} cutoff - cutoff frequency in Hz
  * @return {Boolean} true if it went well, false if not
  */
  _rectangular( real, imag, cutoff ){
    var samplingFreq = real.getMetadata("samplingFrequency");
    var cutoffIndex = this._getDataIndexFromFrequency( real, cutoff );
    var realData = real.getData();
    var imagData = imag.getData();

    for(var i=cutoffIndex; i<realData.length-cutoffIndex; i++){
      realData[i] = 0;
      imagData[i] = 0;
    }
    
    return true;
  }
  
  
  /**
  * [PRIVATE]  
  * Perform a gaussian lo-pass on the signal.
  * @param {Signal1D} real - the real part of the FT
  * @param {Signal1D} imag - the imaginary part of the FT
  * @param {Number} cutoff - cutoff frequency in Hz
  * @return {Boolean} true if it went well, false if not
  */
  _gaussian( real, imag, cutoff ){
    var samplingFreq = real.getMetadata("samplingFrequency");
    var cutoffIndex = this._getDataIndexFromFrequency( real, cutoff );
    var realData = real.getData();
    var imagData = imag.getData();
    var dataLength = realData.length;
    var halfDataLength = Math.floor( dataLength/2 );
    var gaussianTolerance = this.getMetadata("gaussianTolerance");
    var gaussianFunction = FunctionGenerator.gaussianFrequencyResponse( cutoff, 0, Math.floor(imagData.length/2), cutoff/cutoffIndex, gaussianTolerance ).data;

    for(var i=0; i<gaussianFunction.length; i++){
      if( i >= halfDataLength)
        break;
      
      // begining of spectrum
      realData[i] *= gaussianFunction[i];
      imagData[i] *= gaussianFunction[i];
      
      // end of spectrum
      realData[ dataLength - 1 - i ] *= gaussianFunction[i];
      imagData[ dataLength - 1 - i ] *= gaussianFunction[i];
    }
    
    try{
      var centerZeros = new Float32Array( realData.length - gaussianFunction.length * 2 );
      realData.set( centerZeros, gaussianFunction.length );
      imagData.set( centerZeros, gaussianFunction.length );
    }catch(e){
    
    }
    
    return true;
  }
  
  
  
} /* END of class LowPassFreqSignal1D */

export { LowPassFreqSignal1D };
