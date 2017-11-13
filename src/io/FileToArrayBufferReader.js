/*
* Author   Jonathan Lurie - http://me.jonathanlurie.fr
* License  MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


import md5 from 'js-md5';
import pako from 'pako';
import { CodecUtils } from 'codecutils';
import { Filter } from '../core/Filter.js';



/**
* Takes the File inputs from a HTML input of type "file" (aka. a file dialog), and reads it as a ArrayBuffer.
* Every File given in input should be added separately using `addInput( file[i], 'uniqueID' )`.
* The event "ready" must be set up ( using .on("ready", function(){}) ) and will
* be triggered when all the files given in input are translated into ArrayBuffers.
* Once ready, all the outputs are accecible using the same uniqueID with the
* method `getOutput("uniqueID")`.
* Gzip compressed files will be uncompressed.
*
* Once the filter is *updated*, you can query the `filenames` metadata (sorted by categories)
* and also the `checksums` metadata using `.getMetadata()`. This later metadata 
* give a unique *md5*, very convenient to compare if two files are actually the same.
* Note that in case the file is *gziped*, the checksum is computed on the raw file,
* not on the *un-gziped* buffer.
*
* It happens that a file is not binary but text, then, set the metadata "readAsText" to `true`.
*
* **Usage**
* - [examples/fileToArrayBuffer.html](../examples/fileToArrayBuffer.html)
*/
class FileToArrayBufferReader extends Filter {

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
    var readAsText = this.getMetadata("readAsText");

    // callback for reading the file as a text file
    var onLoadEndTextFile = function( event ){
      that.addTimeRecord("startRead");
      var result = event.target.result;
      
      // try to read as text, but it's not text.
      // Maybe it's a gz-compressed text file, so we have to read this file as a
      // binary and see if once compressed it has a valid text content
      if(!CodecUtils.isValidString(result)){
        reader.onloadend = onLoadEndBinaryFile;
        reader.readAsArrayBuffer( that._getInput(category) );
        return;
      }
      
      var filename = that._getInput(category).name;
      var basename = filename.split(/[\\/]/).pop();
      var extension = basename.split('.').pop();
      var checksum = md5( result );
      console.log( checksum );
      
      // few metadata for recognizing files (potentially)
      that._metadata.filenames[ category ] = basename;
      that._metadata.checksums[ category ] = checksum;
      
      that.addTimeRecord("endRead");
      var time = that.getTime("startRead", "endRead");
      console.log("Reading file took " + time + "ms.");
      
      that._output[ category ] = result;
      that._fileLoadCount();
    }
    
    // callback for reading the file as a binary file
    var onLoadEndBinaryFile = function( event ){
      that.addTimeRecord("startRead");
      
      var result = event.target.result;
      
      var filename = that._getInput(category).name;
      var basename = filename.split(/[\\/]/).pop();
      var extension = basename.split('.').pop();
      var checksum = md5( result );
      console.log( checksum );
      
      // few metadata for recognizing files (potentially)
      that._metadata.filenames[ category ] = basename;
      that._metadata.checksums[ category ] = checksum;

      if( extension.localeCompare("pixp") ){
        // trying to un-gzip it with Pako
        try {
          result = pako.inflate(result).buffer;
          console.log("File was un-gziped successfully");
        } catch (err) {
          console.log("Pako: not a gziped file (" + err + ")");
        }
      }
      
      // read the content as text (unicode, ASCII compatible)
      if( readAsText){
        var strResult = CodecUtils.arrayBufferToUnicode(result);
        if( !strResult ){
          console.warn("The content of this file is not a valid text. It could be read as a binary file if the metadata 'readAsText' is set to false.");
          return;
        }else{
          result = strResult;
        }
      }
      
      that.addTimeRecord("endRead");
      var time = that.getTime("startRead", "endRead");
      console.log("Reading file took " + time + "ms.");
      
      that._output[ category ] = result;
      that._fileLoadCount();
    }
    
    reader.onerror = function(e) {
      console.warn("ERROR");
      console.warn(e);
    }
    

    if(readAsText){
      reader.onloadend = onLoadEndTextFile;
      reader.readAsText( this._getInput(category) );
    }else{
      reader.onloadend = onLoadEndBinaryFile;
      reader.readAsArrayBuffer( this._getInput(category) );
    }
  }


  /**
  * [PRIVATE]
  * Launch the "ready" event if all files are loaded
  */
  _fileLoadCount(){
    var that = this;
    this._outputCounter ++;

    if( this._outputCounter == this.getNumberOfInputs() ){
      that.triggerEvent("ready");
    }
  }

} /* END of class FileToArrayBufferReader */


export { FileToArrayBufferReader }
