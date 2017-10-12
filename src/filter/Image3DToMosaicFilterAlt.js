/*
* Author   Jonathan Lurie - http://me.jonathanlurie.fr
* License  MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


import { Filter } from '../core/Filter.js';
import { Image2D } from '../core/Image2D.js';
import { Image3DAlt } from '../core/Image3DAlt.js';


/**
* An instance of Image3DToMosaicFilterAlt takes an Image3D as Input and output a
* mosaic composed of each slice. The axis: "x", "y" or "z" can be
* specified with `setMetadata("axis", "x")`, the default being x.
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
* By setting the `time` metadata we can get a mosaic at a given time position,
* the default being `0`. If set to `-1`, then the filter outputs the whole time
* series.
*
* **Usage**
* - [examples/niftiToMosaic.html](../examples/niftiToMosaic.html)
*/
class Image3DToMosaicFilterAlt extends Filter{

  constructor(){
    super();
    //this.addInputValidator(0, Image3D);

    // default settings
    this.setMetadata("maxWidth", 4096);
    this.setMetadata("maxHeight", 4096);
    this.setMetadata("axis", "x");
    this.setMetadata("time", 0);
  }


  _run(){
    /*
    if(! this.hasValidInput() ){
      return;
    }
    */
    
    var inputImage3D = this._getInput(0);
    var dimensions = inputImage3D.getMetadata( "dimensions" );
    var dimIndex = inputImage3D.getDimensionIndexFromName( this.getMetadata("axis") );
    var dim = dimensions[ dimIndex ];
    var widthDim = dimensions[ dim.widthDimension ];
    var heightDim = dimensions[ dim.heightDimension ];
    var timeDimIndex = inputImage3D.getDimensionIndexFromName( "t" ); // possibly -1 if time is non existent
    var timeDim = null;
    if( timeDimIndex > -1 ){
      timeDim = dimensions[ timeDimIndex ];
    }
    
    //var spaceInfo = inputImage3D.getMetadata( this.getMetadata("axis") );
    
    /*
    if(!spaceInfo){
      console.warn("Sampling axis for mosaicing was not poperly set. Has to be 'x', 'y' or 'z'.");
      return;
    }
    */
    
    var numOfSlices = dim.length;
    var width = widthDim.length;
    var height = heightDim.length;
    
    // dealing with time series
    var startTime = 0;
    var endTime = 1;
    
    if( timeDim ){
      var timeLength = timeDim.length;
      
      if(this._metadata.time == -1 ){
        startTime = 0;
        endTime = timeLength;
      }else if( this._metadata.time < timeLength){
        startTime = this._metadata.time;
        endTime = startTime + 1;
      }
    }
    
    var numberOfSlicesWithTime = numOfSlices * (endTime-startTime);

    // number of image we can fit in the with and heigth of an output image
    var widthFit = Math.floor( this.getMetadata("maxWidth") / width );
    var heightFit = Math.floor( this.getMetadata("maxHeight") / height );

    // size of the ouput image(s)
    var outputWidth = widthFit * width;
    var outputHeight = heightFit * height;
    var slicePerOutputIm = widthFit * heightFit;

    // Number of output image(s) necessary to cover the whole Image3D dataset
    //var outputNecessary = Math.ceil( numOfSlices / slicePerOutputIm ); // does not work for time series
    var outputNecessary = Math.ceil( numberOfSlicesWithTime / slicePerOutputIm );

    // if only one output, maybe it's not filled entirely, so we can make it a bit smaller
    if( outputNecessary == 1){
      outputHeight = Math.ceil( numberOfSlicesWithTime / widthFit ) * height;
    }

    this.setMetadata("gridWidth", outputWidth / width);
    this.setMetadata("gridHeight", outputHeight / height);

    var outputCounter = 0;
    var sliceCounter = 0;
    var sliceIndexCurrentOutput = 0;

    var outImage = null;

    // the 3 following functions are a work around to fetch voxel along the right axis
    function fetchAlongx(i, j, sliceIndex, time){
      //return inputImage3D.getIntensity_xyz(sliceIndex, i, j, time)
      //return inputImage3D.getIntensity_xyzOrientation(sliceIndex, i, j, time)
      return inputImage3D.getVoxelSafe({i: sliceIndex, j: i , k: j});
    }

    function fetchAlongy(i, j, sliceIndex, time){
      //return inputImage3D.getIntensity_xyz(i, sliceIndex, j, time)
      //return inputImage3D.getIntensity_xyzOrientation(i, sliceIndex, j, time)
      return inputImage3D.getVoxelSafe({i: i, j: sliceIndex, k: j});
    }

    function fetchAlongz(i, j, sliceIndex, time){
      //return inputImage3D.getIntensity_xyz(i, j,  sliceIndex, time)
      //return inputImage3D.getIntensity_xyzOrientation(i, j,  sliceIndex, time);
      return inputImage3D.getVoxelSafe({i: i, j: j, k: sliceIndex});
    }

    var fetchAlongAxis = null;

    if( this._metadata.axis === "x")
      fetchAlongAxis = fetchAlongx;
    else if( this._metadata.axis === "y")
      fetchAlongAxis = fetchAlongy;
    else if( this._metadata.axis === "z")
      fetchAlongAxis = fetchAlongz;
    
    if( !fetchAlongAxis ){
      console.warn("The axis to sample along for the mosaic was not properly set.");
      return;
    }

    // to make it works no matter the ncpp
    var initPixel = new Array( inputImage3D.getMetadata("ncpp") ).fill(0);
    
    for(var t=startTime; t<endTime; t++){

      // for each slice
      for(var sliceIndex=0; sliceIndex<numOfSlices; sliceIndex++){
        
        // create a new output image when the current is full (or not init)
        if( sliceCounter%slicePerOutputIm == 0 ){
          outImage = new Image2D({width: outputWidth, height: outputHeight, color: initPixel});
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
            var voxelValue = [fetchAlongAxis(x, y,  sliceIndex, t)]
            
            outImage.setPixel(
              {x: offsetPixelCol+x, y: offsetPixelRow+(height - y - 1)},
              voxelValue
            )
          }
        } 
        sliceCounter ++;

      } /* END for each slice*/
    
    } /* END for each time sample */

  }

} /* END of class Image3DToMosaicFilterAlt */

export { Image3DToMosaicFilterAlt }
