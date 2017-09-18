# Metadata object
The metadata format adopted in `Image3DAlt` appears to be generic enough to be used in Image2D. The following description is a minimalist list. To this list should be added any custom metadata relevant to one's application.  
Here is how it looks like:

```javascript
var metadata = {

  // {Object}
  // contains all the fields inherited from a file parser (eg. NIfTI),
  // so that all the data are still here, even though not in a easy-to-read format
  formatSpecific: {},

  // {Number}
  // number of components per pixel/voxel, 1 if grey level, 3 if RGB, 4 if RGBa, etc.
  ncpp: 1,

  // {String}
  // a simple description of the data
  description: "",

  // {String}
  // Tells from what format it comes, can be "nifti" if comes from a nifti parser
  format: "",

  // {String}
  // The unit for all the spatial dimensions. Just informative
  spatialUnit: "Voxel" | "Millimeters",

  // {String}
  // The unit for the time dimensions (if any). Just informative
  temporalUnit: "Time" | "Seconds",

  // {Object}
  // Give all the informations necessary about the dimensions present in the data.
  // The first information to get is the order within the Array. The first being the
  // fastest varying and the last being the slowest varying.
  dimensions: [

    // {Object}
    // A single dimension object contains (at least) the following fields:
    {
      // {Number}
      // the length of this dimension, the number of elements it carries, no matter
      // if temporal or spatial
      length: 176,

      // {Number}
      // If this dimension is time, leave it to -1.
      // Otherwise, is the length of one of the two dimension that is spatially orthogonal to
      // the current one.
      width: 256,

      // {Number}
      // If this dimension is time, leave it to -1.
      // Otherwise, is the length of one of the two dimension that is spatially orthogonal to
      // the current one (the one that was not used for the "width" value)
      height: 256,

      // {String}
      // Name of this dimension in voxel space. This is not of big importance unless the dataset
      // has to follow some strict rules (eg. NIfTI).
      nameVoxelSpace: "i",

      // {String}
      // Name of this dimension in world (or subject) space. This is not of big importance unless the dataset
      // has to follow some strict rules (eg. NIfTI)
      // Notice: It is very possible that a dataset does not use any reference to "world" or "subject"-based coordinates.
      nameWorldSpace: "x",

      // {Number}
      // Size of an element of this dimension (eg. a voxel if spatial, a time unit if temporal)
      // in world coordinate, using the unit defined with the fields "spatialUnit" and/or "temporalUnit" (eg. seconds, mm, etc.)
      // Notice: It is very possible that a dataset does not use any reference to "world" or "subject"-based coordinates.
      worldUnitSize: 1,

      // {Number}
      // Step relative to the dimensionality of the dataset. Number of element to jump of
      // to get the next consecutive element of this same dimensions.
      // Notice: this is computed by a parser if the dataset comes from one, or computed by the Image3DAlt's
      // constructor if initialized with dimensions.
      stride: 1
    },

    // A second dimension
    {
    // ...
    },

    // A third dimension
    {
    // ...
    },

    // Possibly a fourth temporal dimension
    {
    // ...
    }
  ],

  // {Object}
  // A set of transformation matrix (4x4 for 3D datasets, possibly 3x3 if also used for Image2D)
  // to lookup some positions in an alternative coordinate system (eg. world or subject-based).
  // These are not intended to alter the data, just lookup
  // (in the future, some Filters might possibly use these matrix to generate a different dataset,
  // but this is a different story)
  transformations: {

    // {Float32Array}
    // The matrix is using the format of glMatrix (see http://glmatrix.net), meaning they
    // are internaly column-major with 16 elements.
    // The name is based upon what it does and does not really matter as long as it makes sense.
    // For example, the name "v2w" for "voxel to world" or "w2v" is what is created by the NIfTI parser
    "nameForward": [],

    // {Float32Array}
    // Like the other one, but in this example, this is the inverse matrix to perform the backward
    // transformation. Having an inverse is not mandatory and is just for the sake of this example.
    "nameBackward": []
  },


  // ADD ANY OTHER FIELD YOU NEED

}
```
