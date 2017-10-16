/*
* Author   Jonathan Lurie - http://me.jonathanlurie.fr
* License  MIT
* Link     https://github.com/Pixpipe/pixpipejs
* Lab      MCIN - Montreal Neurological Institute
*/


// The index types are stored in this sort-of-private/sort-of-static object.
var coreTypes = {}

/**
* CoreTypes is bit of an exception in Pixpipejs because it does not inherit from
* PixpipeObject and it contains only static methods. In a sens, it's comparable
* to a singleton that stores all the core types constructors of Pixpipe so that
* they can be retrived only by querying their name.
* 
* At the creation of a new type, the static method `.addCoreType()` should be
* called right after the closing curly bracket of the class declaration.
* This is if we want to reference this class as a core type.
*/
class CoreTypes {
  
  /**
  * [STATIC]
  * Adds a new type to the collection of core types. This is used when we want
  * to retrieve a type and instanciate an object of this type using its constructor name.
  * @param {Class} typeClass  - the class of the type
  */
  static addCoreType( typeClass ){
    if( typeof typeClass === "function" ){
      coreTypes[ typeClass.name ] = typeClass
    }
  }
  
  
  /**
  * [STATIC]
  * Return the constructor of the given type name. This is useful to instanciate 
  * an object based on the name of its type (eg. in PixBinDecoder)
  * @param {String} typeName - the name of the type eg. "Image2D"
  * @return {Function} constructor for the given type
  */
  static getCoreType( typeName ){
    if( typeName in coreTypes ){
      return coreTypes[ typeName ]
    }else{
      return null;
    }
  }
  
}

export { CoreTypes }
