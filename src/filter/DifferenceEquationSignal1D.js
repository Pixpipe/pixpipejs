/*
* Author   Jonathan Lurie - http://me.jonathanlurie.fr
* License  MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { DifferenceEquationSignal1D as DifferenceEquationSignal1DDep } from 'differenceequationsignal1d';
import { Signal1D } from '../core/Signal1D.js';
import { Filter } from '../core/Filter.js';


/**
* Performs a difference equation (= discrete version of a differential equation)
* on a Signal1D object. This is convenient to perform a lo-pass or hi-pass filter.
* Coefficients are needed to run this filter, set them using
* the following methods: `.setMetadata("coefficientsB", [Number, Number, ...])` and
* `.setMetadata("coefficientsB", [Number, Number, ...])`. This is related to the
* following:  
* ![](https://raw.githubusercontent.com/Pixpipe/differenceequationsignal1d/master/images/definition.png)  
* Where coeefticients A and B are array of the same size, knowing the first number
* of the array coefficients A will not be used (just set it to `1.0`).  
* more information on the [module repo](https://github.com/Pixpipe/differenceequationsignal1d) 
* and even more on the original [description page](https://www.dsprelated.com/freebooks/filters/Difference_Equation_I.html).
*
*
* **Usage**
* - [examples/differenceEqSignal1D.html](../examples/differenceEqSignal1D.html)
*
*/
class DifferenceEquationSignal1D extends Filter {
  
  constructor(){
    super();
    this.addInputValidator(0, Signal1D);
    this.setMetadata("coefficientsB", null);
    this.setMetadata("coefficientsA", null);
    this.setMetadata("enableBackwardSecondPass", true);  
    
  }
  
  
  _run(){
    if(! this.hasValidInput() ){
      return;
    }
    
    var input = this._getInput(0);
    var coefficientsB = this.getMetadata("coefficientsB");
    var coefficientsA = this.getMetadata("coefficientsA");
    var backwardSecondPass = this.getMetadata("enableBackwardSecondPass");
    
    if( !coefficientsA || !coefficientsB ){
      console.warn("Both 'coefficientsB' and 'coefficientsA' metadata must be set to arrays of numbers.");
      return;
    }
    
    if( coefficientsA.length != coefficientsB.length ){
      console.warn("The 'coefficientsB' and 'coefficientsA' metadata must be arrays of the same size.");
      return;
    }
    
    var filter = new DifferenceEquationSignal1DDep();
    
    if( backwardSecondPass )
      filter.enableBackwardSecondPass()
      
    filter.setInput( input.getData() );
    filter.setACoefficients( coefficientsA );
    filter.setBCoefficients( coefficientsB );
    filter.run();
    
    var outRaw = filter.getOutput();
    
    if( outRaw ){
      var out = new Signal1D();
      out.copyMetadataFrom( input );
      out.setData( outRaw );
      this._output[0] = out;
    }
    
  }

} /* END of class DifferenceEquationSignal1D */

export { DifferenceEquationSignal1D };
