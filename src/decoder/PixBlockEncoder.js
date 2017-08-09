/*
* Author    Jonathan Lurie - http://me.jonahanlurie.fr
*
* License   MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import pako from 'pako';
import { Filter } from '../core/Filter.js';
import { PixpipeContainer } from '../core/PixpipeContainer.js';
import { CodecUtils } from './CodecUtils.js';

//import { Image2D } from '../core/PixpipeContainer.js';

class PixBlockEncoder extends Filter {
  
  constructor(){
    super()
  }
  
  
  _run(){
    var input = this._getInput();
    
    if( !input ){
      console.warn("An input must be given to the PixBlockEncoder.");
      return;
    }
    
    // only an object that inherit from PixpipeContainer can be converted as a block
    if( !(input instanceof PixpipeContainer) ){
      console.warn("The input of PixBinEncoder must be an instance of PixpipeContainer.");
      return;
    }
    
    var data = input.getData();
    
    // contain the same as input._data, but concatenated if _data contains multiple subset
    // This is an ArrayBuffer
    var dataBuffer = null;
    var byteStreamInfo = [];
    var usingDataSubsets = false;
    
    // the _data object is an array containing multiple TypedArrays (eg. meshes)
    if( Array.isArray(data) ){
      usingDataSubsets = true;
      
      // collect bytestream info for each subset of data
      for(var i=0; i<data.length; i++){
        byteStreamInfo.push( this._getByteStreamInfo(data[i]) )
      }
    }
    // the _data object is a single TypedArray (eg. Image2D)
    else{
      dataBuffer = data.buffer;
      byteStreamInfo.push( this._getByteStreamInfo(data) )
    }
    
    
    // 
    var pixBlockMeta = {
      byteStreamInfo : byteStreamInfo,
      pixpipeType    : input.constructor.name,
      containerMeta  : input.getMetadataCopy()
    }
    
    // converting the pixBlockMeta obj into a buffer
    var pixBlockMetaBuff = CodecUtils.objectToArrayBuffer( pixBlockMeta );
    
    // this list will then be trandformed into a single buffer
    var allBuffers = [
      new Uint8Array( [ + CodecUtils.isPlatformLittleEndian() ] ), // endianess
      new Uint32Array( [pixBlockMetaBuff.byteLength] ), // size of the following buff (pixBlockMetaBuff)
      pixBlockMetaBuff, // the buff of metadada
    ]
    
    // adding the actual data buffer to the list
    if( usingDataSubsets ){
      for(var i=0; i<data.length; i++){
        allBuffers.push( data[i].buffer ) 
      }
    }else{
      allBuffers.push( data.buffer )
    }

    console.log( allBuffers );

    this._output[ 0 ] = CodecUtils.mergeTypedArray( allBuffers );
  }
  
  
  /**
  * Get some info about a byte stream info (TypedArray)
  * @param {TypedArray} typedArray - one of the typed array
  * @return {Object} in form of {type: String, signed: Boolean, bytesPerElements: Number, byteLength: Number, length: Number}
  */
  _getByteStreamInfo( typedArray ){
    var type = null;
    var signed = false;
    
    if( typedArray instanceof Int8Array ){
      type = "int";
      signed = false;
    }else if( typedArray instanceof Uint8Array ){
      type = "int";
      signed = true;
    }else if( typedArray instanceof Uint8ClampedArray ){
      type = "int";
      signed = true;
    }else if( typedArray instanceof Int16Array ){
      type = "int";
      signed = false;
    }else if( typedArray instanceof Uint16Array ){
      type = "int";
      signed = true;
    }else if( typedArray instanceof Int32Array ){
      type = "int";
      signed = false;
    }else if( typedArray instanceof Uint32Array ){
      type = "int";
      signed = true;
    }else if( typedArray instanceof Float32Array ){
      type = "float";
      signed = false;
    }else if( typedArray instanceof Float64Array ){
      type = "float";
      signed = false;
    }
    
    return {
      type: type,
      signed: signed,
      bytesPerElements: typedArray.BYTES_PER_ELEMENT,
      byteLength: typedArray.byteLength,
      length: typedArray.length
    }
  }
  
  
} /* END of class PixBlockEncoder */

export { PixBlockEncoder }
