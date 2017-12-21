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
    this._triangleList = null;
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
  * Build the list of triangles
  */
  buildTriangleList_ORIG(){
    console.time("buildTriangleList");
    var vertices = this.getVertexPositions();
    var faces = this.getPolygonFacesOrder();
    this._triangleList = new Array( faces.length / 3 );
    var counter = 0;

    for(var i=0; i<faces.length; i+=3){
      var tgl = [
        {x: vertices[ faces[ i ] * 3 ], y: vertices[faces[ i ] * 3 +1], z: vertices[faces[ i ] * 3 +2]},
        {x: vertices[ faces[ i+1 ] * 3 ], y: vertices[faces[ i+1 ] * 3 +1], z: vertices[faces[ i+1 ] * 3 +2]},
        {x: vertices[ faces[ i+2 ] * 3 ], y: vertices[faces[ i+2 ] * 3 +1], z: vertices[faces[ i+2 ] * 3 +2]}
      ]

      this._triangleList[ counter ] = tgl;
      counter++;
    }
    console.timeEnd("buildTriangleList");
  }


  /**
  * Build the list of triangles
  */
  buildTriangleList(){
    console.time("buildTriangleList");
    var vertices = this.getVertexPositions();
    var faces = this.getPolygonFacesOrder();
    this._triangleList = new Float32Array( faces.length * 3 );
    var counter = 0;

    for(var i=0; i<faces.length; i+=3){

      this._triangleList[ i*3    ] = vertices[ faces[ i ] * 3 ];      // V0x
      this._triangleList[ i*3 +1 ] = vertices[faces[ i ] * 3 +1];     // V0y
      this._triangleList[ i*3 +2 ] = vertices[faces[ i ] * 3 +2];     // V0z
      this._triangleList[ i*3 +3 ] = vertices[ faces[ i+1 ] * 3 ];    // V1x
      this._triangleList[ i*3 +4 ] = vertices[faces[ i+1 ] * 3 +1];   // V1y
      this._triangleList[ i*3 +5 ] = vertices[faces[ i+1 ] * 3 +2];   // V1z
      this._triangleList[ i*3 +6 ] = vertices[ faces[ i+2 ] * 3 ];    // V2x
      this._triangleList[ i*3 +7 ] = vertices[faces[ i+2 ] * 3 +1];   // V2y
      this._triangleList[ i*3 +8 ] = vertices[faces[ i+2 ] * 3 +2];   // V2z

      /*
      Explanations:
      the elements from the "faces" array should be group by 3.
      faces[ i ] gives the index of the 1st vertex
      faces[ i+1 ] gives the index of the 2nd vertex
      faces[ i+2 ] gives the index of the 3rd vertex

      In order to lookup the vertex positions, we have to multiply by 3 so that
      faces[ i ] becomes faces[ i ] * 3 when used as an index of the vertices array.
      This is because each vertex is composed of 3 values (x, y, z).

      This gives the x positions, then to get the y and z we have to add 1 and 2.
      This is why faces[ i ] * 3 becomes faces[ i ] * 3 +1 to get the y position.

      */

    }
    console.timeEnd("buildTriangleList");
  }


  /**
  * Update the color of the 3 vertices of a triangle, given the index of a triangle
  * @param {Number} index - index of the triangle
  * @param {Array} color - as [R, G, B] or [R, G, B, A]
  */
  updateColorTriangle( index, color ){
    var componentsPerColor = this._metadata.componentsPerColor;

    if(componentsPerColor != color.length){
      console.warn("The given color array must have the same number of component than the mesh (=" +componentsPerColor+ ")");
      return;
    }

    var colors = this.getVertexColors();
    var faces = this.getPolygonFacesOrder();

    if(index < 0 || index >= faces.length/3){
      console.warn("The triangle index is out of bounds.");
      return;
    }

    index *= 3;

    // for each color component
    for(var i=0; i<componentsPerColor; i++){
      colors[ faces[ index ] * componentsPerColor + i] = color[i];
      colors[ faces[ index +1 ] * componentsPerColor + i] = color[i];
      colors[ faces[ index +2 ] * componentsPerColor + i] = color[i];
    }
  }


  /**
  * Builds the Bounding Volume Hierarchy tree. Stores it in this._bvhTree
  */
  buildBvhTree(){
    if( ! this._triangleList )
      this.buildTriangleList();

    console.time("buildBvhTree");
    var maxTrianglesPerNode = 4;
    this._bvhTree = new BVH.BVH(this._triangleList, maxTrianglesPerNode);
    console.timeEnd("buildBvhTree");
  }


  /**
  * Test if the given point is inside the mesh.
  * Note: this is perform by throwing a ray from the given point and testing intersections
  * with triangles using a BVH.
  * @param {Array} pos - position such as [x, y, z]
  * @return {Boolean} true if inside, false if outside.
  */
  isInside( pos ){
    if(! this._aabb)
      this.buildBox();

    var isInBox = pos[0] > this._aabb.min[0] && pos[0] < this._aabb.max[0] &&
                  pos[1] > this._aabb.min[1] && pos[1] < this._aabb.max[1] &&
                  pos[2] > this._aabb.min[2] && pos[2] < this._aabb.max[2];

    if( !isInBox )
      return false;

    var intersection = this.intersectRay( pos, [1, 0, 0], false );

    if( !intersection )
      return false;

    return (intersection.length % 2 === 1);
  }


  /**
  * Perform an intersection between a given ray and the mesh
  * @param {Array} origin - starting point of the ray as [x, y, z]
  * @param {Array} direction - normal vector of the ray direction as [x, y, z]
  * @param {Boolean} backfaceCulling - true: ignore triangles with a normal going the same dir as the ray, false: considere all triangles
  * @return {Array} all the intersections or null if none
  */
  intersectRay( origin, direction, backfaceCulling=false ){
    // if it's in the box, we have to perform a more complex thing
    if(! this._bvhTree )
      this.buildBvhTree();

    var rayOrigin = {x: origin[0], y: origin[1], z: origin[2]};
    var rayDirection = {x: direction[0], y: direction[1], z: direction[2]};
    var intersectionResult = this._bvhTree.intersectRay(rayOrigin, rayDirection, backfaceCulling);
    return intersectionResult;
  }

  /**
  * performs the intersection between a the mesh and a box to retrieve the list of triangles
  * that are in the box. A triangle is considered as "in the box" when all its vertices
  * are in the box.
  * @param {Object} box - the box to test the intersection on as {min:[x, y, z], max:[x, y, z]}
  * @return {Array} all the intersections or null if none
  */
  intersectBox( box ){
    // if it's in the box, we have to perform a more complex thing
    if(! this._bvhTree )
      this.buildBvhTree();

    var intersectionResult = this._bvhTree.intersectBox(box);
    return intersectionResult;
  }


  /**
  * performs the intersection between a the mesh and a sphere to retrieve the list of triangles
  * that are in the sphere. A triangle is considered as "in the sphere" when all its vertices
  * are in the sphere.
  * @param {Object} sphere - the sphere to test the intersection with as {center:[x, y, z], radius:Number}
  * @return {Array} all the intersections or null if none
  */
  intersectSphere( sphere ){
    // if it's in the box, we have to perform a more complex thing
    if(! this._bvhTree )
      this.buildBvhTree();

    var intersectionResult = this._bvhTree.intersectSphere(sphere);
    return intersectionResult;
  }




} /* END of class PixpipeContainerMultiData */

// register this type as a CoreType
CoreTypes.addCoreType( Mesh3D );

export { Mesh3D };
