/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { Image2D } from '../core/Image2D.js';
import { ImageToImageFilter } from '../core/ImageToImageFilter.js';


/**
* AngleToHueWheelHelper has for goal to help visualize angular data such as gradient
* orientation. The idea behind the "hue wheel" is to associate every direction (angle)
* to a color without having the 0/360 interuption.
* The helper takes one Image2D input and gives one RGBA Image2D output. From the output,
* the index of the compnent that contains angular information has to be given using:
* `.setMetadata("component", n)` where `n` by default is `0`.  
*
* Depending on the usage of this filter, the range of angle can varry,
* ie. in [0, 2PI] (the default), or in [-PI/2, PI/2] (in the case of a gradient)
* or even in degrees [0, 360]. In any case, use `.setMetadata("minAngle", ...)`
* and `.setMetadata("maxAngle", ...)`. 
* If the metadata "minAngle" or "maxAngle" is given the value "auto", then the min and max
* values of the image will be looked-up (or computed if not defined).
*
* **Usage**
* - [examples/gradientHueWheelImage2D.html](../examples/gradientHueWheelImage2D.html)
*
*/
class AngleToHueWheelHelper extends ImageToImageFilter {
  
  constructor(){
    super();
    this.addInputValidator(0, Image2D);
    this.setMetadata("component", 0);
    
    this.setMetadata("minAngle", 0);
    this.setMetadata("maxAngle", Math.PI/2);
  }
  
  
  _run(){
    // the input checking
    if( ! this.hasValidInput()){
      console.warn("A filter of type AngleToHueWheelHelper requires 1 input of category '0'.");
      return;
    }
    
    var that = this;
    
    var inputImage = this._getInput(0);
    var ncpp = inputImage.getNcpp();
    var component = this.getMetadata("component");
    
    if( component < 0 && component >= ncpp ){
      console.warn("The component to filter must be valid.");
      return;
    }
    
    var imageIn = this._getInput();
    var width = imageIn.getWidth();
    var height = imageIn.getHeight();
    var ncpp = imageIn.getNcpp();
    
    var minAngle = this.getMetadata("minAngle");
    var maxAngle = this.getMetadata("maxAngle");
    
    if(minAngle === "auto" || maxAngle === "auto"){
      minAngle = imageIn.getMin();
      maxAngle = imageIn.getMax();
    }
    
    var imageOut = new Image2D( {width: width, height: height, color: [0, 0, 0, 255] } );
    var forEachPixelFilter = new pixpipe.ForEachPixelImageFilter();
    
    // add the input input
    forEachPixelFilter.addInput( imageOut );

    forEachPixelFilter.on( "pixel", function(position, color){
      var angle = imageIn.getPixel( position )[component];
      var angle360 = ( (angle - minAngle) / (maxAngle - minAngle) ) * 360;
      var colorRGB = that._hsl2Rgba( angle360, 100, 50 );
      return colorRGB;
    });
    
    // run the filter to create a gradient image
    forEachPixelFilter.update();
    
    if( forEachPixelFilter.getNumberOfOutputs() == 0 ){
      console.warn("No output of ForEachPixelImageFilter.");
      return;
    }
    
    // mapping the output
    this._output[ 0 ] = forEachPixelFilter.getOutput();
    
  }
  
  
  /**
  * 
  * A part of this code was borrowed from github.com/netbeast/colorsys and modified.
  */
  _hsl2Rgba( h, s=100, l=100 ){
    // pseudo constants
    var HUE_MAX = 360;
    var SV_MAX = 100;
    var RGB_MAX = 255;
    
    // ouputs
    var r, g, b

    h = (h === HUE_MAX) ? 1 : (h % HUE_MAX / HUE_MAX)
    s = (s === SV_MAX) ? 1 : (s % SV_MAX / SV_MAX)
    l = (l === SV_MAX) ? 1 : (l % SV_MAX / SV_MAX)

    if (s === 0) {
      r = g = b = l // achromatic
    } else {
      var hue2rgb = function hue2rgb (p, q, t) {
        if (t < 0) t += 1
        if (t > 1) t -= 1
        if (t < 1 / 6) return p + (q - p) * 6 * t
        if (t < 1 / 2) return q
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
        return p
      }

      var q = l < 0.5 ? l * (1 + s) : l + s - l * s
      var p = 2 * l - q
      r = hue2rgb(p, q, h + 1 / 3)
      g = hue2rgb(p, q, h)
      b = hue2rgb(p, q, h - 1 / 3)
    }
    
    return [ Math.round(r * RGB_MAX), 
             Math.round(g * RGB_MAX), 
             Math.round(b * RGB_MAX),
             255 ];
  }
  
  
} /* END of class AngleToHueWheelFilter */

export { AngleToHueWheelHelper }
