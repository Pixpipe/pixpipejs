[![Pixpipe.js](images/pixpipe256.png)](https://github.com/jonathanlurie/pixpipejs)


# Cookbook
This cookbook will help you to become familiar with the architecture of **Pixpipe.js**, to understand the code samples and eventually, create your own filters and structures.


# Table of content
- [Overview](#overview)
- [Projects used in Pixpipe](#projects-used-in-pixpipe)
- [Core architecture](#core-architecture)
  - [PixpipeObject](#pixpipeobject)
  - [PixpipeContainer](pixpipecontainer)
  - [Image2D](#image2d)
  - [Image3D](#image3d)
  - [MniVolume](#mnivolume)
  - [Filter](#filter)
  - [ImageToImageFilter](#imagetoimagefilter)
- [Building Pixpipe](#building-pixpipe)
- [Building the documentation](#building-the-documentation)
- [Learning with examples](#learning-with-examples)
- [Create your own custom filter](#create-your-own-custom-filter)
  - [What should my filter inherit from?](#what-should-my-filter-inherit-from)
  - [What are inputs and outputs?](#what-are-inputs-and-outputs)
  - [What are metadata?](#what-are-metadata)
  - [Can I add class attributes?](#can-i-add-class-attributes)
  - [How to make the filter runnable?](#how-to-make-the-filter-runnable)
  - [Keep in mind](#keep-in-mind)
  - [Register your filter](#register-your-filter)
  - [Simple example](#simple-example)
    - [First, the structure](#first-the-structure)
    - [Adding the constructor](#adding-the-constructor)
    - [The _run() method](#the-run-method)
    - [Could we do it another way?](#could-we-do-it-another-way)
- [Events in filters](#events-in-filters)
  - [Examples](#examples)
  - [Events methods available](#events-methods-available)
- [Measuring time](#measuring-time)
- [Various optimizations](#various-optimizations)


# Overview
The point of Pixpipe is to be easy to use and easy to contribute to. This goal leads to take some decisions:  
- using a source bundler ([Rollup](http://rollupjs.org/))
- properly define a folder hierarchy within `src`:
  - `core` for the most low level *interfaces* and *classes*
  - `decoder` for specific file decoding and encoding
  - `filter` for all the filters (this could be arranged in a better way)
  - `helper` are like filters but the processing they provide is to help visualize data, rather that applying a scientifically relevant treatment. (ie. apply a colormap)
  - `io` for downloading/reading/writing files from the filesystem or AJAX
  - `pixpipe.js` the main entry point where are listed all the modules
- A modular approach and a clear separation of objects.
- Once built, Pixpipe is only a single file, located in `dist`, so that's it's easy to import


# Projects used in Pixpipe
Sometimes, it's just not worth reinventing the wheel. Here are the libraries Pixpipe uses and includes at build time:
- [Pako](https://github.com/nodeca/pako), for high speed file compression/decompression in JS.
- [FileSaver.js](https://github.com/eligrey/FileSaver.js), to easily trigger file downloading to the user side
- [expr-eval](https://github.com/silentmatt/expr-eval), to evaluate math expression and create quick filter prototype
- [js-md5](https://github.com/emn178/js-md5), to generate a unique checksum for each loaded files
- [geotiff](https://github.com/constantinius/geotiff.js) to decode Tiff and BigTiff images


# Core architecture
Pixpipe is strongly *object oriented* and relies a lot on inheritance. As said in the `readme`, it was inspired by *ITK* for its genericity because it makes the pipeline scalable and modular.  
Everything you can find in `src/core` is the **core**. Easy. Let's see how it looks like:  

![Pixpipe core](images/pixpipeCore.png)

As you can see, the core elements can be described like that: **containers** on one side and **processors** on the other.


## Core elements in detail
### PixpipeObject
*generic interface*  
The most generic! You cannot do anything with it except extending it and **every** object in Pixpipe is (and must be) a `PixpipeObject`.  
`PixpipeObject`is an `interface`, it implements the following features:  
- **UUID**: a unique identifier for each and every object created in the pipeline. Since it is not practical to access memory addresses in Javascript, this is very useful for debugging your program and make sure that "This is the deep copy of an object rather than a pointer to the same address".
- **Metadata**: every description, setting or relevant piece of information **must** be stored in metadata, all the methods to create/read/modify are here. Don't put large arrays of data here, and don't put TypedArrays as it does not play well with serialization (see: pixp format).
- **Type**: every object must have a type descriptor (String). It can be there own or the type of their mother class. For example `Image3D` has the type *"IMAGE3D"* and `MniVolume` does not overwrite it, hence, it also has the type descriptor *"IMAGE3D"*. This is mainly used to ensure compatibility between data containers.


### PixpipeContainer
*container interface*  
So far, a `PixpipeObject` is still not containing any data, only a few metadata. To fix that and create a proper container able to store a large amount of data, `PixpipeContainer` introduces a new attribute: `_data`.  
Initialize to `null`, we profit from Javascript's dynamic typing ability to make it store whatever we want.  
For the sake of easily creating a specialized object from a pixp file, this interface also implements `setRawMetadata()` and `setRawMetadata()` but don't use them too much since there is absolutely no control, just raw object pointer attribution.
This is still an `interface` and even though you could probably use it *as-is*, this is not the point.


### Image2D
*container*  
One of the most important containers, it is made to store 2D image datasets, for example coming from a *jpeg** image.  
This class contains everything needed to initialize, get and set pixel values.  
The information of *width*, *height* and *ncpp* (number of components per pixel, 3 for RGB, 4 for RGBA) are all stored into *metadata* but they can all be fetched using dedicated *getters*.  
In term of dimensionality, `Image2D` pixels are stored *row-wise* in a 1D TypedArray: the whole line1 RGBARGBA followed by the second line2, etc.


### Image3D
*container*  
The equivalent of `Image2D` for 3d datasets. Unlike 2D datasets, 3D ones have a parametric dimensionality order. By default, the largest dimensionality is along `xspace` and the smallest is along `zspace`. Since all dimensionality information are stored in metadata, the order can be changed, especially when initializing the Image3D with `setData()` with the appropriate `options`.  
`Image3D` have the *built-in*  ability to export `Image2D` object of slices (at a given position along a given axis) without using an external filter.


### MniVolume
*container*  
This object is motivated by the medical dataset used internally in the (Montreal Neurological Institute)[http://www.mcgill.ca/neuro/about], in particular [NIfTI](https://nifti.nimh.nih.gov/) and [Minc2](http://journal.frontiersin.org/article/10.3389/fninf.2016.00035/full). They are respectively created by `NiftiDecoder` and `Minc2Decoder`. Keep in mind `MniVolumes` are `Image3D` and uses the same methods.


### Filter
*processor interface*  
A `Filter`'s job is to process an input data in a **non-destructive** way and output another data. `Filter` is an interface, it cannot be used *as-is*, and you'll need to extend it to implement your own filter.  
Filters' input can be of any type or Object (`Image2D`, `Image3D`, `ArrayBuffer`, `JSON`, etc.) and must always be set using the method `.addInput( Object, category)` where `Object` is the input object itself and `category` is a `Number` or a `String` that will be used as an internal identifier. Most of the time it is convenient to use an incremental integer as a category but if your needs only *one* input, the argument `category` is optional and the category `0` will be given.  
Launching a filter is mandatory in order to get any output, this is done by calling the method `.update()`. Though, you will have to implement the method `._run()` (no argument) and possibly some other internal private method to help `_run` to do the job.  
When `.update()` is done, a filter is ready to give some output, using the method `.getOutput(category)`, when category is an optional identifier (default: 0).  

If you happen to create your own custom filter, **always** add some input verification before doing any real job using *inputs*. This is better than throwing exceptions away and breaking the pipeline.


### ImageToImageFilter
*processor interface*  
This extends `Filter` but still does not process anything. This is again an interface for any custom filter that would input one or multiple `Image2D` and output one `Image2D` (actually, this is not strictly required, it could output anything else, like statistics for examples).  
`ImageToImageFilter` provides a method to check if all the input `Image2D` have the same size: `.hasSameSizeInput()` and if they have the same number of components per pixel: `.hasSameNcppInput()`. These two methods should be called at the beginning of the `._run()` method, but if your custom filter happens *not* to need these verifications, then simply don't call them.  


# Building Pixpipe
By default, Pixpipe already comes with a built version in the `dist` directory. Still, if you modify it, you may want to build your own version.  
In this case, clone it or download it from the *master*, then, open a terminal, and:  

```bash
$ cd pixpipejs
$ npm install
$ npm run build
```

This will generate a *bundled* file in the `dist` directory (replacing the default one). This single source file can be imported in a *html* page like any other js file:

```html
<script src="a/path/to/pixpipe.js"></script>
```

Note that Pixpipejs is developed using ES6 and might not be compatible with older browsers -- Google closure compiler to the rescue! In addition, to provide a nice and easy way to minify the built version, it also transpiles the codebase into ES5. Here is the command:

```bash
$ npm run build
$ npm run min
```

**Note** Pixpipe does not use an npm minifier plugin because it's codebase is too large, thus it uses directly the closure compiler from Google (see `closurecompiler` folder).


# Building the documentation
Pixpipejs uses [DocumentationJS](http://documentation.js.org/) to generate a HTML documentation. It uses *JSDoc* syntax and is generated with the following command:

```bash
$ npm run doc
```

Then, the documentation is accessible in the `doc` folder or can be directly read [here](http://me.jonathanlurie.fr/pixpipejs/doc/).


# Learning with examples
The following examples are a nice and easy way to progressively go through using Pixpipe, from the basics to advanced. It is important to understand how to use Pixpipe before trying to develop your own filters in order to respect the coherence that makes it easy to use on the long shot.  
Before starting, remember these two things:
- When it comes to data (Image2D, Image3D) a filter takes one or more input (`addInput(...)`), must be ran using `update()` and gives one or more output (`getOutput()`).
- When it comes to metadata (particular setting, overwriting a default algorithm value, etc.), the filter method `.setMetadata(...)` must be called.

Processing images usually take a bit of time but there is not always a graphic feedback. Open your javascript console so that you can see the filter feedback in the log.  
All the following examples are in the [example folder](https://github.com/jonathanlurie/pixpipejs/tree/master/examples).


## basics
Here, we will learn what is an `Image2D`, how to display it in a canvas using `CanvasImageWriter`. In addition, we have two different ways to load an existing image: from its URL (using a `UrlImageReader`) or with a file dialog (using a `FileImageReader`).
- [Create an Image2D and display it](http://me.jonathanlurie.fr/pixpipejs/examples/image2DToCanvas.html) | [source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/image2DToCanvas.html)
- [Create an Image2D from an image URL and display it](http://me.jonathanlurie.fr/pixpipejs/examples/urlToImage2D.html) | [source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/urlToImage2D.html)
- [Same but with multiple images](http://me.jonathanlurie.fr/pixpipejs/examples/urlToImage2D_multiple.html) | [source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/urlToImage2D_multiple.html)
- [Create an Image2D from a local file and display it](http://me.jonathanlurie.fr/pixpipejs/examples/fileToImage2D.html) | [source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/fileToImage2D.html)
- [Open a Tiff and make it an Image2D](http://me.jonathanlurie.fr/pixpipejs/examples/fileToTiff.html) | [source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/fileToTiff.html)


## Simple filters for Image2D
See a `Filter` as a *box* that takes one or more input and produces one or more output. If some parameters are needed to make the filter work properly, this must happen using `setMetadata()`. To ask the filter to do its job, just call `update()`.  
A `Filter` should **NEVER** modify the input data.
- [The filter that lets you apply a treatment at a pixel level](http://me.jonathanlurie.fr/pixpipejs/examples/forEachPixel.html) | [source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/forEachPixel.html)
- [A pixel-wise filter that uses pixel position to adapt its behaviour](http://me.jonathanlurie.fr/pixpipejs/examples/forEachPixelGradient.html) | [source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/forEachPixelGradient.html)
- [Use a math expression evaluator to blend an image and a mask](http://me.jonathanlurie.fr/pixpipejs/examples/imageBlending.html) | [source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/imageBlending.html)
- [Use a math expression evaluator to blend two images](http://me.jonathanlurie.fr/pixpipejs/examples/imageBlending2.html) | [source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/imageBlending2.html)
- [Create a pattern and blend it with an image using a math expression evaluator](http://me.jonathanlurie.fr/pixpipejs/examples/forEachPixelGradientBlend.html) | [source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/forEachPixelGradientBlend.html)
- [Save a Image2D to a `*.pixp` file](http://me.jonathanlurie.fr/pixpipejs/examples/savePixpFile.html) | [source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/savePixpFile.html)
- [Load a `*.pixp` file that contains an Image2D and display it](http://me.jonathanlurie.fr/pixpipejs/examples/pixpFileToImage2D.html) | [source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/pixpFileToImage2D.html)
- [Multiply an image by another](http://me.jonathanlurie.fr/pixpipejs/examples/multiplyImage2D.html) | [source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/multiplyImage2D.html)
- [Open a Tiff and display its pixel values in csv format](http://me.jonathanlurie.fr/pixpipejs/examples/tiffPixelData.html) | [source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/tiffPixelData.html)
- [Compute the dx and dy derivatives of an image](http://me.jonathanlurie.fr/pixpipejs/examples/derivativeImage2D.html) | [source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/derivativeImage2D.html)
- [Compute the gradient direction and magnitude of an image](http://me.jonathanlurie.fr/pixpipejs/examples/gradientImage2D.html) | [source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/gradientImage2D.html)

## Playing with 3D medical dataset
- [Open a local Minc2 file, extract 3 orthogonal slices and display in canvas](http://me.jonathanlurie.fr/pixpipejs/examples/fileToMinc2.html) | [source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/fileToMinc2.html)
- [Open a local  NIfTI file, extract 3 orthogonal slices and display in canvas](http://me.jonathanlurie.fr/pixpipejs/examples/fileToNifti.html) | [source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/fileToNifti.html)
- [Convert a Minc2 file into a generic `*.pixp` file](http://me.jonathanlurie.fr/pixpipejs/examples/Minc2ToPixpFile.html) | [source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/Minc2ToPixpFile.html)
- [Open a `*.pixp` containing an Image3D file and display 3 otho slices](http://me.jonathanlurie.fr/pixpipejs/examples/Minc2ToPixpFile.html) | [source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/Minc2ToPixpFile.html)

## Playing with vectors
- [Detect contours as a LineString](http://me.jonathanlurie.fr/pixpipejs/examples/contourImage2D.html) | [source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/contourImage2D.html)

## Advanced
- [Open a local file as an ArrayBuffer](http://me.jonathanlurie.fr/pixpipejs/examples/fileToArrayBuffer.html) | [source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/fileToArrayBuffer.html). Actually very simple but a good starting point to create a new binary file parser
- [Open a local  NIfTI file and display a mosaic of all the slices](http://me.jonathanlurie.fr/pixpipejs/examples/niftiToMosaic.html) | [source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/niftiToMosaic.html)
- [Open a Structural volume file (NIfTI, Minc2, Pixp), build a 3D texture and display volume with obliques](http://me.jonathanlurie.fr/pixpipejs/examples/volume3DNavigator.html) | [source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/volume3DNavigator.html)


# Create your own custom filter
As mentioned earlier, a filter must take at least one input et retrieve at least one output, in between the method `.update()` must be called. The only exception to that are `io` filters which are opening or writing from/to a file or an HTML5 canvas.  


## What should my filter inherit from?
All filter should inherit from `Filter`, but some subtypes can also be used. For example, your custom filter can inherit from the class/interface `ImageToImageFilter`, which has the advantage of having some Image2D checking method already built-in.

The class `ImageToImageFilter` itself also inherit from `Filter` and we could imagine creating other *interface* filters that carry some specific logic but no actual data processing. 


## What are inputs and outputs?
Input and output data can be of different types but are usually `Image2D` or `Image3D`. They are stored in the already-existing `Filter`'s class attribute `this._input` and `this._output`. These two objects are actually *maps* and need an ID, here called a **category**.

A *category* is just a way to give an identifier when adding an input (externally) or an output (internally, to create it). If your filter needs only a single input, adding a category is optional (*"0"* will be given). Same thing for the output, if your filter creates only one, then it's category should be *"0"* because the method `.getOutput()` uses a default value *"0"* for the *category* argument. The concept of *category* comes in very handy when your filter has to manage multiple I/O.

From outside of your custom filter, here are the methods you can use, without having to implement them since they are part of `Filter` class:

```javascript
// Create a instance of your custom filter 
var myFilter = new pixpipe.MyCustomFilterType();

// we have only one input, no need to specify a category
myFilter.addInput( myImage2D );

// if we have more than one input, we identify them with a "category"
myFilter.addInput( myImage2D_1, 0);
myFilter.addInput( myImage2D_2, 1);

// Note that the category can also be a String
myFilter.addInput( myImage2D_1, "image_one");
myFilter.addInput( myImage2D_2, "image_two");
...

// run the filter
myFilter.update()
...

// If your filter has a single output, no need to 
var myOutput = myFilter.getOutput();

// If your filter has more than one output
var myFirstOutput = myFilter.getOutput(0);
var myFirstOutput = myFilter.getOutput(1);

// Note that the category can also be a String
var myFirstOutput = myFilter.getOutput("the_noise_image");
var myFirstOutput = myFilter.getOutput("the_signal_image");

// get the number of input categories (already given)
var numOfInputs = myFilter.getNumberOfInputs();

// get the number of output categories
var numOfOutputs = myFilter.getNumberOfOutputs();

// You can also batch process the outputs
myFilter.forEachOutput( function( category, outputObject ){
  // do something
});

// to know if a filter has an output of a given category
if( myFilter.hasInputOfCategory("the_signal_image") ){
  // do something
}

// get the list of all input categories given to the filter
var allInputCat = myFilter.getInputCategories();

// get the list of all output categories given to the filter
var allOutputCat = myFilter.getOutputCategories();

// tells if after calling update() there is at least one output created
var isReady = myFilter.hasOutputReady();

```

From the inside of your filter, there are a few other (supposedly private) I/O-related methods:

```javascript
// get an input when we know we have only one
var theInput = this._getInput();

// get an input of a given category
var theInput = this._getInput("image_one");

// batch process the inputs, when we have many of them
this._forEachInput( function(category, inputObject){
  // do something with each input
})

// add a new output of a given type that encapsulate the category checking
this._addOutput( Image2D );

// the same but with a given category
this._addOutput( Image2D, "the_first_output" );

// then retrieve the blank output 
var outputImg = this.getOutput();

// and initialize it with real values
outputImg.setData(
  bufferCopy,
  inputImage2D.getWidth(),
  inputImage2D.getHeight(),
  inputImage2D.getComponentsPerPixel()
);

```


## What are metadata?
A filter can also accept any kind of metadata so that it can do it's job properly.  
In the case of a filter that performs an algorithm, all the settings must be stored as *metadata* and we strongly discourage to use *class attributes* for that. As show on the [diagram](#core-architecture), the metadata logic is hosted by the class/interface `PixpipeObject`, of which inherits `Filter` and every other object that belong to the Pixpipe project.

Here are the metadata-related methods you can use from the outside:

```javascript
// Create a instance of your custom filter 
var myFilter = new pixpipe.MyCustomFilterType();

// Specify a metadata
myFilter.setMetadata("threshold", 100);

// retrieve a metadata
var threshold = getMetadata("threshold");

// check the existance of a given metadata
if( myFilter.hasMetadata( "threshold" ) ){
  // do something
}

// retrieve all the metadata names already specified
var allMetaNames = myFilter.getMetadataKeys();

// Copy all the metadata from another object
myFilter.copyMetadataFrom( anotherFilter );
```


## Can I add class attributes?
Yes, like any other *class*, your custom filter can use attributes to store temporary data, but not for inputs, outputs or metadata of major importance.


## How to make the filter runnable?
As seen earlier, to run a filter, the method `.update()` should be called, though, the method that should be implemented in every new custom filter is `_run()`.  

The `_run()` method is called by `update()` along with some others. It should perform the reading of inputs, the processing and the writing of outputs. 

**A FILTER SHOULD NEVER ALTER THE INPUT**.


## Keep in mind
A filter may need to be compatible with different kind of inputs and it is to the discretion of the developer to make it properly. For example, a filter that takes *Image2D* as input has to deal with a variable number of component per pixel so that it behaves in an expected way with a single-band image (b&w) but also with an RGB or RGBA image.  

If a filter can deal only with a certain kind of input, it should be explicitly stated in the documentation.


## Register your filter
To make your custom filter accessible when building Pixpipe, you must register it in the file `src/pixpipe.js`.


## Simple example
The filter `filter/SimpleThresholdFilter.js` is a pretty simple example of how it works. A simple way to see how it works is by checking the example `examples/imageThresholding.html`. The following is a step-by-step explanation of what happens in this filter.


### First, the structure  
The structure is quite basic and very ES6-style.
```javascript
// make Image2D and ImageToImageFilter visible from here because we will use them
import { Image2D } from '../core/Image2D.js';
import { ImageToImageFilter } from '../core/ImageToImageFilter.js';

// Our new class SimpleThresholdFilter extends from the interface ImageToImageFilter
class SimpleThresholdFilter extends ImageToImageFilter {
  constructor(){
    // ... to be implemented
  }
  
  _run(){
    // ... to be implemented
  }
  
} /* END of class SimpleThresholdFilter */

// make SimpleThresholdFilter importable
export { SimpleThresholdFilter }
```

Depending on what your own filter will do, you may want to inherit directly from `Filter` rather than from `ImageToImageFilter`. It's up to you and like usually in programming, it's not like there is a single right answer.


### Adding the constructor
Since we inherit from a class, the first thing to do in the constructor is to call the constructor of the parent class using `super()`:

```javascript
// make Image2D and ImageToImageFilter visible from here because we will use them
import { Image2D } from '../core/Image2D.js';
import { ImageToImageFilter } from '../core/ImageToImageFilter.js';

// Our new class SimpleThresholdFilter extends from the interface ImageToImageFilter
class SimpleThresholdFilter extends ImageToImageFilter {

  constructor(){
    super();
    
    // default values
    this.setMetadata("threshold", 128);
    this.setMetadata("lowValue", 0);
    this.setMetadata("highValue", 255);
    this.setMetadata("preserveAlpha", true);
  }
  
  
  _run(){
    // ... to be implemented
  }
  
} /* END of class SimpleThresholdFilter */

// make SimpleThresholdFilter importable
export { SimpleThresholdFilter }
```
You know how a threshold works, right? under a certain value a pixel is set to black and over, it's set to white. But, we have to take in consideration two more things:
1. Our image may have more than 8bit per pixel (standard [0, 255]) but could be float [0.0, 1.0], 12bit ints [0, 4096], 16bits ints [0, 65535], etc.
2. Our image may have 1, or 3 or 4 or more channels. For the sake of simplicity, we will make this filter compatible with single band (intensity), 3 bands (RGB) and 4 bands (RGBA) images.

Still, we want our filter to have built-in default values for the `threshold`, the value to give when under(`lowValue`), the value to give when over (`highValue`) and also if we should preserve the transparency in the case of RGBA images (`preserveAlpha`).


### The \_run() method
All the following takes place in the scope of the `_run()` method, like here:

```javascript
...

_run(){
  // HERE!
}

...
```

Remember `_run()` is called when you explicitely call `update()`, and you should not call `_run()` directly!  
At this stage, if your filter *runs*, it means it **should** already have an input. Let's make sure of it:

```javascript
// the input checking
// the input checking
if( ! this.hasValidInput())
  return;
...
```

The method `hasValidInput()` is a legacy from the class `Filter`. It checks if a filters input is actually like it should be. Since our filter inherits from `ImageToImageFilter`, it's constructor (when calling `super()`) already register that the filter should expect an input of type `Image2D` and of *category* "0".  

To manually add an expected input, just add an entry to the `inputValidator` by calling the method `this.addInputValidator` from the constructor (after `super()`). For example, if our filter was requiring 2 `Image2D` of category 0 and 1, then we would add that to the constructor:

```javascript
this.addInputValidator(0, Image2D);
this.addInputValidator(1, Image2D);
```

Then, in `_run()`, calling `hasValidInput()` in a *if* statement would make sure our input are actually two `Image2D` of the given categories.  
If we have no input, we just quit with a warning message. There is no exception to launch, we just don't have any input, it's not a big deal and we may want to add one later.

Next, we build some local variables. In Pixpipe, we will often be fetching very large TypedArrays think of it like that: a 1000px by 1000px png (most likely RGBA) is already an array of size 4 million! And nowadays, 1000px by 1000px is not that much so we always have to think about little optimizations because, on a large scale, they will matter **a lot**.  
So, why local variables? Simply because in Javascript they are faster to fetch than complex objects. Here is how:

```javascript
...

var inputImg = this._getInput( 0 );

// Number of bands
var ncpp = inputImg.getComponentsPerPixel();

// having a local value is faster than fetching an object
var threshold = this.getMetadata("threshold");
var lowValue = this.getMetadata("lowValue");
var highValue = this.getMetadata("highValue");

...
```

Then we will start to create the content of our output image, but not the `Image2D` object yet. First we *copy* the data array of the input image - copy in the sense of **duplicate** (and not copy of *reference*):

```javascript
...

// get a copy of the input buffer so that we dont overwrite it!
var outputBuffer = inputImg.getDataCopy();

...
```

If we wanted to get a reference to the original data array of the input image, we would have used `inputImg.getData()` instead of `inputImg.getDataCopy()`. Then modifying the array would change the content of the input image and we don't want that.

Now, we are dealing with checking the number of components per pixel, remember, we want this filter to accept only 1, 3 and 4 components images:

```javascript
...

// if the input image has:
// - a single band, OR
// - three bands (assuming RGB), OR
// - four bands (assuming RGBA)
if(ncpp == 1 || ncpp == 3 || ncpp == 4){

  // later, a few things will go here
  
}else{
  outputBuffer = null;
  console.warn("The input data must have 1, 3 or 4 components per pixel.");
  return;
}

...
```

As you can see, if the number of components per pixel (aka. `ncpp` or as previously said *channels*) is not like we want, we just quit the function before having mapped any output. Still, we want to rush the *garbage collector* and remain with a potentially large array copied in memory, so we call `outputBuffer = null;`. Though this is not mandatory and the *garbage collector* will come anyway.

Then, let's fill this `if`:

```javascript
...
if(ncpp == 1 || ncpp == 3 || ncpp == 4){


  /**************** PART 1 *********************************************/
  
  // we want to preserve transparency ( = not affected by thresholding)
  if( this.getMetadata("preserveAlpha") && ncpp == 4){
    
  /**************** PART 1.1 *********************************************/
    for(var i=0; i<outputBuffer.length; i++){
      // every four band is an alpha band
      if(i%4 == 3){
        continue;
      }
      outputBuffer[i] = outputBuffer[i] < threshold ? lowValue : highValue;
    }
    
  // transparency is altered by the threshold like any other channel
  }else{
  /**************** PART 1.2 *********************************************/
    for(var i=0; i<outputBuffer.length; i++){
      outputBuffer[i] = outputBuffer[i] < threshold ? lowValue : highValue;
    }
  }

  /**************** PART 2 *********************************************/
  
  /**************** PART 2.1 *********************************************/
  // creating a blank Image2D output and getting the ref
  var outputImg = this._addOutput( Image2D );

  /**************** PART 2.2 *********************************************/
  // filling it with actual data
  outputImg.setData(
    outputBuffer,
    inputImg.getWidth(),
    inputImg.getHeight(),
    ncpp
  );
  
  
  
}else{
  outputBuffer = null;
  console.warn("The input data must have 1, 3 or 4 components per pixel.");
  return;
}
...
```

For the sake of readability, the content was split into different parts.

**Part 1** is about filling the output array based on its own content. In **Part 1.1** we do care about the alpha channel when we have 4 components, which consists in *skipping* every 4 channel. In **Part 1.2**, we don't care of what channel we are processing, we threshold them all.  

**Part 2** is about creating the output `Image2D`. In **Part 2.1**, we can consider `_addOutput` as a sort of factory that will create a *constructed but blank* instance of `Image2D` and will automatically map it to an output of this filter. We could have given this output a specific *category* by adding another argument: `this._addOutput( Image2D, "myOutputCategory" );`. Since we call it without any *category* argument, the default will be *"0"*.  
*Part 2.2* is about associating the typed array we just modified in the loop to the freshly created output image. For that, we give the array, but also the size and the number of components per pixel.

Then, don't forget to [register your filter](#register-your-filter) so that you can actually use it!


### Could we do it another way?
Sure, in may other other ways. A simple alternative would have been to:

Make a clone of the input image:

```javascript
...
var inputImg = this._getInput( 0 );
var outputImage = inputImg.clone();
var outputBuffer = outputImage.getData();
...
```

Process `outputBuffer` the very same way, and in the end, creating mapping manually `outputImage` as an output with explicitly giving the category (*"0"* in this case):

```javascript
...
this._output[0] = outputImage;
...
```
And that's all, no need to call `this._addOutput` or `outputImg.setData` because since `outputImg` is a clone, it already carries the information about size and number of components.

This method is actually faster and potentially even easier to understand. The only disadvantage is that it lets the developer dealing with the output *category*, which might be a source of error when running the filter.


# Events in filters
## Examples
The class/interface `Filter` has a built-in event manager so that you can specify callbacks for specific events from the outside. In Javascript, the most common example is in the context of asynchronous processes, like AJAX requests, or with device interaction like mouse/keyboard events.

For example, in the class `FileImageReader`, the *\_run()* method triggers the custom event `ready` when the desired image is loaded. Just like that:

```javascript
...
img.onload = function(){
  
  // in the "onload" method, the image is already loaded
  // but we still have to convert it into an Image2D
  ...

  // the "ready" can now be called
  that.triggerEvent("ready");
}
...
```

From the ouside (see **examples/urlToImage2D.html**) the user must define the the callback relative to the `ready` event. Most of the time, it will be an anonymous function, just like that:

```javascript
// The filter to read image from URL
var url2ImgFilter = new pixpipe.UrlImageReader();

// the input of this reader is a simple string url. Can be local of distant, but if distant, the server must allow CORS.
url2ImgFilter.addInput( "images/sd.jpg" );

// the image is loaded...
// here, this = url2ImgFilter
url2ImgFilter.on("ready", function(){
  // get the output image
  myImage = this.getOutput();
  
  ...
})

// Ask to fetch the image from URL
url2ImgFilter.update();
```

In an asynchronous context like this one, it does not really matter if we `update` the filter before or after having defined the `ready` event. In the time necessary to load the data, the main *thread* will continue and will have plenty of time to define the events declared just after.  
On the contrary, in a synchronous context, `update` should always be called **after** having defined all the event of this filter.

Let's take another example: **examples/forEachPixel.html**. This short test loads local images and calls an anonymous function on each and every pixel of it using the filter `ForEachPixelImageFilter`.  
Let's see what happens:

```javascript
...
// first event, the file is finally loaded
url2ImgFilter.on( "ready", function(){

  // this filter needs a `pixel` event, a function to be applied on each pixel
  var forEachPixelFilter = new pixpipe.ForEachPixelImageFilter();

  // add the input input
  forEachPixelFilter.addInput( this.getOutput() );

  // Apply this treatment to each pixel of the image.
  // args:
  //   position: 2D position of current pixel as an Object {x, y}
  //   color: array of colors of the current pixel.
  //
  // Must return, or null to not modify the current color,
  // or an array of the same size of color.
  forEachPixelFilter.on( "pixel", function(position, color){
    return [
      color[1], // red (takes the values from green)
      color[0], // green (takes the values from red)
      color[2] * 0.5, // blue get 50% darker
      255 // alpha, at max
    ]
  });

  // run the filter
  forEachPixelFilter.update();
  
  ...
});
```

Once we are inside the `ready` event's callback, there is nothing asynchronous anymore, and `update()` will call `_run()` that will call the `pixel` event on each pixel of the image. This means the `pixel` event **must** be defined before calling `update()`.


## Events methods available
As seen on the previous part, when using a filter (from the outside), an event should be defined using the method `.on(...)` as follow:

```javascript
myFilter.on( 'myEventName', function( /* possibly some args */ ){
  ...
  
  // returning is not mandatory
  return 20;
});
```

Depending on how you call it from your filter, you may or may not have arguments.  
The same goes with returned values, if your custom event internally is expected to return something, so be it (see the previous part, with the `pixel` event).  
Keep in mind that it's not because you define an event with `.on(...)` that it will necessary be called, your filter needs to explicitly call it at some point.

Internally, triggering an event is fairly simple. Here is an example with no arguments and no returned values:

```javascript
// here, this is a filter, from the inside
this.triggerEvent("ready");
```

The case of `ForEachPixelImageFilter` is a bit more complete since it triggers the event `pixel` with few arguments and handles a returned value:

```javascript
var newColor = this.triggerEvent("pixel", position2D, currentColor);
```
As shown, if an event needs to be triggered with some arguments, just put them after the name of the event itself.  About the returned value, the one of your callback function is just relayed by the method `triggerEvent`.

If you happen to trigger an event that was not defined (using `triggerEvent`), a warning will be printed in the console but no exception is raised.  
In addition to `triggerEvent`, the `Filter` class comes with `hasEvent` so that you can check in advance the existance of an event:

```javascript
// internally from a custom filter
if( this.hasEvent("dataProcessed") ){
  this.triggerEvent( "dataProcessed" );
}else{
  // do something else, maybe call a default built-in event...
}
```


# Measuring time
The class/interface `Filter` has a built-in system to measure time that any custom filter can use. It can be useful to track performance and know where to look for further optimization. Here is how to use it, internally from your custom filter:

```javascript
...
this.addTimeRecord('step1');
// do things ...
this.addTimeRecord('step2');
// do things ...
this.addTimeRecord('step3');

this.getTime('step2', 'step3', true);
var t = this.getTime('step1', 'step3');

console.log("The whole thing took " + t + " millisec.");
...
```

The method `.addTimeRecord` creates a new entry and the method `.getTime` returns the time elapsed from a step (arg 1) to another (arg 2) in milliseconds. In addition to return, it can also print in the JS console when a third argument is set to `true`.


# Various optimizations
As said the [step-by-step](#simple-example) part, processing an image means processing very large typed arrays, and saving a single millisecond per pixel really matters!

For some algorithm, you may need to use information from metadata extensively (ie. in a loop). If such metadata is initialized in the constructor or above in your code, using it like that:

```javascript
this._metadata.width
```

is faster than that:

```javascript
this._metadata["width"]
```

which is faster than that:

```javascript
this.getMetadata("width")
```

Using the getter is nice because it provides a layer of control and return null if the metadata does not exist but it's slower, so as long as you are using a metadata internally (from `this`) and that you know what you are doing (you are **sure** this metadata actually exists), then it's ok to call it like a regular object.
