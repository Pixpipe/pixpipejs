/*
 * Author   Armin Taheri - https://github.com/ArminTaheri
 * License  MIT
 * Link     https://github.com/Pixpipe/pixpipejs
 * Lab      MCIN - Montreal Neurological Institute
 */
1 Comment
import ndarray from 'ndarray';
import zeros from 'zeros';
import { Filter } from '../core/Filter';
import { Image2D } from '../core/Image2D';


function validateInputs(inputImages) {
  const widths = inputImages.map(i => i.getMetadata('width'));
  const widthsEqual = widths.reduce((eq, w) => eq && w === widths[0], true);
  if (!widthsEqual) {
    return false;
  }
  const heights = inputImages.map(i => i.getMetadata('height'));
  const heightsEqual = heights.reduce((eq, h) => eq && h === heights[0], true);
  if (!heightsEqual) {
    return false;
  }
  const types = inputImages.map(i => i.getData().constructor);
  const typesEqual = types.reduce((eq, t) => eq && t === types[0], true);
  if (!typesEqual) {
    return false;
  }
  return true;
}

class ComponentMergeImage2DFilter extends Filter {
  constructor() {
    super();
    this.addInputValidator('ALL', Image2D);
  }
  _run() {
    if(this.getNumberOfInputs() < 2) {
      console.warn('A filter of type ComponentMergeImage2DFilter needs 2 or more inputs.');
      return;
    }
    if( ! this.hasValidInput()){
      console.warn("A filter of type ComponentMergeImage2DFilter requires inputs of Image2D.");
      return;
    }
    const inputImages = this.getInputCategories().map(cat => this._getInput(cat));
    if (!validateInputs(inputImages)) {
      console.warn('A filter of type ComponentMergeImage2DFilter requires inputs to be the same dimensions and array type');
      return;
    };
    const width = inputImages[0].getMetadata('width');
    const height = inputImages[0].getMetadata('height');
    const ncpps = inputImages.map(i => i.getMetadata('ncpp'));
    const totalncpp = ncpps.reduce((x,y) => x + y);
    const type = ndarray(inputImages[0].getData()).dtype;
    const merged = zeros([width, height, totalncpp], type);

    let ncppoffset = 0;
    inputImages.forEach((image, index) => {
      const ncpp = image.getMetadata('ncpp');
      const img = ndarray(image.getData(), [width, height, ncpp]);
      for (let i = 0; i < width; i++) {
        for (let j = 0; j < height; j++) {
          for (let k = 0; k < ncpp; k++) {
            merged.set(i, j, ncppoffset + k, img.get(i, j, k));
          }
        }
      }
      ncppoffset += ncpp;
    });
    this._output[0] = new Image2D();
    this._output[0].setData(merged.data, width, height, totalncpp);
  }
}

export { ComponentMergeImage2DFilter };
