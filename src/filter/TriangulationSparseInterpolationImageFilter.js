/*
* Author    Jonathan Lurie - http://me.jonathanlurie.fr
*
* License   MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


import { Filter } from '../core/Filter.js';
import { Image2D } from '../core/Image2D.js';

import Delaunay from 'delaunay-fast';

/**
* An instance of TriangulationSparseInterpolationImageFilter performs a triangulation
* of an original dataset followed by a barycentric 2D interpolation. It is used to
* perform a 2D linear interpolation of a sparse dataset.
* The original dataset is specified using the method `.addInput( seeds, "seeds" )`, where
* `seeds` is an `Array` of `{x: Number, y: Number, value: Number}`.
* The triangulation is the result of a Delaunay triangulation.
* This filter outputs an `Image2D` with interpolated values only within the boundaries
* of the convex hull created by the triangulation. The size of the output must be
* specified using the method `.setMetadata( "outputSize", {width: Number, height: Number})`.
*
* Note 1: at least 3 unaligned points are required to perform a triangulation
* Note 2: points can be outside the boundaries of the original image
* Note 3: interpolated values are floating point
*
* Note that only single-component images are outputed from this filter.
*
* **Usage**
* - [examples/TriangleSparseInterpolation.html](../examples/TriangleSparseInterpolation.html)
*/

class TriangulationSparseInterpolationImageFilter extends Filter {

  constructor(){
    super()
    this.setMetadata( "outputSize", {width: 0, height: 0})
  }

  _run(){

    var seeds = this._getInput("seeds");

    // getting the input
    if( !seeds ){
      console.warn("No input point set were given.");
      return;
    }

    var outputSize = this.getMetadata( "outputSize" );

    // checking output size
    if( outputSize.width == 0 || outputSize.height == 0 ){
      console.warn("The output size cannot be 0.");
      return;
    }

    // look for min max. With IDW the min and max of the end image are the
    // min and max of the seeds. It's always less expansive than looping all the image...
    var min = +Infinity;
    var max = -Infinity;
    for(var i=0; i<seeds.length; i++){
      min = Math.min(min, seeds[i].value);
      max = Math.max(max, seeds[i].value);
    }

    // remapping the point as an array of ArrayBuffer
    var points = seeds.map( function(p){
      return [p.x, p.y];
    })

    // computing the list of triangles
    var triangleVertices = Delaunay.triangulate( points );

    // rearranging the triangles in a propper array that group by 3 the index of vertices used
    var triangles = [];
    for(var i=0; i<=triangleVertices.length-3; i+=3){
      triangles.push( [
        triangleVertices[i],
        triangleVertices[i+1],
        triangleVertices[i+2],
      ] );
    }

    console.log( points );
    console.log( triangles );

    // return the area of a triangle using Heron's formula
    // Each point A, B and C is a couple of 2D coords like [Number, Number]
    function getTriangleArea(A, B, C){
      // manhattan distances
      var _AB = [ A[0] - B[0], A[1] - B[1]];
      var _BC = [ B[0] - C[0], B[1] - C[1]];
      var _CA = [ C[0] - A[0], C[1] - A[1]];

      // Euclidian distances - Pythagore
      var a = Math.sqrt( _BC[0]*_BC[0] + _BC[1]*_BC[1] );
      var b = Math.sqrt( _CA[0]*_CA[0] + _CA[1]*_CA[1] );
      var c = Math.sqrt( _AB[0]*_AB[0] + _AB[1]*_AB[1] );

      // semiperimeter
      var s = (a + b + c) / 2;
      var area = Math.sqrt( s*(s-a)*(s-b)*(s-c) );

      return area || 0;
    }

    // creating the output image
    var out = new pixpipe.Image2D({width: Math.round(outputSize.width), height: Math.round(outputSize.height), color: [0]})

    var previousValue = 0;

    // each line of the output image...
    for(var i=0; i<outputSize.width; i++){
      // each column of the output image...
      for(var j=0; j<outputSize.height; j++){

        var pixelValue = 0;
        var isInsideTriangle = false;
        var encompassingTriangle = 0;

        // each triangle...
        for(var t=0; t<triangles.length; t++){
          var tri = [
            points[ triangles[t][0] ],
            points[ triangles[t][1] ],
            points[ triangles[t][2] ]
          ]

          var contain = Delaunay.contains( tri, [ i, j ] );

          if( contain ){
            isInsideTriangle = true;
            encompassingTriangle = triangles[ t ];
            break;
          }
        }

        if( isInsideTriangle ){
          // vectices of the emcompassing triangle
          var _A = points[ encompassingTriangle[0] ];
          var _B = points[ encompassingTriangle[1] ];
          var _C = points[ encompassingTriangle[2] ];

          // current point of the image
          var _P = [ i, j ];

          // area of the emcompassing triangle (made only from points of the original dataset)
          var areaTriEncomp = getTriangleArea( _A, _B, _C );

          // area of each subtriangles.
          var areaABP = getTriangleArea( _A, _B, _P );
          var areaBCP = getTriangleArea( _B, _C, _P );
          var areaCAP = getTriangleArea( _C, _A, _P );


          if( isNaN(pixelValue) )
            console.log("NANNANANA");

          pixelValue = (areaABP / areaTriEncomp) * seeds[ encompassingTriangle[2] ].value +
                       (areaBCP / areaTriEncomp) * seeds[ encompassingTriangle[0] ].value +
                       (areaCAP / areaTriEncomp) * seeds[ encompassingTriangle[1] ].value ;

        }

        out.setPixel( {x: i, y: j}, [ pixelValue ] );
        previousValue = pixelValue;
      }
    }

    out.setMetadata( "min", min );
    out.setMetadata( "max", max );
    this._output[ 0 ] = out;
  } // en of _run


} /* END of class TriangulationSparseInterpolationImageFilter */

export { TriangulationSparseInterpolationImageFilter }
