/*
 * Author   Armin Taheri - https://github.com/ArminTaheri
 * License  MIT
 * Link     https://github.com/Pixpipe/pixpipejs
 * Lab      MCIN - Montreal Neurological Institute
 */
import { PixpipeContainer } from './PixpipeContainer';

class Signal1D extends PixpipeContainer {
  constructor() {
    super();
    this._type = Signal1D.TYPE();
    this.setMetadata('length', 0);
  }

  static TYPE() {
    return 'SIGNAL1D';
  }

  getData() {
    return this._data;
  }

  setData(array, deepCopy = false) {
    if (deepCopy) {
      this._data = new array.constructor(array);
    } else {
      this._data = array;
    }

    this.setMetadata('length', array.length);
  }

  clone(){
    const copy = new Signal1D();
    if (this._data) {
      copy.setData(this._data, true);
    }
    return copy;
  }

  hollowClone(){
    const copy = new Signal1D();
    const length = this.getMetadata('length');
    copy.setData( new Float32Array(length).fill(0) );
    return copy
  }
}

export { Signal1D }
