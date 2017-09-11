/*
* Author    Jonathan Lurie - http://me.jonahanlurie.fr
*           Robert D. Vincent
*
* License   MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import nifti from 'nifti-reader-js'
import { Filter } from '../core/Filter.js';
import { MniVolume } from '../core/MniVolume.js';


/**
* Info:
* The official NIfTI header description ( https://nifti.nimh.nih.gov/pub/dist/src/niftilib/nifti1.h )
* was used to interpret the data.
*/
class NiftiDecoderAlt extends Filter {
  constructor(){
    super();
    this.addInputValidator(0, ArrayBuffer);
  }
  
  
  _run(){
    var that = this;
    var inputBuffer = this._getInput(0);

    if(!inputBuffer){
      console.warn("NiftiDecoderAlt requires an ArrayBuffer as input \"0\". Unable to continue.");
      return;
    }
    
    console.log( nifti );
    
    if(! nifti.isNIFTI( inputBuffer )) {
      console.warn("Not a NIfTI file");
      return;
    }
    
    var metadata = {};
    var data = null;
    
    var header = nifti.readHeader(inputBuffer);
    var rawData = nifti.readImage(header, inputBuffer);
    
    console.log( header );

    
    data = this._fetchDataArray(header, rawData);
    
    if( !data ){
      console.warn("This NIfTI file is valid but does not contain any readable data.");
      return;
    }
    
    this._scaleData(data, header);
    
    // copying all the original metadata into the field "formatSpecific", for the sake of quality.
    metadata.formatSpecific = header;
    
    metadata.ncpp = this._fetchNcpp(header);
    metadata.description = header.description;
    metadata.format = "nifti";
    metadata.numberOfDimensions = header.dims[0];
    metadata.spatialUnit = header.getUnitsCodeString(nifti.NIFTI1.SPATIAL_UNITS_MASK & header.xyzt_units);
    metadata.temporalUnit = header.getUnitsCodeString(nifti.NIFTI1.TEMPORAL_UNITS_MASK & header.xyzt_units);
    
    // dimensions info ordered from the fastest varying to the slowest varying
    var voxelSpaceNames = ['x', 'y', 'z', 't'];
    var subjectSpaceNames = ['i', 'j', 'k', 'l'];
    metadata.dimensions = [];
    for(var d=0; d<metadata.numberOfDimensions; d++){
      var dimensions = {
        nameVoxelSpace: voxelSpaceNames[d],
        subjectSpaceName: subjectSpaceNames[d],
        // TODO
      }
      
      metadata.dimensions.push( dimension )
    }
    
      {
        voxelSpaceName: "i",
        subjectSpaceName: "x",
        voxelSize: 
        
        
      }
    
    
    console.log( data );
    
    
  }
  
  
  /**
  * [PRIVATE]
  * The header field `scl_slope` is used to scale the data, thus if non-0,
  * we should scale the data.
  * @param {typed array} data - the nifti data array, WILL BE MODIFIED
  * @param {Object} header - nifti header
  */
  _scaleData( data, header ){
    // the data scaling wont change anything, thus we dont perform it
    if( header.scl_slope == 1 && header.scl_inter == 0 ){
      return;
    }
    
    if( header.scl_slope ){
      for(var i=0; i<data.length; i++){
        data[i] = data[i] * header.scl_slope + header.scl_inter;
      }
    }
  }
  
  
  /**
  * [PRIVATE]
  * Get the number of components per pixel encoded in the Nifti file
  * @param {Object} header - Nifti header
  * @return {number} the ncpp
  */
  _fetchNcpp( header ){
    var ncpp = 0;
    
    switch ( header.datatypeCode ) {
      case nifti.NIFTI1.TYPE_BINARY:
        console.warn("The datatype nifti.TYPE_BINARY is not compatible yet.");
        break;
      case nifti.NIFTI1.TYPE_COMPLEX64:
        console.warn("The datatype nifti.TYPE_COMPLEX64 is not compatible yet.");
        break;
      case nifti.NIFTI1.TYPE_COMPLEX128:
        console.warn("The datatype nifti.TYPE_COMPLEX128 is not compatible yet.");
        break;
      case nifti.NIFTI1.TYPE_COMPLEX256:
        console.warn("The datatype nifti.TYPE_COMPLEX256 is not compatible yet.");
        break;
      case nifti.NIFTI1.TYPE_FLOAT128:
        console.warn("The datatype nifti.TYPE_FLOAT128 is not compatible yet.");
        break;
      case nifti.NIFTI1.TYPE_INT64:
        console.warn("The datatype nifti.TYPE_INT64 is not compatible yet.");
        break;
      case nifti.NIFTI1.TYPE_NONE:
        console.warn("The datatype nifti.TYPE_NONE is not compatible.");
        break;
      case nifti.NIFTI1.TYPE_UINT64:
        console.warn("The datatype nifti.TYPE_INT64 is not compatible yet.");
        break;
        
      case nifti.NIFTI1.TYPE_FLOAT32:
        ncpp = 1;
        break;
      case nifti.NIFTI1.TYPE_FLOAT64:
        ncpp = 1;
        break;
      case nifti.NIFTI1.TYPE_INT8:
        ncpp = 1;
        break;
      case nifti.NIFTI1.TYPE_INT16:
        ncpp = 1;
        break;
      case nifti.NIFTI1.TYPE_INT32:
        ncpp = 1;
        break;
      case nifti.NIFTI1.TYPE_UINT8:
        ncpp = 1;
        break;
      case nifti.NIFTI1.TYPE_UINT16:
        ncpp = 1;
        break;
      case nifti.NIFTI1.TYPE_UINT32:
        ncpp = 1;
        break;
      case nifti.NIFTI1.TYPE_RGB24:
        ncpp = 3;
        break;
      
      default:
        console.warn("The datatype is unknown.");
    }
    
    return ncpp;
  }
  
  
  /**
  * [PRIVATE]
  * Cast the raw ArrayBuffer into the appropriate type. Some Nifti types are not
  * compatible with Javascript and cannot be used.
  * @param {Object} header - the nifti header
  * @param {ArrayBuffer} rawData - the nifti data buffer
  * @return {typed array} a typed array with the data
  */
  _fetchDataArray( header, rawData ){
    var typedData = null;
    
    switch ( header.datatypeCode ) {
      case nifti.NIFTI1.TYPE_BINARY:
        console.warn("The datatype nifti.TYPE_BINARY is not compatible yet.");
        break;
      case nifti.NIFTI1.TYPE_COMPLEX64:
        console.warn("The datatype nifti.TYPE_COMPLEX64 is not compatible yet.");
        break;
      case nifti.NIFTI1.TYPE_COMPLEX128:
        console.warn("The datatype nifti.TYPE_COMPLEX128 is not compatible yet.");
        break;
      case nifti.NIFTI1.TYPE_COMPLEX256:
        console.warn("The datatype nifti.TYPE_COMPLEX256 is not compatible yet.");
        break;
      case nifti.NIFTI1.TYPE_FLOAT128:
        console.warn("The datatype nifti.TYPE_FLOAT128 is not compatible yet.");
        break;
      case nifti.NIFTI1.TYPE_INT64:
        console.warn("The datatype nifti.TYPE_INT64 is not compatible yet.");
        break;
      case nifti.NIFTI1.TYPE_NONE:
        console.warn("The datatype nifti.TYPE_NONE is not compatible.");
        break;
      case nifti.NIFTI1.TYPE_UINT64:
        console.warn("The datatype nifti.TYPE_INT64 is not compatible yet.");
        break;
        
      case nifti.NIFTI1.TYPE_FLOAT32:
        typedData = new Float32Array( rawData );
        break;
      case nifti.NIFTI1.TYPE_FLOAT64:
        typedData = new Float64Array( rawData );
        break;
      case nifti.NIFTI1.TYPE_INT8:
        typedData = new Int8Array( rawData );
        break;
      case nifti.NIFTI1.TYPE_INT16:
        typedData = new Int16Array( rawData );
        break;
      case nifti.NIFTI1.TYPE_INT32:
        typedData = new Int32Array( rawData );
        break;
      case nifti.NIFTI1.TYPE_UINT8:
        typedData = new Uint8Array( rawData );
        break;
      case nifti.NIFTI1.TYPE_UINT16:
        typedData = new Uint16Array( rawData );
        break;
      case nifti.NIFTI1.TYPE_UINT32:
        typedData = new Uint32Array( rawData );
        break;
      case nifti.NIFTI1.TYPE_RGB24:
        typedData = new Uint8Array( rawData );
        break;
      
      default:
        console.warn("The datatype is unknown.");
    }
    return typedData;
  }
  
  
} /* END of class NiftiDecoderAlt */

export { NiftiDecoderAlt }
