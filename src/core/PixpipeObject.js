/*
* Author   Jonathan Lurie - http://me.jonathanlurie.fr
* License  MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

// Object schema validation
import joi from 'joi-browser';

/**
* PixpipeObject is the base object of all. It creates a uuid and has few
* generic attributes like type, name and description. Not all these attributes
* always useful;
*/
class PixpipeObject {

  constructor(){
    // unique identifier
    this._uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    });

    // Metadata can be anything, a name, an ID, a description, a DOM element.
    // everything that is not an input but rather a setting
    this._metadata = {};
    
    // a joi schema to validate the _metadata integrity. If null, integrity not validated.
    // I has to be overloaded when a class inherits from PixpipeObject
    this._metadataSchema = this._buildMetadataSchema();

    this._type = PixpipeObject.TYPE();
    
    // to leasure time. The 2 default values are added by _beforeRun and _afterRun
    // under the name of "begin" and "end"
    this._timer = {};
  }


  /**
  * Acces it like a static attribute.
  * Must be overloaded.
  */
  static TYPE(){
    return "GENERIC";
  }


  /**
  * Compare a give type to the type of this object.
  * @param {String} t - a type, better to call the static method of each object, like Image.TYPE()
  */
  isOfType( t ){
    return !(this._type.localeCompare(t))
  }


  /**
  * Get type of object.
  * @return {String} the type
  */
  getType(){
    this._type;
  }

  /**
  * Return a copy of the uuid
  */
  getUuid(){
    return this._uuid.slice();
  }


  /**
  * Set a metadata using a pair of key and value.
  * @param {String} key - the ID of the metadata
  * @param {Object} value - can be a string, Number or Object
  */
  setMetadata( key, value ){
    if(typeof key === 'string' || key instanceof String){
      this._metadata[ key ] = value;
    }else{
      console.warn("The given key must be a String Object.");
    }

  }


  /**
  * Retrieve a metadata using a key.
  * @param {String} key - the ID of the metadata
  * @return {Object} the metadata object - or null if non existent
  */
  getMetadata( key ){
    if( key in this._metadata){
      return this._metadata[ key ];
    }else{
      console.warn("The metadata with key: " + key + " doe not exist.");
      return null;
    }
  }


  /**
  * Check if the metadata with the given key exists.
  * @param {String} key - the key to look up in the metadata collection
  * @return {Boolean} true if the metadata with the given is present, false if not.
  */
  hasMetadata( key ){
    return (key in this._metadata);
  }


  /**
  * @return {Array} of Strings where each is a key of an existing metadata record
  */
  getMetadataKeys(){
    return Object.keys( this._metadata );
  }


  /**
  * Copy all the metadata from the object in argument to this.
  * A deep copy by serialization is perform.
  * The metadata that exist only in _this_ are kept.
  * @param {PixpipeObject} otherObject - the object to copy metadata from
  */
  copyMetadataFrom( otherObject ){
    var that = this;

    otherObject.getMetadataKeys().forEach( function(key){
      try{
        var metadataObjectCopy = JSON.parse( JSON.stringify( otherObject.getMetadata(key) ) );
        that.setMetadata(key, metadataObjectCopy);
      }catch(e){
        console.error(e);
      }
    });
  }


  /**
  * Get a copy of the metadata object using a serialization middle step (no reference shared).
  * @return {Object} a copy of local metadata
  */
  getMetadataCopy(){
    return JSON.parse( JSON.stringify( this._metadata ) );
  }
  
  
  /**
  * Associate the internal metadata object with the one in args.
  * @param {Object} m - metadata. Should NOT contain TypedArray
  */
  setRawMetadata( m ){
    this._metadata = m;
    this._metadataRawCopied();
  }
  
  
  /**
  * Called just after metadata were raw-copied. Useful to perform checkings and pre processing.
  * To be overwriten
  */
  _metadataRawCopied(){
    /*
          *** TO BE OVERWRITTEN ***
    */
  }
  
  /**
  * [PRIVATE]
  * Deal with an option object (usually as an argument of a constructor).
  * @param {Object} optionsObject - the option object
  * @param {String} key - a property name in this optionObject
  * @param {Object} defaultValue - the value to return if the key in the optionObject was not found
  * @return {Object} the value from the optionObject that has the property name key, unless this property does not exist, then it returns the defaultValue.
  */
  _getOption(optionsObject, key, defaultValue){
    if(!optionsObject)
      return defaultValue;
      
    return optionsObject[ key ] || defaultValue;
  }


  /**
  * Verifies if the metadata object contain a cyclic object.
  * @return {Boolean} true if metadata is cyclic, false if not
  */
  isMetadataCyclic(){
    try{
      JSON.stringify( this._metadata )
    }catch(e){
      return true;
    }
    
    return false;
  }


  /**
  * Set a time measurement (from an arbitrary starting point)
  * @param {String} recordName - name of the record
  */
  addTimeRecord( recordName ){
    this._timer[ recordName ] = performance.now();
  }


  /**
  * @return {Number} the elapsed time in ms between fromRecord and toRecord.
  * Return -1 if one or both time record
  */
  getTime(fromRecord, toRecord, print=false){
    if( fromRecord in this._timer && toRecord in this._timer ){
      var t = Math.abs(this._timer[toRecord] - this._timer[fromRecord])

      if(print){
        console.log("> Time: [" + fromRecord + " , " + toRecord + "] is " + t + " millisec.");
      }

      return t;
    }else{
      console.warn("The two given record name must exist in the time record table.");
      return -1;
    }
  }
  
  
  /**
  * Build the joi validation schema for the _metadata object.
  * This method has to be overwriten and return a proper validation object, though
  * this metadata check is optional.
  * If not overwriten, metadata will always be considered valid
  * @return {Object} the joi schema
  */
  _buildMetadataSchema(){
    /*
          *** TO BE OVERWRITTEN ***
    */
    return null;
  }
  
  
  /**
  * Performs an inetgrity check of a metadata object. If none is given in argument,
  * integrity check is performed on this._metadata.
  * @param {Object} a metadata object to perform the integrity check on.
  * @return {Boolean} true if metadata obj is valid, false if not.
  */
  metadataIntegrityCheck( metadataObj = null ){
    if( metadataObj == null ){
      metadataObj = this._metadata;
    }
    
    if( metadataObj ){
      var validationResults = joi.validate( metadataObj, this._metadataSchema );
      if(validationResults.error){
        console.warn("SCHEMA VALIDATION: " + validationResults.error );
        return false;
      }
      return true;
    }else{
      console.warn("Validation schema not available. Metadata considered to be valid.");
      return true;
    }
  }
  
  
  /**
  * Get a clone of the _metadata object. Deep copy, no reference in common.
  */
  getMetadataClone(){
    if( this.metadataIntegrityCheck() ){
      return JSON.parse( JSON.stringify( this._metadata ) );
    }
    return null;
  }
  
  
  /**
  * Get a string containing information about metadata
  * @return {String} meta to string
  */
  metadataToString(){
    var str = "__metadata__\n";
    for( var meta in this._metadata ){
      str += `\t[${meta}]\n\t${JSON.stringify(this._metadata[meta])}\n\n` 
    }
    return str;
  }
  
}

export { PixpipeObject }
