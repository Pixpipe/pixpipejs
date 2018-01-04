/*
* Author   Jonathan Lurie - http://me.jonathanlurie.fr
* License  MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { Decoder } from "../core/Decoder.js";
import { MniObjParser } from 'mniobjparser';
import { Mesh3D } from '../core/Mesh3D.js';


/**
* When most parser need an ArrayBuffer as input, the MNI OBJ mesh file being text
* files, an instance of MniObjDecoder takes the string content of such files.
* The string content of a file can be provided by a FileToArrayBufferReader or
* UrlToArrayBufferReader with the metadata `readAsText` being true.
* Then use the method `.addInput( myString )` to provide the input and call
* the method `.update()`. If the input is suscceessfully parsed, the output of
* a MniObjDecoder is a Mesh3D. If the file is invalid, a message is probably written
* in the JS console and no output is available.
*
* **Usage**
* - [examples/fileToMniObj.html](../examples/fileToMniObj.html)
*/
class MniObjDecoder extends Decoder {

  /**
  * [STATIC]
  * Overload of the `Decoder` function to precise `MniObjDecoder` works with text based files.
  * @return {Boolean} true is the file typed decoded by this class is binary, false if it's text based.
  */
  static isBinary(){
    return false;
  }


  constructor(){
    super();
    this.setMetadata("targetType", Mesh3D.name);
    //this.addInputValidator(0, string);
    // Adding an input validator with the type string is not possible because
    // a string is not an "instanceof" String unless it is created by the String
    // constructor, what we generaly dont want to do if they are very long.
    // When decoding a file, a string is generally as a DOMString, with is
    // different as String, and we dont want to duplicated that into memory.
  }


  _run(){
    var input = this._getInput();
    var validInput = null;

    if( !input ){
      console.warn("Invalid input for MniObjDecoder");
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
