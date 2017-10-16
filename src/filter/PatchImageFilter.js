/*
* Author   Jonathan Lurie - http://me.jonathanlurie.fr
* License  MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { Image2D } from '../core/Image2D.js';
import { ImageToImageFilter } from '../core/ImageToImageFilter.js';


/**
* A instance of PatchImageFilter will copy an Image2D into another at a given position.
* The same process can be repeated mutiple times so that the output is the result
* of several patched applied on a image with a solid color background.
* 
* **Usage**
* - [examples/patchImage2D.html](../examples/patchImage2D.html)
*
*/
class PatchImageFilter extends ImageToImageFilter {
  constructor(){
    super();
    this.addInputValidator(0, Image2D);
    // default image size does not allow to create an output
    this.setMetadata( "outputSize", {w: 0, h:0} );
    
    // defines the default background color for the output
    // This also defines the number of components per pixel (ncpp)
    this.setMetadata( "outputColor", [0, 0, 0, 255] );
    
    // position where to put the to left corner of the patch
    this.setMetadata( "patchPosition", {x:0, y:0} );
    
    // automatically turned to false at the end a every patching. Turning back
    // to true will make the filter generate a new output Image2D.
    this.setMetadata( "resetOutput", true );
    
    // Unlike most filters this one could be reuse to patch multiple times.
    // We have to by-pass the regulat this._output object because it is flushed
    // at the begining of every update()
    this._patchedOutput = null;
  }
  
  
  _run(){
    if( ! this.hasValidInput()){
      console.warn("A filter of type PatchImageFilter requires 1 input of category '0' (Image2D)");
      return;
    }
    
    var inputImage = this._getInput( 0 );
    var inputNcpp = inputImage.getNcpp();
    var inputWidth = inputImage.getWidth(); 
    var inputHeight = inputImage.getHeight();
    var outputSize = this.getMetadata( "outputSize" );
    
    if( outputSize.w == 0 || outputSize.h == 0 ){
      console.warn("The output image cannot have a size of (0, 0). Use .setMetadata( 'outputSize', {w: Number, h:Number} ) to specify a size.");
      return;
    }
    
    var outputColor = this.getMetadata( "outputColor" );
    
    if(! Array.isArray(outputColor) ){
      console.warn("The filter metadata 'outputColor' must be an Array of non null size.");
      return;
    }
    
    // of the output
    var ncpp = outputColor.length;
    
    if( inputNcpp != ncpp ){
      console.warn(`The Image2D specified in input has ${inputNcpp} ncpp while the output is configured with ${ncpp} ncpp. Unable to continue patching.`);
      return;
    }
    
    // We have two possibilities: creating a new output or patching into an existing one (outputImage)
    if( this.getMetadata("resetOutput") ){
      this._patchedOutput = new pixpipe.Image2D({width: outputSize.w, height: outputSize.h, color: outputColor});
    }
    
    this._output[0] = this._patchedOutput;

    var patchPosition = this.getMetadata( "patchPosition" );
    // just in case floating points coord were specified
    patchPosition.x = Math.round( patchPosition.x );
    patchPosition.y = Math.round( patchPosition.y );
    
    // checking if the patch will be out of the output boundaries
    if( (patchPosition.x + inputWidth) > outputSize.w || (patchPosition.y + inputHeight) > outputSize.h ||
         patchPosition.x <0 || patchPosition.y < 0)
    {
      console.warn("The patch is partly or totaly out of bound."); 
    }
    
    // along width of the input
    for( var i=0; i<inputWidth; i++){
      // along height of the input
      for( var j=0; j<inputHeight; j++){
        var patchColor = inputImage.getPixel({ x: i, y: j});
        this._patchedOutput.setPixel( {x: i+patchPosition.x, y: j+patchPosition.y}, patchColor );
      }
    }
    
    // by default, we want to continue patching the current output with other images
    this.setMetadata( "resetOutput", false );
    
    
  }
  
} /* END of class PatchImageFilter */


export { PatchImageFilter };
