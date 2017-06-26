/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


import { PixpipeObject } from '../core/PixpipeObject.js';
import { Image2D } from '../core/Image2D.js';
import { ForEachPixelImageFilter } from '../filter/ForEachPixelImageFilter.js';
import { ColorScales } from './ColorScales.js';


/**
*
*/
class Colormap extends PixpipeObject {
  
  /**
  * Build a colormap with some options.
  * @param {Object} options - here is the list of options:
  *     style {String} - one of the available styles (see property names in ColorScales.js)
  *     description {Object} - colormap description like in ColorScales.js.
  *     lutSize {Number} - Number of samples to pregenerate a LUT
  *     Note: "style" and "description" are mutually exclusive and "style" has the priority in case both are set.
  */
  constructor( options = {} ) {
    super();
    this._type = Colormap.TYPE();
    this._colormapDescription = null;
    this._LUT = [];
    
    var style = this._getOption(options, "style", null);
    
    if( style ){
      if(style in ColorScales){
        if( this._validateDescription( ColorScales[ style ] ) ){
          this._colormapDescription = ColorScales[ style ]
        }
      }else {
        console.warn("The given colormap style des not exist.");
      }
    }else {
      var description = this._getOption(options, "description", null);
      if( this._validateDescription(description) ){
        this._colormapDescription = description;
      }
    }
    
    if( this._colormapDescription ){
      var lutSize = this._getOption(options, "lutSize", null);
      if( lutSize ){
        this.buildLut( lutSize );
      }
    }
    
  }
  
  
  /**
  * Hardcode the datatype
  */
  static TYPE(){
    return "COLORMAP";
  }
  
  
  _validateDescription( d ){
    if( ! Array.isArray(d) ){
      console.warn("The colormap description has to be an Array");
      return false;
    }
      
    for(var i=0; i<d.length; i++){
      // each color segment is an object containing a position as 'index'
      // and an array of number as "rgb"
      
      // each is a non-null object 
      if( d[i] !== null && typeof d[i] === 'object' ){
        if( "index" in d[i] && "rgb" in d[i]){
          if(typeof d[i].index === 'number'){
            if( d[i].index < 0 || d[i].index >1 ){
              console.warn("Each colormap segment 'index' property should be in [0, 1]");
              return false;
            }
          }else{
            console.warn("Each colormap segment 'index' property should be a number.");
            return false;
          }
          
          // the rgb property has to be an array
          if( Array.isArray( d[i].rgb ) ){
            if(d[i].rgb.length == 3){
              for(var j=0; j<d[i].rgb.length; j++){
                if( d[i].rgb[j] < 0 || d[i].rgb[j] > 255 ){
                  console.warn("The colormap must have only values in [0, 255]");
                  return false;
                }
              }
            }else{
              console.warn("Each colormap segment 'rgb' should contain 3 values");
              return false;
            }
          }
        }else{
          console.warn("Each colormap segment must have a 'index' property and a 'rgb' property.");
          return false;
        }
      }else{
        console.warn("Each colormap segment must be a non-null object");
        return false;
      }
    }
    return true;
  }
  
  
  /**
  * Get the color at the colormap position
  * @param {Number} position - position within the colormap in [0, 1]
  * @return {Array} color array as [r, g, b] , values being in [0, 255]
  */
  getValueAt( position ){
    if( !this._colormapDescription ){
      console.warn("The colormap description is not defined.");
      return null;
    }
    
    // case 1: before the first "index" position
    if(position <= this._colormapDescription[0].index){
      return this._colormapDescription[0].rgb.slice()
    }
    
    // case 2: after the last "index" position
    if(position >= this._colormapDescription[this._colormapDescription.length - 1].index){
      return this._colormapDescription[this._colormapDescription.length - 1].rgb.slice()
    }
    
    // case 3: between 2 values of the descrition (most likely to happen)
    for(var i=0; i<this._colormapDescription.length-1; i++){
      if( position >= this._colormapDescription[i].index && position < this._colormapDescription[i+1].index ){
        
        var unitDistanceToFirst = (position - this._colormapDescription[i].index) / (this._colormapDescription[i+1].index -  this._colormapDescription[i].index);
        var unitDistanceToSecond = 1 - unitDistanceToFirst;
        
        var color = [
          Math.round(this._colormapDescription[i].rgb[0] * unitDistanceToSecond + this._colormapDescription[i+1].rgb[0] * unitDistanceToFirst), // R
          Math.round(this._colormapDescription[i].rgb[1] * unitDistanceToSecond + this._colormapDescription[i+1].rgb[1] * unitDistanceToFirst), // G
          Math.round(this._colormapDescription[i].rgb[2] * unitDistanceToSecond + this._colormapDescription[i+1].rgb[2] * unitDistanceToFirst), // B
        ]
        
        return color;
      }
    }
  }
  
  
  /**
  * Build a LUT from the colormap description
  * @param {Number} size - number of samples in the LUT
  */
  buildLut( size ){
    if( !this._colormapDescription ){
      console.warn("The colormap description is not defined, the LUT cannot be created");
      return null;
    }
    
    if( size < 0 ){
      console.warn("Size of the colormap can not be negative.");
      return;
    }
    
    this._LUT = new Array( size );
    
    for(var i=0; i<size; i++){
      this._LUT[i] = this.getValueAt( i/size  + 0.5/size );
    }
  }
  
  
  /**
  * Get the color within the internal LUT
  * @param {Number} index - the index in the LUT
  * @return {Array} color array as [r, g, b] , values being in [0, 255]
  */
  getLutAt( index ){
    if( index <0 || index > this._LUT.length )
      return null;
      
    return this._LUT[ index ];
  }
  
  
  /**
  * Creates an Image2D of a given size that display a horizontal gradient of the colormap
  * @param {Number} width - width of the image
  * @param {Number} height - height of the image
  * @return {Image2D} the result image
  */
  createHorizontalLutImage( width, height, flip=false ){
    if(! this._LUT ){
      console.warn("The LUT must be built before creating a LUT image.");
      return;
    }
    
    var that = this;
    var LutSize = this._LUT.length;
    var colorStrip = new Image2D({width: width, height: height, color: [0, 0, 0]});
    var forEachPixelFilter = new pixpipe.ForEachPixelImageFilter();
    forEachPixelFilter.addInput( colorStrip );
    
    forEachPixelFilter.on( "pixel", function(position, color){
      var positionInLut = Math.round( (position.x / (width-1)) * (LutSize-1) );
      
      if(flip)
        positionInLut = LutSize - positionInLut - 1
        
      return that._LUT[ positionInLut ];
    });
    
    forEachPixelFilter.update();
    return forEachPixelFilter.getOutput();
  }
  
  
  /**
  * Creates an Image2D of a given size that display a vertical gradient of the colormap
  * @param {Number} width - width of the image
  * @param {Number} height - height of the image
  * @return {Image2D} the result image
  */
  createVerticalLutImage( width, height, flip=false ){
    if(! this._LUT ){
      console.warn("The LUT must be built before creating a LUT image.");
      return;
    }
    
    var that = this;
    var LutSize = this._LUT.length;
    var colorStrip = new Image2D({width: width, height: height, color: [0, 0, 0]});
    var forEachPixelFilter = new pixpipe.ForEachPixelImageFilter();
    forEachPixelFilter.addInput( colorStrip );
    
    forEachPixelFilter.on( "pixel", function(position, color){
      var positionInLut = Math.round( (position.y / (height-1)) * (LutSize-1) );
      
      if(flip)
        positionInLut = LutSize - positionInLut - 1
        
      return that._LUT[ positionInLut ];
    });
    
    forEachPixelFilter.update();
    return forEachPixelFilter.getOutput();
  }
  
} /* END of class Colormap */

export { Colormap }
