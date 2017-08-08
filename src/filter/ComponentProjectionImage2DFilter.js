/*
 * Author   Armin Taheri - https://github.com/ArminTaheri
 * License  MIT
 * Link     https://github.com/Pixpipe/pixpipejs
 * Lab      MCIN - Montreal Neurological Institute
 */

import ndarray from 'ndarray';
import zeros from 'zeros';
import { Filter } from '../core/Filter';
import { Image2D } from '../core/Image2D';

class ComponentProjectionImage2DFilter extends Filter {
  constructor() {
    super();
    this.addInputValidator(0, Image2D);
    this.setMetadata('componentOffset', 0);
  }
  
  
  _run() {
    if( ! this.hasValidInput()){
      console.warn("A filter of type ComponentProjectionImage2DFilter requires 1 input of Image2D.");
      return;
    }
    const inputSignal = this._getInput(0);
    const width = inputSignal.getMetadata('width');
    const height = inputSignal.getMetadata('height');
    const ncpp = inputSignal.getMetadata('ncpp');
    const offset = this.getMetadata('componentOffset');
    const arr = ndarray(inputSignal.getData(), [width, height, ncpp]);
    const projected = arr.pick(null, null, offset); // pick out the component as an ndarray
    const projectedArray = zeros([width, height], arr.dtype);
    for (let i = 0; i < width; i++) {
      for (let j = 0; j < height; j++) {
        projectedArray.set(i, j, projected.get(i, j));
      }
    }
    const projectedImage = new Image2D();
    projectedImage.setData(projectedArray.data, width, height, 1);
    this._output[0] = projectedImage;
  }

}

export { ComponentProjectionImage2DFilter };
