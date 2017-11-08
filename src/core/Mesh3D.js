/*
* Author   Jonathan Lurie - http://me.jonathanlurie.fr
* License  MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


import { PixpipeContainerMultiData } from './PixpipeContainerMultiData.js';


/**
* A Mesh3D object contains the necessary informations to create a 3D mesh
* (for example using ThreeJS) and provide a generic datastructure so that it can accept
* data from arbitrary mesh file format.
*/
class Mesh3D extends PixpipeContainerMultiData {
  
  constructor(){
    super();
    
    // the number of vertices per shapes, 3 for triangles, 4 for quads, etc.
    this.setMetadata("verticesPerShapes", 3);
    
    // if vertex colors are RGB then it's 3, if RGBA, then it's 4
    this.setMetadata("componentsPerColor", 4);
    
    // to build a mesh, we need at least...
    var mandatoryDataset = this.getMetadata("mandatoryDataset");
    
    this._datasetNames = {
      vertexPositions: "vertexPositions",
      polygonFaces: "polygonFaces",
      polygonNormals: "polygonNormals",
      vertexColors: "vertexColors"
    }
    
    // .. a linear array of vertex positions like [x, y, z, x, y, z, ... ]
    mandatoryDataset.push( this._datasetNames.vertexPositions );
    
    // .. the ordering of vertices using indexes of the "vertexPositions" array.
    // this is related to the metadata "verticesPerShapes"
    mandatoryDataset.push( this._datasetNames.polygonFaces );
    
    // .. normal vectors (unit) per face as [x, y, z, x, y, z, ... ]
    mandatoryDataset.push( this._datasetNames.polygonNormals );
  }
  
  
  /**
  * Set the array of vertex positions
  * @param {TypedArray} data - array vertex positions (does not perform a deep copy). The size of this array must be a multiple of 3
  */
  setVertexPositions( data ){
    if( data.length % 3 !== 0){
      console.warn("The array of vertex positions has a non-multiple-of-three size.");
      return;
    }
    this.setRawData( d, this._datasetNames.vertexPositions );
  }
  
  
  getVertexPositions(){
    
  }
  
  
  /**
  * Set the array of polygon faces
  * @param {TypedArray} data - array of index of vertex positions index
  */
  setPolygonFacesOrder( data ){
    if( data.length % this.getMetadata("verticesPerShapes") !== 0){
      console.warn("The array of vertext positions must have a size that is a multiple of the metadata 'verticesPerShapes'.");
      return;
    }
    this.setRawData( d, this._datasetNames.polygonFaces );
  }
  
  
  /**
  * Set the array of polygon faces normal (unit) vectors
  * @param {TypedArray} data - array of index of vertex positions index
  */
  setPolygonFacesNormals( data ){
    if( data.length % 3 !== 0){
      console.warn("The array of vertext positions must have a size that is a multiple of 3.");
      return;
    }
    this.setRawData( d, this._datasetNames.polygonNormals );
  }
  
  
  /**
  * Set the array of vertex colors
  * @param {TypedArray} data - array of index of vertex color as [r, g, b, r, g, b, etc.] or [r, b, g, a, etc.]
  */
  setVertexColors( data ){
    if( data.length % this.getMetadata("vertexColors") !== 0){
      console.warn("The array of vertext positions must have a size that is a multiple of the metadata 'vertexColors'.");
      return;
    }
    this.setRawData( d, this._datasetNames.vertexColors );
  }
  
  
  
  
} /* END of class PixpipeContainerMultiData */

export { PixpipeContainerMultiData };
