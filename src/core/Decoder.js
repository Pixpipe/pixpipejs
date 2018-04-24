import codecutils from 'codecutils';

import { Filter } from "../core/Filter.js";


/**
* The class Decoder is an interface and is not supposed to be used as-is.
* The file decoderd (in the `decoder` folder) must inherit from this class because
* it implements some handy logic, for example the static function `isBinary` to tell if
* the associated format is binary or text based. In addition, it has a method to
* convert a utf8 binary buffer into a utf8 string. This is usefull in case the
* associated filetype is text based but the given buffer (of a valid file) is encoded
* in a binary way.
* The metadata `targetType` must be overwritten with a string matching one of the
* Pixpipe type (e.g. "Image3DAlt");
*/
class Decoder extends Filter {

  /**
  * Static method to tell if the file format of this decoder is binary based or text based.
  * This function must be overwritten for decoder that handle text based files.
  * @return {Boolean} true if binary, false if text
  */
  static isBinary(){
    return true;
  }


  constructor(){
    super();
    this.setMetadata("targetType", null);
  }


  /**
  * @private
  * Non static counterpart of `isBinary`. It's mostly just a shortcut to call isBinary from `this` easily.
  * @return {Boolean} true if binary, false if text
  */
  _isBinary(){
    return this.constructor.isBinary();
  }

  /**
  * @private
  * Overloads `Filter._getInput()` and add the logic of converting a binary buffer
  * into a utf8 string when it is required and possible.
  * @param {String} category - category of input (default: 0)
  * @return {string|ArrayBuffer} the input as an ArrayBuffer or as a string if required and possible. Will return null if a string is expected but could not convert the binary buffer into a valid utf8 string.
  */
  _getInput( category=0 ){
    var input = super._getInput( category );
    var isBinary = this._isBinary();

    // (This case is the most common)
    // the decoder expects a binary buffer (ArrayBuffer) and an ArrayBuffer is given
    // --> success (nothing additional to do)
    if( isBinary && (input instanceof ArrayBuffer ) ){
      return input;
    }

    // the decoder expects a string and a string is given.
    // --> success (nothing additional to do)
    if( !isBinary && (typeof input === "string" ) ){
      return input;
    }

    // the decoder expects a string and an ArrayBuffer is given
    // --> we try to convert to utf8 string
    if( !isBinary && (input instanceof ArrayBuffer ) ){

      var stringInput = codecutils.CodecUtils.arrayBufferToUnicode(input);
      if(stringInput){
        return stringInput;
      }else{
        console.warn("The binary buffer could not be converted into a a valid string.");
        return null
      }
    }

    // the decoder expects a binary buffer (ArrayBuffer) and a string is given.
    // --> fail
    if( isBinary && (typeof input === "string" ) ){
      console.warn("A binary buffer is expected and a string buffer is given. Unable to continue.");
      return null;
    }

    return null;
  }

} /* END of class/interface Decoder */

export { Decoder };
