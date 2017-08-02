import ndarray from 'ndarray';
import ft from 'ndarray-fft';

import { Filter } from '../core/Filter';
import { Signal1D } from '../core/Signal1D';

const DIRECTIONS = {
  'FORWARD': 1,
  'INVERSE': -1,
};

class BaseFourierSignalFilter extends Filter {
  constructor(direction) {
    super();
    this.direction = direction;
    if (DIRECTIONS[this.direction] === undefined) {
      throw new Error(`${this.direction} is not a valid fourier transform direction. Please try one of: ${Object.keys(DIRECTIONS)}`);
    }
    this.addInputValidator(0, Signal1D);
  }
  _run() {
    if( ! this.hasValidInput()){
      console.warn("A filter of type BaseFourierSignalFilter requires 1 input of Signal1D.");
      return;
    }
    const inputSignal = this._getInput(0);
    const length = inputSignal.getMetadata('length');
    const real = ndarray(inputSignal.clone().getData(), [length]);
    const img = ndarray(inputSignal.hollowClone().getData(), [length]);
    this.setMetadata('direction', this.direction);

    ft(DIRECTIONS[this.direction], real, img);
    this._output[0] = new Signal1D();
    this._output[0].setData(real.data);
    this._output[1] = new Signal1D();
    this._output[1].setData(img.data);
  }
}

class ForwardFourierSignalFilter extends BaseFourierSignalFilter {
  constructor() {
    super('FORWARD');
  }
}

class InverseFourerSignalFilter extends BaseFourierSignalFilter {
  constructor() {
    super('INVERSE');
  }
}

export { ForwardFourierSignalFilter, InverseFourerSignalFilter }
