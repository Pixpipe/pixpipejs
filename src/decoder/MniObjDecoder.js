/*
* Author   Jonathan Lurie - http://me.jonathanlurie.fr
* License  MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { Filter } from "../core/Filter.js";
import { MniObjParser } from 'mniobjparser';
import { Mesh3D } from '../core/Mesh3D.js';


/**
*
*/
class MniObjDecoder extends Filter {
  
  constructor(){
    super();
    //this.addInputValidator(0, string);
  }
  
  
  _run(){
    var input = this._getInput();
    
    //if( !(input instanceof String) ){
    if( typeof input !== "string" ){
      console.warn("The input data for MniObjDecoder ust be a String.");
      return;
    }
    
    var parser = new MniObjParser();
    parser.parse( input )

    // Check if the parsing went ok:
    if( !parser.isValid() ){
      console.warn("Invalid MNI OBJ file.\n" + "ERROR: " + parser.getErrorMessage());
      return;
    }
    
    if( !parser.isPolygon() ){
      console.warn("The MNI OBJ file is valid but does not describe a 3D mesh.");
      return;
    }

    // get the position of all the vertices as [x, y, z, x, y, z, ... ]
    var positions = parser.getRawVertices();  // Float32Array

    // get the index of the vertices involved in faces. These are the index from the "positions" array
    // [index0, index1, index2, index0, index1, index2, ... ] , each are triangles
    var indices = parser.getShapeRawIndices(); // Uint32Array

    // get the list of normal vectors (unit) as [x, y, z, x, y, z, ... ]
    var normals = parser.getRawNormals(); // Float32Array

    // get all the colors per vertex as [r, g, b, a, r, g, b, a, ... ]
    var colors = parser.getRawColors(); // Uint8Array

    // get some material information, not mandatory to reconstruct the mesh
    var surfaceProperties = parser.getSurfaceProperties(); // object
    
    
    var mesh = new Mesh3D();
    mesh.setVertexPositions( positions );
    mesh.setPolygonFacesOrder( indices );
    mesh.setPolygonFacesNormals( normals );
    mesh.setVertexColors( colors );
    mesh.setNumberOfVerticesPerShapes( 3 ); // here
    mesh.setNumberOfComponentsPerColor( 4 );
    
    this._output[0] = mesh;
  }
  
  
} /* END of class Filter */

export { MniObjDecoder };
