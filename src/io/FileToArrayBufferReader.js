/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { Filter } from '../core/Filter.js';


/**
* Takes the File inputs from a HTML input of type "file" (aka. a file dialog), and reads it as a ArrayBuffer.
* Every File given in input should be added separately using `addInput( file[i], 'uniqueID' )`.
* The event "ready" must be set up ( using .on("ready", function(){}) ) and will
* be triggered when all the files given in input are translated into ArrayBuffers.
* Once ready, all the outputs are accecible using the same uniqueID with the
* method `getOutput("uniqueID")`
*
* **Usage**
* - [examples/fileToArrayBuffer.html](../examples/fileToArrayBuffer.html)
*/
class FileToArrayBufferReader extends Filter {

  constructor(){
    super();
    this._outputCounter = 0;
  }


  _run(){
    var that = this;
    this._outputCounter = 0;
    var inputCategories = this.getInputCategories();

    inputCategories.forEach( function(category){
      that._loadFile( category );
    })
  }


  /**
  * [PRIVATE]
  * Perform the loading for the input of the given category
  * @param {String} category - input category
   */
  _loadFile( category ){
    var that = this;
    var reader = new FileReader();

    reader.onloadend = function(event) {
        var result = event.target.result;
        that._output[ category ] = result;
        that._fileLoadCount();
    }

    reader.onerror = function() {
      this._output[ category ] = null;
      that._fileLoadCount();
      console.warn( "error reading file from category " + category );
      //throw new Error(error_message);
    };

    reader.readAsArrayBuffer( this._getInput(category) );
  }


  /**
  * [PRIVATE]
  * Launch the "ready" event if all files are loaded
  */
  _fileLoadCount(){
    var that = this;
    this._outputCounter ++;

    if( this._outputCounter == this.getNumberOfInputs() ){
      that._events.ready( this );
    }
  }

} /* END of class FileToArrayBufferReader */


export { FileToArrayBufferReader }
