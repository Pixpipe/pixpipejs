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
    for (var i=0; i < str.length; i++) {
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
    for (var i=0; i < str.length; i++) {
      bufView[i] = str.charCodeAt(i);
    }
    return buf;
  }

  
  /**
  * Write a ASCII string into a buffer
  * @param {String} str - a string that contains only ASCII characters
  * @param {ArrayBuffer} buffer - the buffer where to write the string
  * @param {Number} byteOffset - the offset to apply, in number of bytes
  */
  static setString8InBuffer( str, buffer, byteOffset = 0 ){
    if( byteOffset < 0){
      console.warn("The byte offset cannot be negative.");
      return;
    }
    
    if( !buffer || !(buffer instanceof ArrayBuffer)){
      console.warn("The buffer must be a valid ArrayBuffer.");
      return;
    }
    
    if( (str.length + byteOffset) > buffer.byteLength ){
      console.warn("The string is too long to be writen in this buffer.");
      return;
    }
    
    var bufView = new Uint8Array(buffer);
    
    for (var i=0; i < str.length; i++) {
      bufView[i + byteOffset] = str.charCodeAt(i);
    }
  }


  /**
  * Extract an ASCII string from an ArrayBuffer
  * @param {ArrayBuffer} buffer - the buffer
  * @param {Number} strLength - number of chars in the string we want
  * @param {Number} byteOffset - the offset in number of bytes
  * @return {String} the string, or null in case of error
  */
  static getString8FromBuffer( buffer, strLength, byteOffset=0 ){
    if( byteOffset < 0){
      console.warn("The byte offset cannot be negative.");
      return null;
    }
    
    if( !buffer || !(buffer instanceof ArrayBuffer)){
      console.warn("The buffer must be a valid ArrayBuffer.");
      return null;
    }
    
    if( (strLength + byteOffset) > buffer.byteLength ){
      console.warn("The string is too long to be writen in this buffer.");
      return null;
    }
    
    return String.fromCharCode.apply(null, new Uint8Array(buffer, byteOffset, strLength));
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
  * Get if wether of not the arg is a typed array
  * @param {Object} obj - possibly a typed array, or maybe not
  * @return {Boolean} true if obj is a typed array
  */
  static isTypedArray( obj ){
    return ( obj instanceof Int8Array         ||
             obj instanceof Uint8Array        ||
             obj instanceof Uint8ClampedArray ||
             obj instanceof Int16Array        ||
             obj instanceof Uint16Array       ||
             obj instanceof Int32Array        ||
             obj instanceof Uint32Array       ||
             obj instanceof Float32Array      ||
             obj instanceof Float64Array )
  }


  /**
  * Merge some ArrayBuffes in a single one
  * @param {Array} arrayOfBuffers - some ArrayBuffers
  * @return {ArrayBuffer} the larger merged buffer
  */
  static mergeBuffers( arrayOfBuffers ){
    var totalByteSize = 0;
    
    for(var i=0; i<arrayOfBuffers.length; i++){
      totalByteSize += arrayOfBuffers[i].byteLength;
    }
    
    var concatArray = new Uint8Array( totalByteSize );
    
    var offset = 0
    for(var i=0; i<arrayOfBuffers.length; i++){
      concatArray.set( new Uint8Array(arrayOfBuffers[i]), offset);
      offset += arrayOfBuffers[i].byteLength
    }
    
    return concatArray.buffer;
  }


  /**
  * In a browser, the global object is `window` while in Node, it's `GLOBAL`.
  * This method return the one that is relevant to the execution context.
  * @return {Object} the global object
  */
  static getGlobalObject(){
    var constructorHost = null;
    
    try{
      constructorHost = window; // in a web browser
    }catch( e ){
      try{
        constructorHost = GLOBAL; // in node
      }catch( e ){
        console.warn( "You are not in a Javascript environment?? Weird." );
        return null;
      }
    }
    return constructorHost;
  }


  /**
  * Extract a typed array from an arbitrary buffer, with an arbitrary offset
  * @param {ArrayBuffer} buffer - the buffer from which we extract data
  * @param {Number} byteOffset - offset from the begining of buffer
  * @param {Function} arrayType - function object, actually the constructor of the output array 
  * @param {Number} numberOfElements - nb of elem we want to fetch from the buffer
  * @return {TypedArray} output of type given by arg arrayType - this is a copy, not a view
  */
  static extractTypedArray( buffer, byteOffset, arrayType, numberOfElements ){
    if( !buffer ){
      console.warn("Input Buffer is null.");
      return null;
    }
    
    if(! (buffer instanceof ArrayBuffer) ){
      console.warn("Buffer must be of type ArrayBuffer");
      return null;
    }
    
    if(numberOfElements <= 0){
      console.warn("The number of elements to fetch must be greater than 0");
      return null;
    }
    
    if(byteOffset < 0){
      console.warn("The byte offset must be possitive or 0");
      return null;
    }
    
    if( byteOffset >= buffer.byteLength ){
      console.warn("The offset cannot be larger than the size of the buffer.");
      return null;
    }
    
    if( arrayType instanceof Function && !("BYTES_PER_ELEMENT" in arrayType)){
      console.warn("ArrayType must be a typed array constructor function.");
      return null;
    }
    
    if( arrayType.BYTES_PER_ELEMENT * numberOfElements + byteOffset > buffer.byteLength ){
      console.warn("The requested number of elements is too large for this buffer");
      return;
    }
    
    var slicedBuff = buffer.slice(byteOffset, byteOffset + numberOfElements*arrayType.BYTES_PER_ELEMENT)
    return new arrayType( slicedBuff )
  }
  

} /* END of class CodecUtils */

export { CodecUtils }
