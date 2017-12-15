/*
* Author   Jonathan Lurie - http://me.jonathanlurie.fr
* License  MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import BVH from 'bvh-tree';
import { CoreTypes } from './CoreTypes.js';
import { PixpipeContainerMultiData } from './PixpipeContainerMultiData.js';


/**
* A Mesh3D object contains the necessary informations to create a 3D mesh
* (for example using ThreeJS) and provide a generic datastructure so that it can accept
* data from arbitrary mesh file format.
*
* **Usage**
* - [examples/fileToMniObj.html](../examples/fileToMniObj.html)
*/
class Mesh3D extends PixpipeContainerMultiData {

  constructor(){
    super();
    this._type = Mesh3D.TYPE();

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

    this._aabb = null;
    this._bvhTree = null;
  }


  /**
  * Hardcode the datatype
  */
  static TYPE(){
    return "MESH3D";
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
    this.setRawData( data, this._datasetNames.vertexPositions );
  }


  /**
  * Get all the vertex positions (a pointer to)
  * @return {TypedArray} the vertex positions
  */
  getVertexPositions(){
    return this.getData( this._datasetNames.vertexPositions );
  }

  /**
  * Get a copy of the vertex positions
  * @return {TypedArray} the vertex positions (deep copy)
  */
  getVertexPositionCopy(){
    return this.getDataCopy( this._datasetNames.vertexPositions );
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
    this.setRawData( data, this._datasetNames.polygonFaces );
  }


  /**
  * Get all polygon faces
  * @return {TypedArray} the vertex positions
  */
  getPolygonFacesOrder(){
    return this.getData( this._datasetNames.polygonFaces );
  }


  /**
  * Get a copy of polygon faces
  * @return {TypedArray} the vertex positions (deep copy)
  */
  getPolygonFacesOrderCopy(){
    return this.getDataCopy( this._datasetNames.polygonFaces );
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
    this.setRawData( data, this._datasetNames.polygonNormals );
  }


  /**
  * Get all polygon faces normal (unit) vectors (a pointer to)
  * @return {TypedArray} the vertex positions
  */
  getPolygonFacesNormals(){
    return this.getData( this._datasetNames.polygonNormals );
  }


  /**
  * Get a copy of polygon faces normal (unit) vectors
  * @return {TypedArray} the vertex positions (deep copy)
  */
  getPolygonFacesNormalsCopy(){
    return this.getDataCopy( this._datasetNames.polygonNormals );
  }


  /**
  * Set the array of vertex colors
  * @param {TypedArray} data - array of index of vertex color as [r, g, b, r, g, b, etc.] or [r, b, g, a, etc.]
  */
  setVertexColors( data ){
    if( data.length % this.getMetadata("componentsPerColor") !== 0){
      console.warn("The array of vertext positions must have a size that is a multiple of the metadata 'componentsPerColor'.");
      return;
    }
    this.setRawData( data, this._datasetNames.vertexColors );
  }


  /**
  * Get all vertex colors (a pointer to)
  * @return {TypedArray} the vertex positions
  */
  getVertexColors(){
    return this.getData( this._datasetNames.vertexColors );
  }


  /**
  * Get a copy of vertex colors
  * @return {TypedArray} the vertex positions (deep copy)
  */
  getVertexColorsCopy(){
    return this.getDataCopy( this._datasetNames.vertexColors );
  }

  /*
  // if vertex colors are RGB then it's 3, if RGBA, then it's 4
  this.setMetadata("componentsPerColor", 4);
  */


  /**
  * Get the number of vertices per shape (3 for triangle, 4 for quads, etc.)
  * @return {Number} the number of vertex involved in each shape
  */
  getNumberOfVerticesPerShapes(){
    return this.getMetadata("verticesPerShapes");
  }


  /**
  * Set the number of vertices per shape (3 for triangle, 4 for quads, etc.)
  * @param {Number} num - the number of vertex involved in each shape
  */
  setNumberOfVerticesPerShapes( num ){
    if( num < 0 ){
      console.warn("The number of vertice per shapes should be positive.");
    }
    this.setMetadata("verticesPerShapes", num);
  }


  /**
  * Get the number of components per color: 3 for RGB, 4 for RGBa
  * @return {Number} number of components per color
  */
  getNumberOfComponentsPerColor(){
    return this.getMetadata("componentsPerColor");
  }


  /**
  * Set the number of components per color: 3 for RGB, 4 for RGBa
  * @param {Number} num - number of components per color
  */
  setNumberOfComponentsPerColor( num ){
    if( num < 0 ){
      console.warn("The number of components per pixel should be positive.");
    }
    this.setMetadata("componentsPerColor", num);
  }


  /**
  * Get the number of vertices in this mesh3D
  * @return {Number}
  */
  getNumberOfVertices(){
    var vertexPos = this.getVertexPositions();
    if( !vertexPos ){
      return null;
    }

    return vertexPos.length / 3;
  }



  // TODO
  generateUniformVertexColor( colorArray ){

  }

  // TODO
  generateFacesNormalsVectors( reverse=false ){

  }


  /**
  * Find the axis aligned bounding box of the mesh.
  * Stores it in this._aabb
  */
  buildBox(){
    var vertices = this.getVertexPositions();

    if( !vertices )
      return;

    var min = new Float32Array([Infinity, Infinity, Infinity]);
    var max = new Float32Array([-Infinity, -Infinity, -Infinity]);

    for(var i=0; i<vertices.length; i+=3){
      min[0] = Math.min( min[0], vertices[i] );
      max[0] = Math.max( max[0], vertices[i] );
      min[1] = Math.min( min[1], vertices[i+1] );
      max[1] = Math.max( max[1], vertices[i+1] );
      min[2] = Math.min( min[2], vertices[i+2] );
      max[2] = Math.max( max[2], vertices[i+2] );
    }

    this._aabb = {
      min: min,
      max: max
    }
  }


  /**
  * Get the bounding box of the mesh
  * @return {Object} the box as {min: [x, y, z], max: [x, y, z]}
  */
  getBox(){
    if( !this._aabb )
      this.buildBox()

    return this._aabb;
  }


  /**
  * Get the center of the bounding box of the mesh
  * @return {Object} the box as {min: [x, y, z], max: [x, y, z]}
  */
  getBoxCenter(){
    if( !this._aabb )
      this.buildBox()

    if( this._aabb ){
      return new Float32Array([(this._aabb.min[0] + this._aabb.max[0])/2, (this._aabb.min[1] + this._aabb.max[1])/2, (this._aabb.min[2] + this._aabb.max[2])/2 ]);
    }else{
      return null;
    }
  }


  /**
  * Builds the Bounding Volume Hierarchy tree. Stores it in this._bvhTree
  */
  buildBvhTree(){
    console.time("bvh")
    var vertices = this.getVertexPositions();
    var faces = this.getPolygonFacesOrder();

    var trianglesCoord = [];//new Array( faces.length / 3 );
    var triCounter = 0;

    // return the nth point as {x, y, z}
    function getPoint(n){
      var v = faces[ n ] * 3;
      var p = {x: vertices[ v ], y: vertices[v +1], z: vertices[v +2]};
      return p;
    }

    for(var i=0; i<faces.length; i+=3){
      var tgl = [
        getPoint(i),
        getPoint(i+1),
        getPoint(i+2)
      ]

      trianglesCoord.push( tgl );
    }

    console.log( trianglesCoord );

    var maxTrianglesPerNode = 7;
    this._bvhTree = new BVH.BVH(trianglesCoord, maxTrianglesPerNode);
    console.timeEnd("bvh")
    console.log( this._bvhTree );
  }


  isInside( pos ){
    if(! this._aabb)
      this.buildBox();

    var isInBox = pos[0] > this._aabb.min[0] && pos[0] < this._aabb.max[0] &&
                  pos[1] > this._aabb.min[1] && pos[1] < this._aabb.max[1] &&
                  pos[2] > this._aabb.min[2] && pos[2] < this._aabb.max[2];

    if( !isInBox )
      return false;

    // if it's in the box, we have to perform a more complex thing

    if(! this._bvhTree )
      this.buildBvhTree();

    var rayOrigin = {x: pos[0], y:pos[1], z:pos[2]};

    // direction of the ray. should be normalized to unit length
    var rayDirection = {x: 0, y: -1, z: 0};

    // if 'true', only intersections with front-faces of the mesh will be performed
    var backfaceCulling = false;

    var intersectionResult = this._bvhTree.intersectRay(rayOrigin, rayDirection, backfaceCulling);
    console.log( intersectionResult );
    return (intersectionResult.length % 2 === 1);
  }

} /* END of class PixpipeContainerMultiData */

// register this type as a CoreType
CoreTypes.addCoreType( Mesh3D );

export { Mesh3D };
