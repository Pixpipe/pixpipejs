/*
 * Author   Armin Taheri - https://github.com/ArminTaheri
 * License  MIT
 * Link     https://github.com/Pixpipe/pixpipejs
 * Lab      MCIN - Montreal Neurological Institute
 */
import ndarray from 'ndarray';
import zeros from 'zeros';
import ft from 'ndarray-fft';

import { Filter } from '../core/Filter';
import { Signal1D } from '../core/Signal1D';

const DIRECTIONS = {
  'FORWARD': 1,
  'INVERSE': -1,
};


// more info:
// http://paulbourke.net/miscellaneous/dft/
class BaseFourierSignalFilter extends Filter {
  constructor(direction) {
    super();
    this.direction = direction;
    this.setMetadata('direction', this.direction);
    if (DIRECTIONS[this.direction] === undefined) {
      throw new Error(`${this.direction} is not a valid fourier transform direction. Please try one of: ${Object.keys(DIRECTIONS)}`);
    }
    this.addInputValidator(0, Signal1D);
    this.addInputValidator(1, Signal1D);
  }
  _run() {
    if( ! this.hasValidInput()){
      console.warn("A filter of type BaseFourierSignalFilter requires 2 inputs of Signal1D.");
      return;
    }
    const realSignal = this._getInput(0);
    const imgSignal = this._getInput(1);
    const length = realSignal.getMetadata('length');
    if (length !== imgSignal.getMetadata('length')) {
      console.warn('The imaginary and real components of the signal need to be of equal length.')
    }
    const real = ndarray(realSignal.clone().getData(), [length]);
    const img = ndarray(imgSignal.clone().getData(), [length]);

    ft(DIRECTIONS[this.direction], real, img);
    this._output[0] = new Signal1D();
    this._output[0].setData(real.data);
    this._output[1] = new Signal1D();
    this._output[1].setData(img.data);
    
    // metadata
    this._output[0].setMetadata("samplingFrequency", realSignal.getMetadata("samplingFrequency"));
    this._output[1].setMetadata("samplingFrequency", realSignal.getMetadata("samplingFrequency"));
    
  }
}

class ForwardFourierSignalFilter extends BaseFourierSignalFilter {
  constructor() {
    super('FORWARD');
  }
}

class InverseFourierSignalFilter extends BaseFourierSignalFilter {
  constructor() {
    super('INVERSE');
  }
}

export { ForwardFourierSignalFilter, InverseFourierSignalFilter }
