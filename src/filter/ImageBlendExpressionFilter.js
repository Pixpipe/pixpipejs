/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


import Parser from 'expr-eval'
import { Image2D } from '../core/Image2D.js';
import { ImageToImageFilter } from '../core/ImageToImageFilter.js';


/**
* An instance of ImageBlendExpressionFilter takes Image2D inputs, as many as
* we need as long as they have the same size and the same number of components
* per pixel.
* This filter blends images pixel values using a literal expression. This expression
* should be set using `setMetadata( "expresssion", "A * B" )` , where `A` and `B`
* are the categories set in input.
*
* Using a blending expression is the aesiest way to test a blending but it is a
* pretty slow process since the expresion has to be evaluated for every process.
* To speed-up your process, it is recomended to develop a new filter that does
* exactly (and only) the blending method you want.
*
* **usage**  
* - [examples/imageBlending.html](../examples/imageBlending.html)
* - [examples/imageBlending2.html](../examples/imageBlending2.html)
* - [examples/forEachPixelGradientBlend.html](../examples/forEachPixelGradientBlend.html)
*
*/
class ImageBlendExpressionFilter extends ImageToImageFilter {

  constructor(){
    super();
    this._addOutput( Image2D );
  }



  _run(){

    // the metadata was not set
    if(!this.hasMetadata("expression")){
      console.warn("A filter of type ImageBlendExpressionFilter requires a blending expression.\nUse 'setMetadata(\"expression\", \"...\")' to set it." );
      return;
    }

    if( !this.hasSameNcppInput() || !this.hasSameSizeInput() ){
      return;
    }

    if(!this.getNumberOfInputs()){
      console.warn("A filter of type ImageBlendExpressionFilter requires at least one input.");
      return;
    }

    var inputCategories = this.getInputCategories();
    var firstInput = this._getInput( inputCategories[0] );
    var outputBuffer = firstInput.getDataCopy();
    var parser = new Parser.Parser();
    var expr = parser.parse( this.getMetadata("expression") );

    for(var i=0; i<outputBuffer.length; i++){

      var evaluationData = {};
      for(var c=0; c<inputCategories.length; c++){
        evaluationData[ inputCategories[c] ] = this._getInput( inputCategories[c] ).getData()[i];
      }

      outputBuffer[i] = expr.evaluate( evaluationData );
    }

    // building the output
    var img2D = this.getOutput();

    img2D.setData(
      outputBuffer,
      firstInput.getWidth(),
      firstInput.getHeight()
    );

  }




} /* END of class ImageBlendExpressionFilter */


export { ImageBlendExpressionFilter }
