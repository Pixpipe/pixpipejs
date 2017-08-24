/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


import pako from 'pako'
import md5 from 'js-md5'
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
  * [PRIVATE]
  * Perform a XMLHttpRequest with the given url and adds it to the output
  */
  _loadUrl( category, url ){
    var that = this;

    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "arraybuffer";

    xhr.onload = function(event) {
      var arrayBuff = xhr.response;
      
      var basename = url.split(/[\\/]/).pop();
      var extension = basename.split('.').pop();
      var checksum = md5( arrayBuff );
      
      // few metadata for recognizing files (potentially)
      that._metadata.filenames[ category ] = basename;
      that._metadata.checksums[ category ] = checksum;

      // trying to un-gzip it with Pako for non pixp files
      if( extension.localeCompare("pixp") ){
        try {
          arrayBuff = pako.inflate(arrayBuff).buffer;
          console.log("File was un-gziped successfully");
        } catch (err) {
          console.log("Pako: " + err + " (this content is not gziped)");
        }
      }
      
      that._output[ category ] = arrayBuff
      

      that._outputCounter ++;

      if( that._outputCounter == that.getNumberOfInputs()){
        that.triggerEvent("ready");
      }
    };

    xhr.error = function(){
      console.log("here go the error");
    }

    xhr.send();
  }


} /* END of class UrlToArrayBufferReader */

export { UrlToArrayBufferReader }
