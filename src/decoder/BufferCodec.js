/*
* Author    Jonathan Lurie - http://me.jonahanlurie.fr
*           Robert D. Vincent
*
* License   MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


/**
* BufferCodec provides static methods to encode/decode typedArrays into string
* for the purpose of serialization (and later, *.pixp file saving)
*/
class BufferCodec {


  static typedArrayToJsonStringArray( arr ){
    var arrayAndMeta = {
      data: Array.prototype.slice.call( arr ),
      type: arr.constructor.name  // to be able to rebuild a TypedArray from an untyped array.
    }

    console.log(arrayAndMeta);

    return JSON.stringify( arrayAndMeta );
  }


  static jsonStringArrayToTypedArray( jsonStr ){
    var arrayAndMeta = JSON.parse( jsonStr );
    var constructorHost = (window || this);

    if(! constructorHost[ arrayAndMeta.type ]){
      console.warn( "Undefined type for building TypedArray from JSON." );
      return null;
    }

    return new constructorHost[ arrayAndMeta.type ]( arrayAndMeta.data );
  }


} /* END of class BufferCodec */

export { BufferCodec }
