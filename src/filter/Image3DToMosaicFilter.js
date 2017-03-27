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
*
* usage: examples/niftiToMosaic.html
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

    // Number of output image(s) necessary to cover the whole Image3D dataset
    var outputNecessary = Math.ceil( numOfSlices / (widthFit*heightFit) );

    // for each output image
    for(var im=0; im<outputNecessary; im++){
      // creating the output image
      var outImage = new Image2D({width: outputWidth, height: outputHeight, color: [0]});
      this._output[ im ] = outImage;



      for(var sliceIndex=0; sliceIndex<numOfSlices; sliceIndex++){
        // slice from the input dataset
        var slice = inputImage3D.getSlice( this.getMetadata("axis") , sliceIndex);

        // for each tile-line in the output image
        for(var row=0; row<heightFit; row++){

          // for each tile-col in the output image
          for(var col=0; col<widthFit; col++){

            // for each row of the input slice
            for(var y=0; y<height; y++){

              // for each col of the output image
              for(var x=0; x<width; x++){
                outImage.setPixel(
                  {x: col*width+x, y:row*height+y},
                  slice.getPixel({x: x, y: y})
                )
              }
            }
          }
        }
      }


    }

  }

} /* END of class Image3DToMosaicFilter */

export { Image3DToMosaicFilter }
