import FileSaver from 'file-saver';
import { Filter } from '../core/Filter.js';


/**
* An instance of BrowserDownloadBuffer takes an ArrayBuffer as input and triggers
* a download when `update()` is called. This is for **browser only**!  
* A filename must be specified using `.setMetadata( "filename", "myFile.ext" )`.
*
*/
class BrowserDownloadBuffer extends Filter {
  constructor(){
    super()
    this.addInputValidator(0, ArrayBuffer);
    this.setMetadata( "filename", null );
  }
  
  
  _run(){
    if(! this.hasValidInput() ){
      console.warn("BrowserDownloadBuffer uses only ArrayBuffer.");
      return;
    }
    
    var filename = this.getMetadata( "filename" );
    
    if( !filename ){
      console.warn("A filename must be specified. Use the method `.setMetadata('filename', 'theFile.ext')` on this filter.");
      return;
    }
    
    // making a blob
    var blob = new Blob( [this._getInput()], {type: 'application/octet-binary'} );
    
    // triggers the download of the file
    FileSaver.saveAs( blob, filename);
  }
  
} /* END of class BrowserDownloadBuffer */

export { BrowserDownloadBuffer }
