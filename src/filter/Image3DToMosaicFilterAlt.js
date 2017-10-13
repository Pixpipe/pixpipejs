/*
* Author   Jonathan Lurie - http://me.jonathanlurie.fr
* License  MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


import { Filter } from '../core/Filter.js';
import { Image2D } from '../core/Image2D.js';
import { Image3DAlt } from '../core/Image3DAlt.js';
import { PatchImageFilter } from '../filter/PatchImageFilter.js';



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
* - [examples/niftiToMosaicAlt.html](../examples/niftiToMosaicAlt.html)
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
    
    
    var inputImage3D = this._getInput(0);
    
    if( !inputImage3D ){
      console.warn("An Image3D is expected as input.");
      return;
    }
    
    var axis = this.getMetadata("axis");
    var sliceDimension = inputImage3D.getSliceSize( axis );
    var numberOfSlices = inputImage3D.getNumberOfSlices( axis );
    var numberOfTimeSamples = inputImage3D.getTimeLength();
    
    // dealing with time
    var startTime = 0;
    var endTime = 1;
    // we want slices of all the time samples
    if( this._metadata.time == -1 ){
      startTime = 0;
      endTime = numberOfTimeSamples;
    }else if( this._metadata.time >= 0 && this._metadata.time < numberOfTimeSamples){
      startTime = this._metadata.time;
      endTime = startTime + 1;
    }else{
      console.warn( `The required time sample is out of bound. Must be 0 <= t < ${numberOfTimeSamples}` );
      return;
    }
    var numberOfSlicesWithTime = numberOfSlices * (endTime-startTime);
    
    
    // dealing with output size and number of output
    var widthFit = Math.floor( this.getMetadata("maxWidth") / sliceDimension.w );
    var heightFit = Math.floor( this.getMetadata("maxHeight") / sliceDimension.h );
    
    // size of the ouput image(s)
    var outputWidth = widthFit * sliceDimension.w;
    var outputHeight = heightFit * sliceDimension.h;
    var nbOfSlicesPerOutputImg = widthFit * heightFit;

    // Number of output image(s) necessary to cover the whole Image3D dataset (on the time interval we want)
    var outputImagesNecessary = Math.ceil( numberOfSlicesWithTime / nbOfSlicesPerOutputImg );
    
    // if only one output, maybe it's not filled entirely, so we can make it a bit smaller
    if( outputImagesNecessary == 1){
      outputHeight = Math.ceil( numberOfSlicesWithTime / widthFit ) * sliceDimension.h;
    }

    this.setMetadata("gridWidth", outputWidth / sliceDimension.w);
    this.setMetadata("gridHeight", outputHeight / sliceDimension.h);
    
    // to make it works no matter the ncpp
    var initPixel = new Array( inputImage3D.getMetadata("ncpp") ).fill(0);
    
    var patchFilter = new PatchImageFilter();
    patchFilter.setMetadata( "time", false ); // we dont want to display the timer
    patchFilter.setMetadata( "outputSize", {w: outputWidth, h: outputHeight} );
    patchFilter.setMetadata( "outputColor", initPixel );

    
    var outputCounter = 0;
    var sliceCounter = 0;
    var sliceIndexCurrentOutput = 0;

    var outImage = null;
    
    
    
    // for each time sample
    for(var t=startTime; t<endTime; t++){
      // for each slice
      for(var sliceIndex=0; sliceIndex<numberOfSlices; sliceIndex++){
        
        // TODO this has to come first
        // create a new output image when the current is full (or not init)
        if( sliceCounter%nbOfSlicesPerOutputImg == 0 ){
          patchFilter.setMetadata( "resetOutput", true );
          sliceIndexCurrentOutput = 0;

        }

        var col = sliceIndexCurrentOutput % widthFit;
        var row = Math.floor( sliceIndexCurrentOutput / widthFit );
        

        var offsetPixelCol = col * sliceDimension.w;
        var offsetPixelRow = row * sliceDimension.h;
        
        // fetching the right slice
        var slice = inputImage3D.getSlice( axis, sliceIndex, t );
        patchFilter.addInput( slice );
        patchFilter.setMetadata( "patchPosition", {x: offsetPixelCol , y: offsetPixelRow} ); 
        patchFilter.update();
        
        
        if( sliceCounter%nbOfSlicesPerOutputImg == 0 ){
          this._output[ outputCounter ] = patchFilter.getOutput();
          outputCounter++;
        }
        
        sliceIndexCurrentOutput ++;
        sliceCounter++;
      }
    }
    
    
    // TODO to be tested on larger series
    //if(outputCounter == 0){
    //  this._output[ outputCounter ] = patchFilter.getOutput();
    //}
    
  }
    

} /* END of class Image3DToMosaicFilterAlt */

export { Image3DToMosaicFilterAlt };
