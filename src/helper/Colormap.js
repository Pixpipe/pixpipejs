/*
* Author   Jonathan Lurie - http://me.jonathanlurie.fr
* License  MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


import { PixpipeObject } from '../core/PixpipeObject.js';
import { Image2D } from '../core/Image2D.js';
import { ColorScales } from './ColorScales.js';


/**
* A Colormap instance is a range of color and can be used in two ways. The first,
* is by getting a single color using `.getValueAt(p)` where `p` is a position in [0, 1] and, second,
* by building en entire LUT with a given granularity and then getting back these values.
* In case of intensive use (ie. applying fake colors), building a LUT is a faster option.
* Once a LUT is built,  an image of this LUT can be created (horizontal or vertical, flipped or not).
* The image will be flipped is the `flip` matadata is set to `true`;
* This image, which is an Image2D is not supposed to be used as a LUT but just as a visual reference.
*
* **Usage**
* - [examples/colormap.html](../examples/colormap.html)
*
*/
class Colormap extends PixpipeObject {

  /**
  * Build a colormap with some options.
  * @param {Object} options - here is the list of options:
  *     style {String} - one of the available styles (see property names in ColorScales.js)
  *     description {Object} - colormap description like in ColorScales.js. Can also be the equivalent JSON string.
  *     lutSize {Number} - Number of samples to pregenerate a LUT
  *     Note: "style" and "description" are mutually exclusive and "style" has the priority in case both are set.
  */
  constructor( options = {} ) {
    super();
    this._type = Colormap.TYPE();
    this._colormapDescription = null;
    this._LUT = [];
    this.setMetadata("flip", false);

    var style = this._getOption(options, "style", null);

    if( style ){
      this.setStyle( style );
    }else {
      var description = this._getOption(options, "description", null);
      this.setDescription( description );
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


  /**
  * [STATIC]
  * Get all the style id available
  * @return {Array} all the styles
  */
  static getAvailableStyles(){
    return Object.keys(ColorScales)
  }


  /**
  * Define the style of the colormap
  * @param {String} style - the colormap style. They are all listed with `Colormap.getAvailableStyles()`
  */
  setStyle( style ){
    if(style in ColorScales){
      if( this._validateDescription( ColorScales[ style ] ) ){
        this._colormapDescription = JSON.parse(JSON.stringify( ColorScales[ style ] ));
      }
    }else {
      console.warn("The given colormap style des not exist.");
    }
  }


  /**
  * Set the description of the colormap. See ColorScales.js for the format
  * @param {Object} d - description, can be the equivalent JSON string
  */
  setDescription( d ){
    // the description in argument can be a json string
    var description = typeof d === "string" ? JSON.parse( d ) : d;

    if(description && this._validateDescription(description) ){
      this._colormapDescription = description;
    }
  }


  /**
  * @private
  * Validates a colormap description integrity.
  * @return {Boolean} true is the description is valid, false if not
  */
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

    if( this._metadata.flip )
      position = 1 - position;

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
   * Get an interpolated value of a colormap but using a certain amount of color clustering
   * @param  {Number} position - normalized position on the color spectrum, from 0 to 1
   * @param  {Number} clusters - Number of clusters
   * @return {Array} A color [r, g, b]
   */
  getValueAtWithClusters( position, clusters ){
    var custeredPosition = ( (Math.floor(position * clusters) + 0.5) / clusters );
    return this.getValueAt( custeredPosition );
  }


  /**
  * Build a LUT from the colormap description
  * @param {Number} size - number of samples in the LUT
  */
  buildLut( size=Math.pow(2, 16) ){
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


  getLutAtNormalized( position ){
    var index = -1;

    if( position < 0 ){
      index = 0
    }else if( position < this._LUT.length  ){
      index = Math.floor( position * (this._LUT.length - 1) )
    }else{
      index = this._LUT.length - 1
    }

    return this._LUT[ index ];
  }


  /**
  * Creates a horizontal RGB Image2D of the colormap. The height is 1px and
  * the width is the size of the LUT currently in use.
  * A RGBA image can be created when passing the argument `forceRGBA` to `true`.
  * In this case, the alpha channel is `255`.
  * The image can be horizontally flipped when the "flip" metadata is true
  * @param {Boolean} forceRGBA - forces the creation of a RGBA image instead of a RGB image
  * @return {Image2D} the result image
  */
  createHorizontalLutImage( forceRGBA=false ){
    if(! this._LUT ){
      console.warn("The LUT must be built before creating a LUT image.");
      return;
    }

    var initColor = forceRGBA ? [0, 0, 0, 255] : [0, 0, 0];
    var LutSize = this._LUT.length;
    var colorStrip = new Image2D({width: LutSize, height: 1 , color: initColor});

    for(var i=0; i<LutSize; i++){
      colorStrip.setPixel( {x: i, y: 0},  this._LUT[ i ] );
    }

    return colorStrip;
  }


  /**
  * Creates a vertical RGB Image2D of the colormap. The height is 1px and
  * the width is the size of the LUT currently in use.
  * The image can be vertically flipped when the "flip" metadata is true
  * @param {Boolean} forceRGBA - forces the creation of a RGBA image instead of a RGB image
  * @return {Image2D} the result image
  */
  createVerticalLutImage( forceRGBA=false ){
    if(! this._LUT ){
      console.warn("The LUT must be built before creating a LUT image.");
      return;
    }

    var initColor = forceRGBA ? [0, 0, 0, 255] : [0, 0, 0];
    var LutSize = this._LUT.length;
    var colorStrip = new Image2D({width: 1, height: LutSize, color: initColor});

    for(var i=0; i<LutSize; i++){
      colorStrip.setPixel( {x: 0, y: i},  this._LUT[ i ] );
    }

    return colorStrip;
  }


  /**
  * Add a color to the color description. This color must be at a non-taken index
  * @param {Number} index - index to place the color, must be in [0, 1]
  * @param {Array} rgb - rgb array of the form [r, g, b], each value being in [0, 255]
  * @return {Boolean} true if the color was succesfully added, false if not
  */
  addColor( index, rgb ){
    // the colormap is possibly empty
    if( !this._colormapDescription ){
      this._colormapDescription = [];
    }

    if(index<0 || index>1){
      console.warn("The color cannot be added because its index is out of range [0, 1]");
      return false;
    }

    // checking if a color is already present at the given index
    var indexAlreadyPresent = this._colormapDescription.find(function(indexAndColor){
      return indexAndColor.index == index;
    })

    if( indexAlreadyPresent ){
      console.warn("A color is already present at index " + index);
      return false;
    }

    if( rgb && Array.isArray(rgb) && rgb.length == 3){
      for(var i=0; i<rgb.length; i++){
        if(typeof rgb[i] !== 'number' || rgb[i] < 0  || rgb[i] > 255){
          console.warn("The rgb colors must be in [0, 255]");
          return false;
        }
      }
    }else{
      console.warn("The color cannot be added because its rgb array is the wrong size.");
      return false;
    }

    // data integrity is ok
    this._colormapDescription.push({"index":index,"rgb":rgb.slice()})
    this._colormapDescription.sort(function(a, b) {
      return a.index - b.index;
    });

    return true;
  }


  /**
  * Remove the color at the given index
  * @param {Number} index - the [0, 1] index of the color to remove
  * @return {Boolean} true if successfully remove, false if not
  */
  removeColor( index ){
    if( !this._colormapDescription ){
      console.warn("The colormap description is empty.");
      return false;
    }

    var indexAlreadyIn = this._colormapDescription.findIndex(function(element){
      return (element.index == index);
    })

    if( indexAlreadyIn == -1 ){
      console.warn("Such index does not exist.");
      return false;
    }

    this._colormapDescription.splice(indexAlreadyIn, 1);
    return true;
  }


  /**
  * Get a json version of the colormap description
  * @return {String} the json string
  */
  toJson(){
    return JSON.stringify(this._colormapDescription);
  }


} /* END of class Colormap */

export { Colormap }
