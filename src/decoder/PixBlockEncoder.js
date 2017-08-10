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


/**
* A PixBlockEncoder instance is a Filter that takes a PixpipeContainer as input,
* which is the base type for Image2D/Image3D and any other data container used in Pixpipe.
* Then, the update function serializes the data structure (data + metadata) into
* a binary buffer that can be send to a PixBinEncoder (or directly to write a file).  
* 
* Data can be compressed unsing Pako. To enable this feature, specify
* `.setMetadata("compress", true)` on this filter.  
* Please note that metadata are not compressed, only data are.
* Also, compression has some side effects: 
* - data from within a block is no longer streamable
* - the datablock is smaller
* - the metadata header is still accessible 
*
* **Usage**
* - [examples/Image2DToPixblock.html](../examples/Image2DToPixblock.html)
*/
class PixBlockEncoder extends Filter {
  
  constructor(){
    super()
    this.setMetadata( "compress", false );
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
    
    var compress = this.getMetadata( "compress" );
    var data = input.getData();
    var compressedData = null;
    
    var byteStreamInfo = [];
    var usingDataSubsets = false;
    
    // the _data object is an array containing multiple TypedArrays (eg. meshes)
    if( Array.isArray(data) ){
      usingDataSubsets = true;
      compressedData = []
      
      // collect bytestream info for each subset of data
      for(var i=0; i<data.length; i++){
        var byteStreamInfoSubset = this._getByteStreamInfo(data[i]);
        
        if(compress){
          var compressedDataSubset = pako.deflate( data[i] );
          byteStreamInfoSubset.compressedByteLength = compressedDataSubset.byteLength;
          compressedData.push( compressedDataSubset );
        }
        
        byteStreamInfo.push( byteStreamInfoSubset )
      }
    }
    // the _data object is a single TypedArray (eg. Image2D)
    else{
      var byteStreamInfoSubset = this._getByteStreamInfo(data)
      
      if(compress){
        compressedData = pako.deflate( data.buffer );
        byteStreamInfoSubset.compressedByteLength = compressedData.byteLength;
      }
      
      byteStreamInfo.push( byteStreamInfoSubset )
    }
    // TODO: if it's not an array and not a TypedArray, it could be an object
    
    // from now, if compression is enabled, what we call data is compressed data
    if(compress){
      data = compressedData;
    }
    
    var pixBlockMeta = {
      byteStreamInfo : byteStreamInfo,
      pixpipeType    : input.constructor.name,
      containerMeta  : input.getMetadataCopy()
    }
    
    // converting the pixBlockMeta obj into a buffer
    var pixBlockMetaBuff = CodecUtils.objectToArrayBuffer( pixBlockMeta );
    
    // this list will then be trandformed into a single buffer
    var allBuffers = [
      new Uint8Array( [ + CodecUtils.isPlatformLittleEndian() ] ).buffer, // endianess
      new Uint32Array( [pixBlockMetaBuff.byteLength] ).buffer, // size of the following buff (pixBlockMetaBuff)
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

    this._output[ 0 ] = CodecUtils.mergeBuffers( allBuffers );
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
      length: typedArray.length,
      compressedByteLength: null
    }
  }
  
  
} /* END of class PixBlockEncoder */

export { PixBlockEncoder }
