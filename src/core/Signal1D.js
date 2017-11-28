/*
 * Author   Armin Taheri - https://github.com/ArminTaheri
 * License  MIT
 * Link     https://github.com/Pixpipe/pixpipejs
 * Lab      MCIN - Montreal Neurological Institute
 */
 
import { CoreTypes } from './CoreTypes.js';
import { PixpipeContainer } from './PixpipeContainer';


/**
* An object of type Signal1D is a single dimensional signal, most likely
* by a Float32Array and a sampling frequency. To change the sampling frequency
* use the method `.setMetadata('samplingFrequency', Number);`, defaut value is 100.
* We tend to considere this frequency to be in **Hz**, but there is no hardcoded
* unit and it all depends on the application. This is important to specify this
* metadata because some processing filters may use it.
*
* **Usage**
* - [examples/urlFileToArrayBuffer.html](../examples/fftSignal1D.html)
*/
class Signal1D extends PixpipeContainer {
  constructor() {
    super();
    this._type = Signal1D.TYPE();
    this.setMetadata('length', 0);
    
    this.setMetadata('samplingFrequency', 100);
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
    copy.copyMetadataFrom( this );
    
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
  
  
  /**
  * Get a string reprensenting the data
  * @return {String} the data to string
  */
  dataToString(){
    var maxAbstractSize = 10;
    var abstractSize = Math.min(maxAbstractSize, this._data.length);
    var shortArray = this._data.slice(0, abstractSize);
    var str = "__data__\n";
    str += `\t${this._data.constructor.name}[${this._data.length}] `;
    str += `${shortArray.toString()} ${this._data.length > maxAbstractSize ? ' ...':''}`;
    return str;
  }
  
  
  /**
  * Get a string description of this object
  * @return {String} the description
  */
  toString(){
    var str = this.constructor.name + "\n";
    str += this.metadataToString();
    str += this.dataToString();
    return str;
  }
  
}

// register this type as a CoreType
CoreTypes.addCoreType( Signal1D );

export { Signal1D }
