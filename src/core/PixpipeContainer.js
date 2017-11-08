/*
* Author   Jonathan Lurie - http://me.jonathanlurie.fr
* License  MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


import { PixpipeObject } from './PixpipeObject.js';


/**
* PixpipeContainer is a common interface for Image2D and Image3D
* (and possibly some other future formats).
* Should not be used as-is.
*/
class PixpipeContainer extends PixpipeObject {
  constructor(){
    super();
    this._data = null;
  }


  /**
  * Associate d with the internal data object by pointer copy (if Object or Array)
  * @param {TypedArray} d - pixel or voxel data. If multi-band, should be rgbargba...
  */
  setRawData( d ){
    this._data = d;
  }

} /* END of class PixpipeContainer */

export { PixpipeContainer }
