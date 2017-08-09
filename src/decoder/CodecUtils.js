/**
* The CodecUtils class gather some static methods that can be useful while
* encodeing/decoding data.
* CodecUtils does not have a constructor, don't try to instanciate it.
*/
class CodecUtils {


  /**
  * Get whether or not the platform is using little endian.
  * @return {Boolen } true if the platform is little endian, false if big endian
  */
  static isPlatformLittleEndian() {
    var a = new Uint32Array([0x12345678]);
    var b = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
    return (b[0] != 0x12);
  }


  /**
  * convert an ArrayBuffer into a unicode string (2 bytes for each char)
  * @param {ArrayBuffer} buf - input ArrayBuffer
  * @return {String} a string compatible with Unicode characters
  */
  static arrayBufferToString16( buf ) {
    return String.fromCharCode.apply(null, new Uint16Array(buf));
  }


  /**
  * convert a unicode string into an ArrayBuffer
  * Note that the str is a regular string but it will be encoded with
  * 2 bytes per char instead of 1 ( ASCII uses 1 byte/char )
  * @param {String} str - string to encode
  * @return {ArrayBuffer} the output ArrayBuffer
  */
  static string16ToArrayBuffer( str ) {
    var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
    var bufView = new Uint16Array(buf);
    for (var i=0, strLen=str.length; i < strLen; i++) {
      bufView[i] = str.charCodeAt(i);
    }
    return buf;
  }


  /**
  * Convert an ArrayBuffer into a ASCII string (1 byte for each char)
  * @param {ArrayBuffer} buf - buffer to convert into ASCII string
  * @return {String} the output string
  */
  static arrayBufferToString8( buf ) {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
  }


  /**
  * Convert a ASCII string into an ArrayBuffer.
  * Note that the str is a regular string, it will be encoded with 1 byte per char
  * @param {String} str - string to encode
  * @return {ArrayBuffer}
  */
  static string8ToArrayBuffer( str ) {
    var buf = new ArrayBuffer(str.length);
    var bufView = new Uint8Array(buf);
    for (var i=0, strLen=str.length; i < strLen; i++) {
      bufView[i] = str.charCodeAt(i);
    }
    return buf;
  }

  
  /**
  * Serializes a JS object into an ArrayBuffer.
  * This is using a unicode JSON intermediate step.
  * @param {Object} obj - an object that does not have cyclic structure
  * @return {ArrayBuffer} the serialized output
  */
  static objectToArrayBuffer( obj ){
    var buff = null;
    
    try{
      var strObj = JSON.stringify( obj );
      buff = CodecUtils.string16ToArrayBuffer(strObj)
    }catch(e){
      console.warn(e);
    }
    
    return buff;
  }
  
  
  /**
  * Convert an ArrayBuffer into a JS Object. This uses an intermediate unicode JSON string.
  * Of course, this buffer has to come from a serialized object.
  * @param {ArrayBuffer} buff - the ArrayBuffer that hides some object
  * @return {Object} the deserialized object
  */
  static ArrayBufferToObject( buff ){
    var obj = null;
    
    try{
      var strObj = CodecUtils.arrayBufferToString16( buff );
      obj = JSON.parse( strObj )
    }catch(e){
      console.warn(e);
    }
    
    return obj;
  }


  /**
  * Merge some typed array of various types and output a new ArrayBuffer.
  * @param {TypedArray} arrayOfArrays - a typed array
  * @return {ArrayBuffer} the larger merged buffer
  */
  static mergeTypedArray( arrayOfArrays ){
    var totalByteSize = 0;
    
    for(var i=0; i<arrayOfArrays.length; i++){
      totalByteSize += arrayOfArrays[i].byteLength;
    }
    
    var concatArray = new Uint8Array( totalByteSize );
    
    var offset = 0
    for(var i=0; i<arrayOfArrays.length; i++){
      concatArray.set( new Uint8Array(arrayOfArrays[i].buffer), offset);
      offset += arrayOfArrays[i].byteLength
    }
    
    return concatArray.buffer;
  }

} /* END of class CodecUtils */

export { CodecUtils }
