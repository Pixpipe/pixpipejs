/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { PixpipeContainer } from './PixpipeContainer.js';


/**
* A LineString is a vectorial reprensation of a line or polyline, open or closed.
* When closed, it can be considered as a polygon.  
* By default, a LineString is 2 dimensional but the dimension can be changed when
* using the `.setData(...)` method or before any point addition with `.setNod()`.
* To close a LineString, use `.setMetadata("closed", true);`, this will not add
* any point but will flag this LineString as "closed".
*
*/
class LineString extends PixpipeContainer {
  
  constructor() {
    super();
    this.setMetadata("closed", false);
    this.setMetadata("defaultNod", 2);
    this.setMetadata("nod", 2);
    
    this._type = LineString.TYPE();
    
    // local record for saving the last point
    this._lastPoint = null;
  }
  
  
  /**
  * Hardcode the datatype
  */
  static TYPE(){
    return "LINESTRING";
  }
  
  
  /**
  * Set/replace the point data.
  * @param {points} points - 1D array containing coord [x, y, x, y, x, y, ...]
  * @param {Number} nod - Number of Dimensions, default = 2
  * @param {Boolean} deepCopy - pointer copy if false, deep copy if true.
  */
  setData(points, nod=-1, deepCopy=false){
    if( nod != -1){
      this.setMetadata("nod", nod);
    }
    
    if(points.length % this.getMetadata("nod") != 0 ){
      console.warn("The number of points is not compatible with the number of dimensions (nod).");
      return;
    }
    
    if(deepCopy){
      this._data = new points.constructor( points );
    }else{
      this._data = points;
    }
    
    this._setLastPoint();
  }
  
  
  /**
  * Define the number of dimensions. This can be done only when this LineString
  * is still empty.
  * @param {Number} nod - Number of dimensions
  */
  setNod( nod ){
    if(!this._data || !this._data.length){
      console.warn("The number of dimension can be set only when this LineString is empty.");
      return;
    }
    
    this.setMetadata("nod", nod);
  }
  
  
  /**
  * Get the internal image data (pointer)
  * @return {Array} the original data, dont mess up with this one.
  * in case of doubt, use  getDataCopy()
  */
  getData(){
    return this._data;  // return the actual array, editable!
  }


  /**
  * Get a copy of the data
  * @return {Array} a deep copy of the data
  */
  getDataCopy(){
    return new this._data.constructor( this._data );
  }
  
  
  /**
  * Get the number of points in this linestring
  * @return {Number} nb of points
  */
  getNumberOfPoints(){
    if(!this._data){
      return 0;
    }
    
    return this._data.length / this.getMetadata("nod");
  }
  
  
  /**
  * Get a point of this LineString
  * @return {Array} a point, being [x, y] if 2D or [x, y, z] if 3D
  */
  getPoint( index ){
    if(index >=0 && index < getNumberOfPoints){
      var nod = this._metadata.nod;
      return this._data.slice(index*nod, index*nod + nod);
    }else{
      console.warn("Index of point is out of range.");
      return null;
    }
  }
  
  
  /**
  * Considere this LineString as closed, making it a polygon
  */
  close(){
    this.setMetadata("closed", true);
  }
  
  
  /**
  * Considere this LineString as open
  */
  open(){
    this.setMetadata("closed", false);
  }
  
  
  /**
  * Add a point at the end of the LineString. Keeps the polygon open.
  * @param {Array} position - [x, y] if 2D or [x, y, z] if 3D
  */
  addPoint( position ){
    if( position.length != this._metadata.nod ){
      console.warn("Cannot add the point becase it has a diferent number of dimensions.");
      return;
    }
    
    if( !this._data ){
      this._data = new Array();
    }
    
    for(var i=0; i<position.length; i++){
      this._data.push( position[i] );
    }
    
    // we keep it for easy access
    this._lastPoint = position;
  }
  
  
  /**
  * Get the last point but does not pop it out
  * @return {Array} the point as [x, y] or [x, y, z]
  */
  peekPoint(){
    if(!this._data){
      return null;
    }
    
    if(this._lastPoint){
      return this._lastPoint;
    }
    
    this._setLastPoint();
    return this._lastPoint;
  }
  
  
  /**
  * [PRIVATE]
  * define the last point
  */
  _setLastPoint(){
    this._lastPoint = this._data.slice(- this._metadata.nod);
    if(this._lastPoint.length == 0){
      this._lastPoint = null;
    }
  }
  
  
  /**
  * Get the last point and remove it from this LineString
  * @return {Array} like [x, y] or [x, y, z] or null if no more point
  */
  popPoint(){
    if(!this._data){
      console.warn("This LineString was not added any point.");
      return null;
    }
    
    if(!this._data.length){
      console.warn("No more point in this LineString.");
      return null;
    }

    var pointToReturn = new Array(this._lastPoint);
    this._lastPoint.length = this._lastPoint.length - this._metadata.nod;
    this._setLastPoint();
  }
  
  
} /* END of class LineString */

export { LineString };
