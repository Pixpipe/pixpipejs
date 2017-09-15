/*
* Author    Jonathan Lurie - http://me.jonahanlurie.fr
*           Robert D. Vincent
*
* License   MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import nifti from 'nifti-reader-js';
import { glMatrix, mat2, mat2d, mat3, mat4, quat, vec2, vec3, vec4 } from 'gl-matrix';
import { Filter } from '../core/Filter.js';
import { Algebra } from '../utils/Algebra.js';
import { Image3D } from '../core/Image3D.js';


/**
* Important information:  
* NIfTI dataset are using two indexing methods:  
* - A voxel based system (i, j, k), the most intuitive, where i is the fastest varying dim and k is the sloest varying dim.
*   Thus for a given (i, j, k) the value is at (i + j*dim[1] + k*dim[1]*dim[2])
* - A subject based system (x, y, z), where +x is right, +y is anterior, +z is superior (right handed coord system).
*   This system is CENTER pixel/voxel and is the result of a transformation from (i, j, k) and a scaling given by the size of 
*   each voxel in a world unit (eg. mm)
*
* NIfTI provides three alternatives to characterize this transformation:
* 
* METHOD 1 , when header.qform_code = 0  
* Here, no specific orientation difers in [x, y, z], only spatial scaling based on voxel world dimensions.
* This method is NOT the default one, neither it is the most common. It is mainly for bacward compatibility
* to ANALYZE 7.5.
* Thus we simply have:
* x = pixdim[1] * i
* y = pixdim[2] * j
* z = pixdim[3] * k
*
* METHOD 2, the "normal" case, when header.qform_code > 0  
* In this situation, three components are involved in the transformation:
* 1. voxel dimensions (header.pixDims[]) for the spatial scaling
* 2. a rotation matrix, for orientation
* 3. a shift
* Thus, we have:
* [ x ]   [ R11 R12 R13 ] [        header.pixDims[1] * i ]   [ header.qoffset_x ]
* [ y ] = [ R21 R22 R23 ] [        header.pixDims[2] * j ] + [ header.qoffset_y ]
* [ z ]   [ R31 R32 R33 ] [ qfac * header.pixDims[3] * k ]   [ header.qoffset_z ]
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
      // compute the offset based on the previous dim (aka. stride)
      var offset = 1;
      for(var pd=0; pd<d; pd++){
        offset *= header.dims[pd + 1];
      }
      
      var dimensions = {
        length: header.dims[d + 1],
        nameVoxelSpace: voxelSpaceNames[d],
        subjectSpaceName: subjectSpaceNames[d],
        voxelSize: header.pixDims[d + 1],
        offset: offset
      }
      
      metadata.dimensions.push( dimensions )
    }
    
    // Tranformation method to lookup [x, y, z] when we know [i, j, k], aka. kno subject based from voxel based
    metadata.niftiTranfoMethod = header.qform_code > 0 ? 2 : 1;
    
    var extendedMatrix = header.getQformMat();
    console.log( extendedMatrix );
    
    metadata.transformation = {
      voxelDimensions: header.pixDims.slice(1, header.dims[0] + 1),
      voxelDimensionFactors: [1, 1, header.pixDims[0] < 0 ? -1 : 1], // qfac
      rotationMatrix: Algebra.matrixTranspose([ extendedMatrix[0].slice(0, 3), extendedMatrix[1].slice(0, 3), extendedMatrix[1].slice(0, 3)]),
      offsets: [header.qoffset_x, header.qoffset_y, header.qoffset_z ],
    }
    
    
    var voxelToWorld = function(i, j, k){
      var rotationMatrix = metadata.transformation.rotationMatrix;
      var voxelDimensions = metadata.transformation.voxelDimensions;
      var voxelDimensionFactors = metadata.transformation.voxelDimensionFactors;
      var offsets = metadata.transformation.offsets;
      
      var pixDimsWeighted = Algebra.vectorMultiplyMembers(voxelDimensions, voxelDimensionFactors);
      var unRotatedPos = Algebra.vectorMultiplyMembers(pixDimsWeighted, [i, j, k] );
      
      var xyzNoOffset = Algebra.matrixVectorMutiply(rotationMatrix, unRotatedPos );
      var xyz = Algebra.vectorAdd(xyzNoOffset, offsets);
      
      return xyz;
    }

    
    console.log( data );
    console.log( metadata );
    //var xyz000 = voxelToWorld(0, 0, 0);
    //console.log( xyz000 );

    /*
    var extT = Algebra.matrixTranspose( extendedMatrix );
    var worldPos = Algebra.matrixVectorMutiply( extendedMatrix, [0, 0, 0, 1]);
    console.log( worldPos );
    */
    /*
    var transfoMat = mat4.fromValues(extendedMatrix[0][0], extendedMatrix[0][1], extendedMatrix[0][2], extendedMatrix[0][3],
                                     extendedMatrix[1][0], extendedMatrix[1][1], extendedMatrix[1][2], extendedMatrix[1][3],
                                     extendedMatrix[2][0], extendedMatrix[2][1], extendedMatrix[2][2], extendedMatrix[2][3],
                                     extendedMatrix[3][0], extendedMatrix[3][1], extendedMatrix[3][2], extendedMatrix[3][3] );
      */
      
      
    var transfoMat = mat4.fromValues(extendedMatrix[0][0], extendedMatrix[1][0], extendedMatrix[2][0], extendedMatrix[3][0],
                                     extendedMatrix[0][1], extendedMatrix[1][1], extendedMatrix[2][1], extendedMatrix[3][1],
                                     extendedMatrix[0][2], extendedMatrix[1][2], extendedMatrix[2][2], extendedMatrix[3][2],
                                     extendedMatrix[0][3], extendedMatrix[1][3], extendedMatrix[2][3], extendedMatrix[3][3] );
      
                                       
    var voxPos = vec4.fromValues(0, 0, 0, 1);
    var worldPos = vec4.fromValues(0, 0, 0, 0);
    vec4.transformMat4(worldPos, voxPos, transfoMat);
    
    console.log( worldPos );
    console.log( transfoMat );
  }
  
  
  /**
  * [PRIVATE]
  * The header field `scl_slope` is used to scale the data, thus if non-0,
  * we should scale the data.
  * @param {typed array} data - the nifti data array, WILL BE MODIFIED
  * @param {Object} header - nifti header
  */
  _scaleData( data, header ){
    // We dont scale in the case RGB24
    if( header.datatypeCode == nifti.NIFTI1.TYPE_RGB24 ){
      return;
    }
    
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
  
  
  _computeSubjsctBasedCoord( header ){
    
  }
  
} /* END of class NiftiDecoderAlt */

export { NiftiDecoderAlt }
