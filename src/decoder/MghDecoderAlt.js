/*
* Author    Jonathan Lurie - http://me.jonathanlurie.fr
*           Robert D. Vincent
*
* License   MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import pako from 'pako';
import { Decoder } from '../core/Decoder.js';
import { Image3DAlt } from '../core/Image3DAlt.js';
import { Image3DMetadataConverter } from '../utils/Image3DMetadataConverter.js';

/**
* Decodes a MGH file.
* Takes an ArrayBuffer as input (0) and output a `MniVolume` (which inherit `Image3D`).
*
* **Usage**
* - [examples/fileToMgh.html](../examples/fileToMgh.html)
*/
class MghDecoderAlt extends Decoder {

  constructor() {
    super();
    this.addInputValidator(0, ArrayBuffer);
    this.setMetadata("debug", false);
  }


  /* Function to parse the basic MGH header. This is a 284-byte binary
   * object that begins at offset zero in the file.
   * The resulting header object will contain the following fields:
   *
   * header.order[] - An array of strings that gives the order of the
   * spatial dimensions.
   * header.xspace - Description of the X axis (patient left to right)
   * header.yspace - Description of the Y axis (patient posterior to anterior)
   * header.zspace - Description of the Z axis (patient inferior to superior)
   * header.time - Description of time axis, if any.

   * Non-standard fields used internally only:
   *
   * header.nvoxels - Total number of voxels in the image.
   * header.datatype - MGH data type of image.
   * header.little_endian - True if data is little endian (should be false!)
   */
  _parseMGHHeader(raw_data, callback) {
    var header = {
      order: ["xspace", "yspace", "zspace"],
      xspace: {},
      yspace: {},
      zspace: {}
    };
    var error_message;
    var dview = new DataView(raw_data, 0, 284);
    var little_endian = true;

    /* Read the header version, which should always have the value
     * 0x00000001. We use this to test the endian-ness of the data,
     * but it should always be big-endian.
     */
    var hdr_version = dview.getUint32(0, true);
    if (hdr_version === 0x00000001) {
      little_endian = true;
    } else if (hdr_version === 0x01000000) {
      little_endian = false;    // Generally files are big-endian.
    }
    else {
      console.warn( "This does not look like an MGH file." );
      return null;
    }

    /* Now read the dimension lengths. There are at most 4 dimensions
     * in the file. The lengths fields are always present, but they
     * unused dimensions may have the value 0 or 1.
     */
    var ndims = 0;
    var sizes = [0, 0, 0, 0];
    var header_offset = 4;
    var nvoxels = 1;
    for (ndims = 0; ndims < 4; ndims++) {
      sizes[ndims] = dview.getUint32(header_offset, little_endian);
      if (sizes[ndims] <= 1) {
        break;
      }
      nvoxels *= sizes[ndims];
      header_offset += 4;
    }

    if (ndims < 3 || ndims > 4) {
      console.warn( "Cannot handle " + ndims + "-dimensional images yet." );
      return null;
    }

    var datatype = dview.getUint32(20, little_endian);
    // IGNORED var dof = dview.getUint32(24, little_endian);
    var good_transform_flag = dview.getUint16(28, little_endian);
    var spacing = [1.0, 1.0, 1.0];
    var i, j;
    var dircos = [
      [-1.0,  0.0,  0.0],
      [ 0.0,  0.0, -1.0],
      [ 0.0,  1.0,  0.0],
      [ 0.0,  0.0,  0.0]
    ];
    if (good_transform_flag) {
      header_offset = 30;
      for (i = 0; i < 3; i++) {
        spacing[i] = dview.getFloat32(header_offset, little_endian);
        header_offset += 4;
      }
      for (i = 0; i < 4; i++) {
        for (j = 0; j < 3; j++) {
          dircos[i][j] = dview.getFloat32(header_offset, little_endian);
          header_offset += 4;
        }
      }
    }

    if ( this._metadata.debug ) {
      // Prints out the transform in a format similar to the output
      // of FreeSurfer's mri_info tool.
      //
      for (i = 0; i < 3; i++) {
        var s1 = "";
        for (j = 0; j < 4; j++) {
          s1 += "xyzc"[j] + "_" + "ras"[i] + " " + dircos[j][i] + " ";
        }
      }
    }

    var axis_index_from_file = [0, 1, 2];

    for ( var axis = 0; axis < 3; axis++) {
      var spatial_axis = 0;
      var c_x = Math.abs(dircos[axis][0]);
      var c_y = Math.abs(dircos[axis][1]);
      var c_z = Math.abs(dircos[axis][2]);

      header.order[axis] = "xspace";
      if (c_y > c_x && c_y > c_z) {
        spatial_axis = 1;
        header.order[axis] = "yspace";
      }
      if (c_z > c_x && c_z > c_y) {
        spatial_axis = 2;
        header.order[axis] = "zspace";
      }
      axis_index_from_file[axis] = spatial_axis;
    }

    /* If there are four dimensions, assume the last is the time
     * dimension. I use default values for step and start because as
     * far as I know MGH files do not carry any descriptive
     * information about the 4th dimension.
     */
    if (ndims === 4) {
      if (this._metadata.debug) {
        console.log("Creating time dimension: " + sizes[3]);
      }
      header.time = {
        space_length: sizes[3],
        step: 1,
        start: 0,
        name: "time"
      };
      header.order.push("time");
    }

    /** This is here because there are two different ways of interpreting
      * the origin of an MGH file. One can ignore the offsets in the
      * transform, using the centre of the voxel grid. Or you can correct
      * these naive grid centres using the values stored in the transform.
      * The first approach is what is used by surface files, so to get them
      * to register nicely, we want ignore_offsets to be true. However,
      * getting volumetric files to register correctly implies setting
      * ignore_offsets to false.
      */
    var ignore_offsets = false;
    var mgh_xform = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ];
    for (i = 0; i < 3; i++) {
      for (j = 0; j < 3; j++) {
        mgh_xform[i][j] = dircos[j][i] * spacing[i];
      }
    }

    for (i = 0; i < 3; i++) {
      var temp = 0.0;
      for (j = 0; j < 3; j++) {
        temp += mgh_xform[i][j] * (sizes[j] / 2.0);
      }

      if (ignore_offsets) {
        mgh_xform[i][4 - 1] = -temp;
      }
      else {
        mgh_xform[i][4 - 1] = dircos[4 - 1][i] - temp;
      }
    }

    var transform = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ];

    for (i = 0; i < 3; i++) {
      for (j = 0; j < 4; j++) {
        var volume_axis = j;
        if (j < 3) {
          volume_axis = axis_index_from_file[j];
        }
        transform[i][volume_axis] = mgh_xform[i][j];
      }
    }

    // Now that we have the transform, need to convert it to MINC-like
    // steps and direction_cosines.

    Image3DMetadataConverter.transformToMinc(transform, header);

    // Save the datatype so that we can refer to it later.
    header.datatype = datatype;
    header.little_endian = little_endian;
    header.nvoxels = nvoxels;

    // Save the voxel dimension lengths.
    for (i = 0; i < 3; i++) {
      header[header.order[i]].space_length = sizes[i];
    }

    return header;
  }


  _createMGHData(header, raw_data) {

    var native_data = null;
    var bytes_per_voxel = 1;

    switch (header.datatype) {
    case 0:                     // Unsigned characters.
      bytes_per_voxel = 1;
      break;
    case 1:                     // 4-byte signed integers.
    case 3:                     // 4-byte float.
      bytes_per_voxel = 4;
      break;
    case 4:                     // 2-byte signed integers.
      bytes_per_voxel = 2;
      break;
    default:
      console.warn( "Unsupported data type: " + header.datatype );
      return null;
    }

    var nbytes = header.nvoxels * bytes_per_voxel;

    if (bytes_per_voxel > 1 && !header.little_endian) {
      Image3DMetadataConverter.swapn( new Uint8Array(raw_data, 284, nbytes), bytes_per_voxel );
    }

    switch (header.datatype) {
    case 0:                     // unsigned char
      native_data = new Uint8Array(raw_data, 284, header.nvoxels);
      break;
    case 1:                     // signed int
      native_data = new Int32Array(raw_data, 284, header.nvoxels);
      break;
    case 3:
      native_data = new Float32Array(raw_data, 284, header.nvoxels);
      break;
    case 4:                     // signed short
      native_data = new Int16Array(raw_data, 284, header.nvoxels);
      break;
    }

    // Incrementation offsets for each dimension of the volume. MGH
    // files store the fastest-varying dimension _first_, so the
    // "first" dimension actually has the smallest offset. That is
    // why this calculation is different from that for NIfTI-1.
    //
    var offset = 1;
    for (var d = 0; d < header.order.length; d++) {
      header[header.order[d]].offset = offset;
      offset *= header[header.order[d]].space_length;
    }
    return native_data;

  }


  _run(){
    var inputBuffer = this._getInput(0);

    if(!inputBuffer){
      console.warn("MghDecoderAlt requires an ArrayBuffer as input \"0\". Unable to continue.");
      return;
    }

    var header = null;

    try{
      header = this._parseMGHHeader( inputBuffer );
    }catch(e){
      //console.warn( e );
    }


    // abort if header not valid
    if(!header){
      console.log("The input file is not a MGH file.");
      return;
    }



    var dataArray = this._createMGHData(header, inputBuffer)

    if(!dataArray)
      return null;


    /*
    // add the output to this filter
    this._addOutput(MniVolume);
    var mniVol = this.getOutput();
    mniVol.setData(dataArray, header);
    mniVol.setMetadata("format", "mgh");
    */


    var metadata = Image3DMetadataConverter.convertImage3DMetadata( header );

    // ********** SWAPPING DIM *************

    var dims = metadata.dimensions;
    dims.sort( function(a, b){
      return a.stride < b.stride;
    })

    // return the dimsniosn object given its world name ('x', 'y' or 'z')
    function getDimensionByWorldName( name ){
      for(var i=0; i<dimensionsToUse.length; i++){
        if(dimensionsToUse[i].nameWorldSpace === name)
          return dimensionsToUse[i];
      }
      return null;
    }

    function getWidthDimension( directionDim ){
      return directionDim === "x" ? "y" : directionDim === "y" ? "x" : directionDim === "z" ? "x" : null;
    }

    function getHeightDimension( directionDim ){
      return directionDim === "x" ? "z" : directionDim === "y" ? "z" : directionDim === "z" ? "y" : null;
    }

    function getDimIndexByDimName( dimName ){
      for(var i=0; i<dims.length; i++){
        if( dims[i].nameWorldSpace === dimName )
          return i;
      }
      return -1;
    }

    for(var i=0; i<dims.length; i++){
      var dimName = dims[i].nameWorldSpace;
      dims[i].heightDimension = getDimIndexByDimName( getHeightDimension( dimName ) );
      dims[i].widthDimension = getDimIndexByDimName( getWidthDimension( dimName ) );
    }


    // ********** END OF SWAPPING **********



    var output = new Image3DAlt();
    output.setRawData( dataArray );
    output.setRawMetadata( metadata );

    if(output.metadataIntegrityCheck()){
      output.scanDataRange();
      this._output[0] = output;
    }

  }

} /* END of class MghDecoderAlt */

export { MghDecoderAlt };
