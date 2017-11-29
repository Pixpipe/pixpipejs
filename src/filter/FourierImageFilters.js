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
import { Image2D } from '../core/Image2D';

const DIRECTIONS = {
  'FORWARD': 1,
  'INVERSE': -1,
};

class BaseFourierImageFilter extends Filter {
  
  constructor(direction) {
    super();
    this.direction = direction;
    if (DIRECTIONS[this.direction] === undefined) {
      throw new Error(`${this.direction} is not a valid fourier transform direction. Please try one of: ${Object.keys(DIRECTIONS)}`);
    }
    this.addInputValidator(0, Image2D);
    this.addInputValidator(1, Image2D);
  }
  
  
  _run() {
    if( ! this.hasValidInput()){
      console.warn("A filter of type BaseFourierSignalFilter requires 2 inputs of Signal1D.");
      return;
    }
    const inputImagereal = this._getInput(0);
    const inputImageimg = this._getInput(1);
    const ncpp = inputImagereal.getMetadata('ncpp');
    if (ncpp > 1) {
      console.warn('Please make sure the input images are made of exactly 1 channel.');
      return;
    }

    const width = inputImagereal.getMetadata('width');
    const height =inputImagereal.getMetadata('height');
    if (width !== inputImageimg.getMetadata('width') || height !== inputImageimg.getMetadata('height')) {
      console.warn('Please make sure the real and imaginary input images are the same dimensions');
    }
    const real = ndarray(inputImagereal.getDataAsFloat32Array(), [width, height]);
    const img = ndarray(inputImageimg.getDataAsFloat32Array(), [width, height]);
    this.setMetadata('direction', this.direction);

    ft(DIRECTIONS[this.direction], real, img);
    this._output[0] = new Image2D();
    this._output[0].setData(real.data, width, height, 1);
    this._output[0].setMetadata('ncpp', 1);
    this._output[1] = new Image2D();
    this._output[1].setData(img.data, width, height, 1);
    this._output[1].setMetadata('ncpp', 1);
  }
}


/**
* An instance of ForwardFourierImageFilter performs a forward Fourier transform
* on an Image2D or a Signa1D.
*
* **Usage**
* - [examples/fftImage2D.html](../examples/fftImage2D.html)
* - [examples/fftSignal1D.html](../examples/fftSignal1D.html)
*/
class ForwardFourierImageFilter extends BaseFourierImageFilter {
  constructor() {
    super('FORWARD');
  }
}


/**
* An instance of ForwardFourierImageFilter performs an inverse Fourier transform
* on an Image2D or a Signa1D.
*
* **Usage**
* - [examples/fftImage2D.html](../examples/fftImage2D.html)
* - [examples/fftSignal1D.html](../examples/fftSignal1D.html)
*/
class InverseFourierImageFilter extends BaseFourierImageFilter {
  constructor() {
    super('INVERSE');
  }
}

export { ForwardFourierImageFilter, InverseFourierImageFilter }
