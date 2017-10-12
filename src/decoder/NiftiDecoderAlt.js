/*
* Author    Jonathan Lurie - http://me.jonathanlurie.fr
*
* License   MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import nifti from 'nifti-reader-js';
import { glMatrix, mat2, mat2d, mat3, mat4, quat, vec2, vec3, vec4 } from 'gl-matrix';
import { Filter } from '../core/Filter.js';
import { Image3DAlt } from '../core/Image3DAlt.js';


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
    var numberOfDimensions = header.dims[0];

    // copying all the original metadata into the field "formatSpecific", for the sake of quality.
    metadata.formatSpecific = header;
    metadata.statistics = { upToDate: true, min: "sdfsdf", max: NaN };
    metadata.ncpp = this._fetchNcpp(header);
    metadata.description = header.description;
    metadata.format = "nifti";
    metadata.spatialUnit = header.getUnitsCodeString(nifti.NIFTI1.SPATIAL_UNITS_MASK & header.xyzt_units);
    metadata.temporalUnit = header.getUnitsCodeString(nifti.NIFTI1.TEMPORAL_UNITS_MASK & header.xyzt_units);
    
    // the transformation
    var niftiTransfoMatrix = header.getQformMat(); // the default case (METHOD2)
    if( header.qform_code == 0){  // though sometimes qform_code is 0, then we have to use affine (METHOD3)
      niftiTransfoMatrix = header.affine;
    }
    
    // dimensions info ordered from the fastest varying to the slowest varying
    var voxelSpaceNames = ['k', 'j', 'i', 't'];
    var worldSpaceNames = ['x', 'y', 'z', 't'];
    var dimensions = [];

    for(var d=0; d<numberOfDimensions; d++){
      // compute the stride based on the previous dim
      var stride = 1;
      for(var pd=0; pd<d; pd++){
        stride *= header.dims[pd + 1];
      }

      var dimension = {
        length: header.dims[d + 1],
        widthDimension: -1, // to be filled later
        heightDimension: -1, // to be filled later
        nameVoxelSpace: voxelSpaceNames[d],
        nameWorldSpace: worldSpaceNames[d],
        worldUnitSize: header.pixDims[d + 1],
        stride: stride,
        //direction: niftiTransfoMatrix[d][d] < 0 ? -1 : 1, // to be filled later
      }
      dimensions.push( dimension )
    }

    if( dimensions.length >= 3){
      // dim x has for width  y and for heigth z
      dimensions[0].widthDimension = 1
      dimensions[0].heightDimension = 2;

      // dim y has for width  x and for heigth z
      dimensions[1].widthDimension = 0;
      dimensions[1].heightDimension = 2;

      // dim z has for width  x and for heigth y
      dimensions[2].widthDimension = 0;
      dimensions[2].heightDimension = 1;
    }
    
    /*
    swaping dimensions:
    In some cases, a NIfTI does not respect the orientation from the specfication.
    In order to get the proper orientation, we have to swap some dimensions as 
    well as the corresponding rows in the v2w matrix.
    The criterion to find what dim is suposed to come first, what is supposed to
    be last is direction cosine fron the matrix:
    - the 1st row should be the one with the highest absolute value from all 1st columns
    - the 2nd row should be the one with the highest absolute value from all 2nd columns
    - the 3rd row should be the one with the highest absolute value from all 3rd columns
    */
    
    // give the index of the row that has the highest value among a given col
    function whichRowHasHighestValueFromGivenCol( arrOfArr, col){
      var cx = Math.abs(arrOfArr[0][col]);
      var cy = Math.abs(arrOfArr[1][col]);
      var cz = Math.abs(arrOfArr[2][col]);
      
      if( cx > cy && cx > cz){
        return 0;
      }else if(cy > cx && cy > cz){
        return 1;
      }else{
        return 2
      }
    }
     
    
    
    function getMagnitude( arr ){
      return Math.sqrt( arr[0]*arr[0] + arr[1]*arr[1] + arr[2]*arr[2] );
    }
    
    var shouldBeCol0 = whichRowHasHighestValueFromGivenCol(niftiTransfoMatrix, 0);
    var shouldBeCol1 = whichRowHasHighestValueFromGivenCol(niftiTransfoMatrix, 1);
    var shouldBeCol2 = whichRowHasHighestValueFromGivenCol(niftiTransfoMatrix, 2);
    
    // when we have shouldBeCol[ n ] = m it means that the current original row m 
    // of transfo-matrix should move to the position n
    var shouldBeCol = [ shouldBeCol0, shouldBeCol1, shouldBeCol2 ];
    // this is the inverse lookup of shouldBeCol
    var wasCol = [ shouldBeCol.indexOf(0), shouldBeCol.indexOf(1), shouldBeCol.indexOf(2) ];
    
    console.log("shouldBeCol");
    console.log(shouldBeCol);
    console.log( "wasCol");
    console.log(wasCol);
    
    var transfoMatrixToUse = JSON.parse(JSON.stringify(niftiTransfoMatrix));
    var dimensionsToUse = dimensions;
    
    // ******************* BEGIN TO SWAP ***************************************
    
    // if so, the dimension list and the matrix need swapping
    if( shouldBeCol[0] != 0 || shouldBeCol[1] != 1 || shouldBeCol[2] != 2){
      
      // swap the matrix cols
      for (var i = 0; i < 3; i++) {
        for (var j = 0; j < 4; j++) {
          var volumeAxis = j;
          if (j < 3) {
            volumeAxis = shouldBeCol[j];
          }
          transfoMatrixToUse[i][volumeAxis] = niftiTransfoMatrix[i][j];
        }
      }
      
      // just making a safe copy
      var dimensionsCp = JSON.parse(JSON.stringify(dimensions))

      // renaming it. Then it seems to already be in the correct order. Not sure why?? TODO: see why!
      dimensionsCp[0].nameVoxelSpace = "k";
      dimensionsCp[1].nameVoxelSpace = "j";
      dimensionsCp[2].nameVoxelSpace = "i";
      
      dimensionsCp[wasCol[0]].nameWorldSpace = "x";
      dimensionsCp[wasCol[1]].nameWorldSpace = "y";
      dimensionsCp[wasCol[2]].nameWorldSpace = "z";

      
      
      // associating width and height
      dimensionsCp[wasCol[0]].widthDimension = wasCol[1];
      dimensionsCp[wasCol[0]].heightDimension = wasCol[2];
      dimensionsCp[wasCol[1]].widthDimension = wasCol[0];
      dimensionsCp[wasCol[1]].heightDimension = wasCol[2];
      dimensionsCp[wasCol[2]].widthDimension = wasCol[0];
      dimensionsCp[wasCol[2]].heightDimension = wasCol[1];
      
      

      dimensionsToUse = dimensionsCp;
    }
    // ******************* END OF SWAPING **************************************
    
    // return the dimsniosn object given its world name ('x', 'y' or 'z')
    function getDimensionByWorldName( name ){
      for(var i=0; i<dimensionsToUse.length; i++){
        if(dimensionsToUse[i].nameWorldSpace === name)
          return dimensionsToUse[i];
      }
      return null;
    }
    
    // set the directions
    for(var i=0; i<3; i++){
      var stepSize = getMagnitude( transfoMatrixToUse[i] )
      var directionSign = Math.sign( transfoMatrixToUse[i][i]);
      //dimensionsToUse[i].step = stepSize * directionSign;
      
      // so that when i==0, dimension is x, etc.
      var dimension = getDimensionByWorldName(worldSpaceNames[i])
      dimension.step = stepSize * directionSign;
    }
    
    
    
    metadata.dimensions = dimensionsToUse;
    
    var v2wMat = mat4.fromValues(transfoMatrixToUse[0][0], transfoMatrixToUse[1][0], transfoMatrixToUse[2][0], transfoMatrixToUse[3][0],
                                 transfoMatrixToUse[0][1], transfoMatrixToUse[1][1], transfoMatrixToUse[2][1], transfoMatrixToUse[3][1],
                                 transfoMatrixToUse[0][2], transfoMatrixToUse[1][2], transfoMatrixToUse[2][2], transfoMatrixToUse[3][2],
                                 transfoMatrixToUse[0][3], transfoMatrixToUse[1][3], transfoMatrixToUse[2][3], transfoMatrixToUse[3][3] );

    var w2vMat = mat4.create();
    mat4.invert( w2vMat, v2wMat );

    // register all the transformations available here
    metadata.transformations = {
      v2w: v2wMat,
      w2v: w2vMat
    }
    
    metadata.statistics = {
      upToDate: false,
      min: 0,
      max: 0
    }

    var output = new Image3DAlt();
    output.setRawData( data );
    output.setRawMetadata( metadata );
    
    if(output.metadataIntegrityCheck()){
      console.log( output );
      output.scanDataRange();
      this._output[0] = output;
    }
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
