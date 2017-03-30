/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


import { PipelineElement } from './PipelineElement.js';


/**
* RasterContainer is a common interface for Image2D and Image3D
* (and possibly some other future formats).
* Should not be used as-is.
*/
class RasterContainer extends PipelineElement {
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


  /**
  * Associate the internal metadata object with the one in args.
  * @param {Object} m - metadata. Should NOT contain TypedArray
  */
  setRawMetadata( m ){
    this._metadata = m;
  }

} /* END of class RasterContainer */

export { RasterContainer }
