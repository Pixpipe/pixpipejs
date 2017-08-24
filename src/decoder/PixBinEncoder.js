/*
* Author    Jonathan Lurie - http://me.jonahanlurie.fr
*
* License   MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import  { PixBinEncoder  as Encoder } from "pixbincodec"
import { Filter } from '../core/Filter.js';


/**
* A PixBinEncoder instance takes an Image2D or Image3D as input with `addInput(...)`
* and encode it so that it can be saved as a *.pixp file.
* An output filename can be specified using `.setMetadata("filename", "yourName.pixp");`,
* by default, the name is "untitled.pixp".
* When `update()` is called, a gzip blog is prepared as output[0] and can then be downloaded
* when calling the method `.download()`. The gzip blob could also be sent over AJAX
* using a third party library.
*
* **Usage**
* - [examples/savePixpFile.html](../examples/savePixpFile.html)
*/
class PixBinEncoder extends Filter {
  constructor(){
    super();

    // define if the encoder should compress the data, default: yes
    this.setMetadata("compress", true);
    
    // to be transmitted to the encoder
    this.setMetadata("description", "no description");
    this.setMetadata("madeWith", "Pixpipejs");
    this.setMetadata("userObject", null);
  }


  /**
  * [static]
  * the first sequence of bytes for a pixbin file is this ASCII string
  */
  static MAGIC_NUMBER(){
    return "PIXPIPE_PIXBIN";
  }


  _run(){
    var that = this;
    
    var encoder = new Encoder();
    
    // specifying some options
    encoder.enableDataCompression( this.getMetadata("compress") );
    encoder.setOption( 
      "userObject",
      this.getMetadata("userObject")
    )
    encoder.setOption( 
      "description",
      this.getMetadata("description")
    )
    encoder.setOption( 
      "madeWith",
      this.getMetadata("madeWith")
    )

    this._forEachInput(function( category, input ){
      encoder.addInput( input );
    });

    encoder.run();
    
    this._output[ 0 ] = encoder.getOutput();
  }


  /**
  * Download the generated file
  */
  /*
  download(){
    var output = this.getOutput();

    if(output){
      FileSaver.saveAs( this.getOutput(), this.getMetadata("filename"));
    }else{
      console.warn("No output computed yet.");
    }
  }
  */

} /* END of class PixBinEncoder */

export { PixBinEncoder }
