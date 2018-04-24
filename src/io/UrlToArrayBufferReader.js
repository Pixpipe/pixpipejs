/*
* Author   Jonathan Lurie - http://me.jonathanlurie.fr
* License  MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


import pako from 'pako'
import md5 from 'js-md5'
import codecutils from 'codecutils';
import { Filter } from '../core/Filter.js';


/**
* Open a files as ArrayBuffer using their URL. You must specify one or several URL
* (String) using `addInput("...")` and add function to the event "ready" using
* `.on( "ready", function(filter){ ... })`.
* The "ready" event will be called only when all input are loaded.
* Gzip compressed files will be uncompressed.
* Once the filter is *updated*, you can query the `filenames` metadata (sorted by categories)
* and also the `checksums` metadata using `.getMetadata()`. This later metadata
* give a unique *md5*, very convenient to compare if two files are actually the same.
* Note that in case the file is *gziped*, the checksum is computed on the raw file,
* not on the *un-gziped* buffer.
*
* It happens that a file is not binary but text, then, set the metadata "readAsText" to `true`.
*
* **Usage**
* - [examples/urlFileToArrayBuffer.html](../examples/urlFileToArrayBuffer.html)
*/
class UrlToArrayBufferReader extends Filter {

  constructor(){
    super();
    this._outputCounter = 0;

    // filenames by categories
    this.setMetadata("filenames", {});

    // md5 checksum by categories
    this.setMetadata("checksums", {});

    // By defaut, this reader outputs an ArrayBuffer, but it can output a string
    // if it's reading a text file and this metadata is set to true
    this.setMetadata("readAsText", false);
  }


  _run(){
    var that = this;

    if(! this.getNumberOfInputs() ){
      console.warn("No input was specified, cannot run this filer.");
      return;
    }


    this._forEachInput( function(category, input){
      that._loadUrl(category, input)
    });

  }


  /**
  * @private
  * Perform a XMLHttpRequest with the given url and adds it to the output
  */
  _loadUrl( category, url ){
    var that = this;
    var readAsText = this.getMetadata("readAsText");

    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);

    var onLoadEndBinaryFile = function(event) {
      var result = event.target.response;
      var basename = url.split(/[\\/]/).pop();
      var extension = basename.split('.').pop();
      var checksum = md5( result );

      // few metadata for recognizing files (potentially)
      that._metadata.filenames[ category ] = basename;
      that._metadata.checksums[ category ] = checksum;

      // trying to un-gzip it with Pako for non pixp files
      if( extension.localeCompare("pixp") ){
        try {
          result = pako.inflate(result).buffer;
          console.log("File was un-gziped successfully");
        } catch (err) {
          console.log("Pako: not a gziped file (" + err + ")");
        }
      }

      // read the content as text (unicode, ASCII compatible)
      if( readAsText){
        var strResult = codecutils.CodecUtils.arrayBufferToUnicode(result);
        if( strResult && codecutils.CodecUtils.isValidString(strResult) ){
          result = strResult;
        }else{
          console.warn("The content of this file is not a valid text. It could be read as a binary file if the metadata 'readAsText' is set to false.");
          return;
        }
      }

      that._output[ category ] = result
      that._outputCounter ++;

      if( that._outputCounter == that.getNumberOfInputs()){
        that.triggerEvent("ready");
      }
    };


    var onLoadEndTextFile = function(event) {
      console.log( "ooooooooo" );
      var result = event.target.response;;

      var basename = url.split(/[\\/]/).pop();
      var extension = basename.split('.').pop();
      var checksum = md5( result );

      // few metadata for recognizing files (potentially)
      that._metadata.filenames[ category ] = basename;
      that._metadata.checksums[ category ] = checksum;

      // try to read as text, but it's not text.
      // Maybe it's a gz-compressed text file, so we have to read this file as a
      // binary and see if once compressed it has a valid text content
      if(!codecutils.CodecUtils.isValidString(result)){
        event.target.abort();
        // xhrBackup is used only when reading as a text is not possible (binary file)
        // it is then used in case of failure of reading text in the first place
        var xhrBackup = new XMLHttpRequest();
        xhrBackup.open("GET", url, true);
        xhrBackup.responseType = "arraybuffer";
        xhrBackup.onload = onLoadEndBinaryFile;
        xhrBackup.send();
        return;
      }

      that._output[ category ] = result
      that._outputCounter ++;

      if( that._outputCounter == that.getNumberOfInputs()){
        that.triggerEvent("ready");
      }
    };

    xhr.error = function(){
      console.log("here go the error");
    }

    if( readAsText ){
      xhr.responseType = "text";
      xhr.onload = onLoadEndTextFile;
      //xhr.onload = blaa;
    }else{
      xhr.responseType = "arraybuffer";
      xhr.onload = onLoadEndBinaryFile;
    }

    xhr.send();
  }


} /* END of class UrlToArrayBufferReader */

export { UrlToArrayBufferReader }
