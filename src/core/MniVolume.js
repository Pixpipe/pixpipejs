/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { Image3D } from './Image3D.js';
import { Image2D } from './Image2D.js';

/**
* MniVolume instance are like Image3D but include some brain things
*/
class MniVolume extends Image3D{


  /**
  * Constructor of an Image3D instance. If no options, no array is allocated.
  * @param {Object} options - if present, must have options.xSize, options.ySize, option.zSize.
  * Also options.ncpp to set the number of components per pixel. (possibly for using time series)
  */
  constructor( options=null ){
    super();
  }


  /**
  * [STATIC]
  * mainly used by the ouside world (like from Nifti)
  */
  static transformToMinc(transform, header) {
    var x_dir_cosines = [];
    var y_dir_cosines = [];
    var z_dir_cosines = [];

    // A tiny helper function to calculate the magnitude of the rotational
    // part of the transform.
    //
    function magnitude(v) {
      var dotprod = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
      if (dotprod <= 0) {
        dotprod = 1.0;
      }
      return Math.sqrt(dotprod);
    }

    // Calculate the determinant of a 3x3 matrix, from:
    // http://www.mathworks.com/help/aeroblks/determinantof3x3matrix.html
    //
    // det(A) = A_{11} (A_{22}A_{33} - A_{23}A_{32}) -
    //          A_{12} (A_{21}A_{33} - A_{23}A_{31}) +
    //          A_{13} (A_{21}A_{32} - A_{22}A_{31})
    //
    // Of course, I had to change the indices from 1-based to 0-based.
    //
    function determinant(c0, c1, c2) {
      return (c0[0] * (c1[1] * c2[2] - c1[2] * c2[1]) -
              c0[1] * (c1[0] * c2[2] - c1[2] * c2[0]) +
              c0[2] * (c1[0] * c2[1] - c1[1] * c2[0]));
    }

    // Now that we have the transform, need to convert it to MINC-like
    // steps and direction_cosines.

    var xmag = magnitude(transform[0]);
    var ymag = magnitude(transform[1]);
    var zmag = magnitude(transform[2]);

    var xstep = (transform[0][0] < 0) ? -xmag : xmag;
    var ystep = (transform[1][1] < 0) ? -ymag : ymag;
    var zstep = (transform[2][2] < 0) ? -zmag : zmag;

    for (var i = 0; i < 3; i++) {
      x_dir_cosines[i] = transform[i][0] / xstep;
      y_dir_cosines[i] = transform[i][1] / ystep;
      z_dir_cosines[i] = transform[i][2] / zstep;
    }

    header.xspace.step = xstep;
    header.yspace.step = ystep;
    header.zspace.step = zstep;

    // Calculate the corrected start values.
    var starts = [transform[0][3],
                  transform[1][3],
                  transform[2][3]
                 ];

    // (bert): I believe that the determinant of the direction
    // cosines should always work out to 1, so the calculation of
    // this value should not be needed. But I have no idea if NIfTI
    // enforces this when sform transforms are written.
    var denom  = determinant(x_dir_cosines, y_dir_cosines, z_dir_cosines);
    var xstart = determinant(starts, y_dir_cosines, z_dir_cosines);
    var ystart = determinant(x_dir_cosines, starts, z_dir_cosines);
    var zstart = determinant(x_dir_cosines, y_dir_cosines, starts);

    header.xspace.start = xstart / denom;
    header.yspace.start = ystart / denom;
    header.zspace.start = zstart / denom;

    header.xspace.direction_cosines = x_dir_cosines;
    header.yspace.direction_cosines = y_dir_cosines;
    header.zspace.direction_cosines = z_dir_cosines;
  };


  /**
  * [STATIC]
  * swap the data to be used from the outside (ie. nifti)
  */
  static swapn(byte_data, n_per_item) {
    for (var d = 0; d < byte_data.length; d += n_per_item) {
      var hi_offset = n_per_item - 1;
      var lo_offset = 0;
      while (hi_offset > lo_offset) {
        var tmp = byte_data[d + hi_offset];
        byte_data[d + hi_offset] = byte_data[d + lo_offset];
        byte_data[d + lo_offset] = tmp;
        hi_offset--;
        lo_offset++;
      }
    }
  }


  /**
  * Initialize a MniVolume with the data and the header.
  * @param {Array} data - TypedArray containing the data
  */
  setData( data, header ){
    console.log(header);

    return;
    var that = this;
    this._data = data;

    this.setMetadata( "position", {} );
    this.setMetadata( "current_time", 0 );

    // copying header into metadata
    var headerKeys = Object.keys(header);
    headerKeys.forEach( function(key){
      that.setMetadata( key, header[key] );
    })

    // find min/max
    this._scanDataRange();

    // set W2v matrix
    this._saveOriginAndTransform();

    // adding some fields to metadata header
    //this._finishHeader()

    console.log(this._metadata);
    console.log(this._data);
  }


  /**
  * [PRIVATE]
  * Look for min and max on the dataset and add them to the header metadata
  */
  _scanDataRange(){
    var min = +Infinity;
    var max = -Infinity;

    this._data.forEach( function(value){
      min = Math.min(min, value);
      max = Math.max(max, value);
    })

    this.setMetadata("voxel_min", min);
    this.setMetadata("voxel_max", max);
  }


  /**
  * [PRIVATE}
  * Calculate the world to voxel transform and save it, so we
  * can access it efficiently. The transform is:
  * cxx / stepx | cxy / stepx | cxz / stepx | (-o.x * cxx - o.y * cxy - o.z * cxz) / stepx
  * cyx / stepy | cyy / stepy | cyz / stepy | (-o.x * cyx - o.y * cyy - o.z * cyz) / stepy
  * czx / stepz | czy / stepz | czz / stepz | (-o.x * czx - o.y * czy - o.z * czz) / stepz
  * 0           | 0           | 0           | 1
  *
  * Origin equation taken from (http://www.bic.mni.mcgill.ca/software/minc/minc2_format/node4.html)
  */
  _saveOriginAndTransform() {

    var xspace = this.getMetadata("xspace");
    var yspace = this.getMetadata("yspace");
    var zspace = this.getMetadata("zspace");

    var startx = xspace.start;
    var starty = yspace.start;
    var startz = zspace.start;
    var cx = xspace.direction_cosines;
    var cy = yspace.direction_cosines;
    var cz = zspace.direction_cosines;
    var stepx = xspace.step;
    var stepy = yspace.step;
    var stepz = zspace.step;

    // voxel_origin
    var o = {
      x: startx * cx[0] + starty * cy[0] + startz * cz[0],
      y: startx * cx[1] + starty * cy[1] + startz * cz[1],
      z: startx * cx[2] + starty * cy[2] + startz * cz[2]
    };

    this.setMetadata("voxel_origin", o);

    var tx = (-o.x * cx[0] - o.y * cx[1] - o.z * cx[2]) / stepx;
    var ty = (-o.x * cy[0] - o.y * cy[1] - o.z * cy[2]) / stepy;
    var tz = (-o.x * cz[0] - o.y * cz[1] - o.z * cz[2]) / stepz;

    var w2v = [
      [cx[0] / stepx, cx[1] / stepx, cx[2] / stepx, tx],
      [cy[0] / stepy, cy[1] / stepy, cy[2] / stepy, ty],
      [cz[0] / stepz, cz[1] / stepz, cz[2] / stepz, tz]
    ];

    this.setMetadata("w2v", w2v);
  }


  /**
  * [PRIVATE]
  * Creates common fields all headers must contain.
  */
  _finishHeader() {
    var xspace = this.getMetadata("xspace");
    var yspace = this.getMetadata("yspace");
    var zspace = this.getMetadata("zspace");

    xspace.name = "xspace";
    yspace.name = "yspace";
    zspace.name = "zspace";

    xspace.width_space  = yspace;
    xspace.width        = yspace.space_length;
    xspace.height_space = zspace;
    xspace.height       = zspace.space_length;

    yspace.width_space  = xspace;
    yspace.width        = xspace.space_length;
    yspace.height_space = zspace;
    yspace.height       = zspace.space_length;

    zspace.width_space  = xspace;
    zspace.width        = xspace.space_length;
    zspace.height_space = yspace;
    zspace.height       = yspace.space_length;
  }


  /**
  * Get the intensity of a given voxel. The position i j k
  */
  getIntensityValue(i, j, k, time) {
    var order = this.getMetadata("order");
    time = time === undefined ? this.getMetadata( "current_time" ) : time;

    if (i < 0 || i >= this.getMetadata( order[0] ).space_length ||
        j < 0 || j >= this.getMetadata( order[1] ).space_length ||
        k < 0 || k >= this.getMetadata( order[2] ).space_length)
    {
        return 0;
    }

    var time_offset = this.hasMetadata( "time" ) ? time * this.getMetadata( "time" ).offset : 0;

    var xyzt_offset = (
      i * this.getMetadata( order[0] ).offset +
      j * this.getMetadata( order[1] ).offset +
      k * this.getMetadata( order[2] ).offset +
      time_offset);

    return this._data[xyzt_offset];
  }





  /**
  * [PRIVATE]
  * Return a slice from the minc cube as a 1D typed array,
  * along with some relative data (slice size, step, etc.)
  * args:
  * @param {String} axis - "xspace", "yspace" or zspace (mandatory)
  * @param {Number} slice_num - index of the slice [0; length-1] (optional, default: length-1)
  * @param {Number} time - index of time (optional, default: 0)
  * TODO: add some method to a slice (get value) because it's a 1D array... and compare with Python
  */
  slice(axis, slice_num = 0, time = 0) {
    if( !this.hasMetadata(axis) ){
      console.warn("The axis " + axis + " does not exist.");
      return null;
    }

    var time_offset = this.hasMetadata("time") ? time * this.getMetadata("time").offset : 0;

    var axis_space = this.getMetadata(axis);
    var width_space = axis_space.width_space;
    var height_space = axis_space.height_space;

    var width = axis_space.width;
    var height = axis_space.height;

    var axis_space_offset = axis_space.offset;
    var width_space_offset = width_space.offset;
    var height_space_offset = height_space.offset;

    // Calling the volume data's constructor guarantees that the
    // slice data buffer has the same type as the volume.
    //
    //var slice_data = new this._data.constructor(width * height);
    var slice_data = new Float32Array(width * height);

    // Rows and colums of the result slice.
    var row, col;

    // Indexes into the volume, relative to the slice.
    // NOT xspace, yspace, zspace coordinates!!!
    var x, y, z;

    // Linear offsets into volume considering an
    // increasing number of axes: (t) time,
    // (z) z-axis, (y) y-axis, (x) x-axis.
    var tz_offset, tzy_offset, tzyx_offset;

    // Whether the dimension steps positively or negatively.
    var x_positive = width_space.step  > 0;
    var y_positive = height_space.step > 0;
    var z_positive = axis_space.step   > 0;

    // iterator for the result slice.
    var i = 0;
    var intensity = 0;
    var intensitySum = 0;
    var min = Infinity;
    var max = -Infinity;

    var maxOfVolume = this.getMetadata("voxel_max");

    z = z_positive ? slice_num : axis_space.space_length - slice_num - 1;
    if (z >= 0 && z < axis_space.space_length) {
      tz_offset = time_offset + z * axis_space_offset;

      for (row = height - 1; row >= 0; row--) {
        y = y_positive ? row : height - row - 1;
        tzy_offset = tz_offset + y * height_space_offset;

        for (col = 0; col < width; col++) {
          x = x_positive ? col : width - col - 1;
          tzyx_offset = tzy_offset + x * width_space_offset;

          intensity = this._data[tzyx_offset];

          min = Math.min(min, intensity);
          max = Math.max(max, intensity);
          intensitySum += intensity;

          slice_data[i++] = intensity;

        }
      }
    }

    var outputImage = new Image2D();
    outputImage.setData(  slice_data, width, height, 1);
    outputImage.setMetadata("min", min);
    outputImage.setMetadata("max", max);
    outputImage.setMetadata("avg", intensitySum / (i-1) );
    return outputImage;

  }



} /* END of class Image3D */

export { MniVolume }
