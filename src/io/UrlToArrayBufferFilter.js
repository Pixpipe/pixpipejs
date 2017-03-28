/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { Filter } from '../core/Filter.js';


/**
* Open a files as ArrayBuffer using their URL. You must specify one or several URL
* (String) using `addInput("...")`` and add function to the event "ready" using
* `.on( "ready", function(filter){ ... })`.
* The "ready" event will be called only when all input are loaded.
*
* usage: examples/urlFileToArrayBuffer.html
*/
class UrlToArrayBufferFilter extends Filter {

  constructor(){
    super();
    this._outputCounter = 0;
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
      that._output[ category ] = arrayBuff

      that._outputCounter ++;

      if( that._outputCounter == that.getNumberOfInputs() && "ready" in that._events){
        that._events.ready( that );
      }
    };

    xhr.error = function(){
      console.log("here go the error");
    }

    xhr.send();
  }


} /* END of class UrlToArrayBufferFilter */

export { UrlToArrayBufferFilter }
