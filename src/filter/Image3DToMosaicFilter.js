/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


import { Filter } from '../core/Filter.js';
import { Image2D } from '../core/Image2D.js';
import { Image3D } from '../core/Image3D.js';


/**
* An instance of Image3DToMosaicFilter takes an Image3D as Input and output a
* mosaic composed of each slice. The axis: "xspace", "yspace" or "zspace" can be
* specified with `setMetadata("axis", "xspace")`, the default being xspace.
* The default output image is 4096x4096 but these boundaries can be changed using
* `setMetadata("maxWidth", n)` and `setMetadata("maxHeight", m)`.
* These are boundaries so the size of the output image(s) will possibly be lower
* to not contain unused space.
* If mosaicing the whole given Image3D does not fit in maxWidth*maxHeight, more
* Image2D will be created and accessible through `getOutput(n)`.
* All output image have the same size so that the last one may have dead space.
* To know precisely the size of the output mosaic use `getMetadata("gridWidth")`
* and `getMetadata("gridHeight")`, this will give the number of slices used in
* horizontal and vertical respectively.
*
* **Usage**
* - [examples/niftiToMosaic.html](../examples/niftiToMosaic.html)
*/
class Image3DToMosaicFilter extends Filter{

  constructor(){
    super();
    this._inputValidator[ 0 ] = Image3D.TYPE();

    // default settings
    this.setMetadata("maxWidth", 4096);
    this.setMetadata("maxHeight", 4096);
    this.setMetadata("axis", "xspace")
  }


  _run(){
    if(! this.hasValidInput() ){
      return;
    }

    var inputImage3D = this._getInput(0);
    var spaceInfo = inputImage3D.getMetadata( this.getMetadata("axis") );

    if(!spaceInfo){
      console.warn("Sampling axis for mosaicing was not poperly set. Has to be 'xspace', 'yspace' or 'zspace'.");
      return;
    }

    var numOfSlices = spaceInfo.space_length;
    var width = spaceInfo.width;
    var height = spaceInfo.height;

    // number of image we can fit in the with of an output image
    var widthFit = Math.floor( this.getMetadata("maxWidth") / width );
    var heightFit = Math.floor( this.getMetadata("maxHeight") / height );

    // size of the ouput image(s)
    var outputWidth = widthFit * width;
    var outputHeight = heightFit * height;
    var slicePerOutputIm = widthFit * heightFit;

    // Number of output image(s) necessary to cover the whole Image3D dataset
    var outputNecessary = Math.ceil( numOfSlices / slicePerOutputIm );

    // if only one output, maybe it's not filled entirely, so we can make it a bit smaller
    if( outputNecessary == 1){
      outputHeight = Math.ceil( numOfSlices / widthFit ) * height;
    }

    this.setMetadata("gridWidth", outputWidth / width);
    this.setMetadata("gridHeight", outputHeight / height);

    var outputCounter = 0;
    var sliceIndex = 0;
    var sliceIndexCurrentOutput = 0;

    var outImage = null;

    

    // for each slice
    for(var sliceIndex; sliceIndex<numOfSlices; sliceIndex++){

      // fetching the slice
      var slice = inputImage3D.getSlice( this.getMetadata("axis") , sliceIndex);


      // create a new output image when the current is full (or not init)
      if( sliceIndex%slicePerOutputIm == 0 ){
        outImage = new Image2D({width: outputWidth, height: outputHeight, color: [0]});
        this._output[ outputCounter ] = outImage;
        sliceIndexCurrentOutput = 0;
        outputCounter++;
      }

      var col = sliceIndexCurrentOutput % widthFit;
      var row = Math.floor( sliceIndexCurrentOutput / widthFit );
      sliceIndexCurrentOutput ++;

      var offsetPixelCol = col * width;
      var offsetPixelRow = row * height;


      // for each row of the input slice
      for(var y=0; y<height; y++){
        // for each col of the output image
        for(var x=0; x<width; x++){
          outImage.setPixel(
            {x: offsetPixelCol+x, y: offsetPixelRow+y},
            slice.getPixel({x: x, y: y})
          )
        }
      }

    }


  }

} /* END of class Image3DToMosaicFilter */

export { Image3DToMosaicFilter }
