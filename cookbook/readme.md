![Pixpipe.js](images/pixpipe256.png)

# Cookbook
This cookbook will help you to become familiar with the architecture of **Pixpipe.js**, to understand the code samples and eventually, create your own pipeline.

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
- Good practice and code style
- [Create your own custom filter](#create-your-own-custom-filter)
  - [What should my filter inherit from](#what-should-my-filter-inherit-from)
  - [What are inputs and outputs](#what-are-inputs-and-outputs)
  - [What are metadata](#what-are-metadata)
  - [Can I had class attributes](#can-i-had-class-attributes)
  - [How to make the filter runable](#how-to-make-the-filter-runable)
  - [Keep in mind](#keep-in-mind)
  - [Register your filter](#register-your-filter)
  - [Simple example](#simple-example)
- Validate input (input validator)

# Overview
The point of Pixpipe is to be easy to use and easy to contribute to. This goal leads to take some decision:  
- using a source bundler ([Rollup](http://rollupjs.org/))
- properly define a folder hierarchy within `src`:
  - `core` for the most low level *interfaces* and *classes*
  - `decoder` for specific file decoding and encoding
  - `filter` for all the filters (this could, maybe, be better arranged)
  - `io` for dowloading/reading/writing files from the filesystem or AJAX
  - `pixpipe.js` the main entry point where are listed all the modules
- A modular approach and a clear separation of objects.
- Once built, Pixpipe is only a single file, located in `dist`, so that's it's easy to import

# Projects used in Pixpipe
Sometimes, it's just not worth reiventing the wheel. Here are the libraries Pixpipe uses and includes at build time:
- [Pako](https://github.com/nodeca/pako), for high speed file compression/decompression in JS.
- [FileSaver.js](https://github.com/eligrey/FileSaver.js), to easly trigger file downloading to the user
- [expr-eval](https://github.com/silentmatt/expr-eval), to evaluate math expression and create quick filter prototype
- [js-md5](https://github.com/emn178/js-md5), to generate a unique checksum for each loaded files

# Core architecture
Pixpipe is strongly *object oriented* and relies a lot on inheritance. As said in the `readme`, it was inpired by *ITK* for its genericity because it make the pipeline scalable and modular.  
Everything you can find in `src/core` is the **core**. Easy. Let's see how it looks like:  

![Pixpipe core](images/pixpipeCore.png)

As you can see, the core elements can be described like that: **containers** on one side and **procesors** on the other.
## Core elements in detail

### PixpipeObject
*generic interface*  
The most generic! You cannot do anthing with it except extending it and **every** object in Pixpipe is (and must be) a `PixpipeObject`.  
`PixpipeObject`is an `interface`, it implements the following features:  
- **UUID**: a unique identifier for each and every object created in the pipeline. Since it is not practical to access memory addresses in Javascript, this is very useful for debuging your program and make sure that "This is deep copy of an object rather than a pointer to the same address".
- **Metadata**: every description, setting or relevant piece of information **must** be stored in metadata, all the methods to create/read/modify are here. Dont put large arrays of data here, and dont put TypedArrays as it does not play well with serialization (see: pixp format).
- **Type**: every object must have a type descriptor (String). It can be there own or the type of their mother class. For example `Image3D` has the type *"IMAGE3D"* and `MniVolume` does not overwrite it, hence, it also has the type descriptor *"IMAGE3D"*. This is mainly used to ensure compatibility between data containers.

### PixpipeContainer
*container interface*  
So far, a `PixpipeObject` is still not containing any data, only a few metadata. To fix that and create a proper container able to store a large amount of data, `PixpipeContainer` introduces a new attribute: `_data`.  
Initialize to `null`, we profit from Javascript's dynamic typing ability to make it store whatever we want.  
For the sake of easily creating spcialized object from pixp file, this interface also implements `setRawMetadata()` and `setRawMetadata()` but don't use them to much since there is absolutely no control, just raw object pointer attribution.
This is still an `interface` and even though you could probably use it *as-is*, this is not the point.

### Image2D
*container*  
One of the most important container, it is made to store 2D image datasets, for example coming from a *jpeg** image.  
This class contains everything needed to initialize, get and set pixel values.  
The informations of *width*, *height* and *ncpp* (number of components per pixel, 3 for RGB, 4 for RGBA) are all stored into *metadata* but they can all be fetched using dedicated *getters*.  
In term of dimensionality, `Image2D` pixels are stored *row-wise* in a 1D TypedArray: the whole line1 RGBARGBA followed by the second line2, etc.

### Image3D
*container*  
The equivalent of `Image2D` for 3d datasets. Unlike 2D datasets, 3D ones have a parametric dimensionality order. By default, the largest dimensionality is along `xspace` and the smalles is along `zspace`. Since all dimensionality informations are stored in metadata, the order can be changed, especially when initializing the Image3D with `setData()` with the appropriate `options`.  
`Image3D` have the *built-in*  ability to export `Image2D` object of slices (at a given position long a given axis) without using an external filter.

### MniVolume
*container*  
This object is motivated by the medical dataset used internaly in the (Montreal Neurological Institute)[http://www.mcgill.ca/neuro/about], in particular [NIfTI](https://nifti.nimh.nih.gov/) and [Minc2](http://journal.frontiersin.org/article/10.3389/fninf.2016.00035/full). They are respectivelly created by `NiftiDecoder` and `Minc2Decoder`. Keep in mind `MniVolumes` are `Image3D` and uses the same methods.

### Filter
*processor interface*  
A `Filter`'s job is to process a input data in a **non-destructive** way, and ouput another data. `Filter` is an interface, it cannot be used *as-is*, and you'll need to extend it to implement your own filter.  
Filters's input can be of any type or Object (`Image2D`, `Image3D`, `ArrayBuffer`, `JSON`, etc.) and must always be set using the method `.addInput( Object, category)` where `Object` is the input object itself and `category` is a `Number` or a `String` that will be used as an internal identifier. Most of the time it is convenient to use incremental integer as a category but if your needs only *one* input, the argument `category` is optionnal and the catogory `0` will be given.  
Launching a filter is mandatory in order to get any output, this is done by calling the method `.update()`. Though, you will have to implement the method `._run()` (no argument) and possibly some other internal private method to help `_run` to do the job.  
When `.update()` is done, a filter is ready to give some output, using the method `.getOutput(category)`, when category is an optional identifier (default: 0).  

If you happen to create your own custom filter, **always** add a some input verification before doing any real job using *inputs*. This is better than throwing exceptions away and breaking the pipeline.

### ImageToImageFilter
*processor interface*  
This extends `Filter` but still does not process anything. This is again an interface for any custom filter that would input one or multiple `Image2D` and ouput one `Image2D` (actually, this is not strictly required, it could output anything else, like statistics for examples).  
`ImageToImageFilter` provides a method to check if all the input `Image2D` have the same size: `.hasSameSizeInput()` and if they have the same number of components per pixel: `.hasSameNcppInput()`. These two methods should be called at the begining of the `._run()` method, but if your cutom filter happen *not* to need these verications, then simply don't call them.  


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

Note that Pixpipejs is developed using ES6 and might not be compatible with older browser -- Google closure compiler to the rescue! In addition to provide a nice and easy way to minify the built version, it also transpiles the codebase into ES5. Here is the command:

```bash
$ npm run build
$ npm run min
```

**Note** Pixpipe does not use a npm minifier plugin beacause it's codebase is too large, thus it uses directly the closure compiler from Google (see `closurecompiler` folder).

# Building the documentation
Pixpipejs uses [DocumentationJS](http://documentation.js.org/) to generate a HTML documentation. It uses *JSDoc* syntax and is generated with the following command:

```bash
$ npm run doc
```

Then, the documentaion is accessible in the `doc` folder, or can be directly read [here](http://me.jonathanlurie.fr/pixpipejs/doc/).


# Learning with examples
The following examples are a nice and easy way to progressivelly go through using Pixpipe, from the basics to advanced. It is important to understand how to use Pixpipe before trying to develop your own filters in order to respect the coherence that makes it easy to use on the long shot.  
Before starting, remember these two things:
- When it comes to data (Image2D, Image3D) a filter takes one or more input (`addInput(...)`), must be ran using `update()` and gives one or more output (`getOutput()`).
- When it comes to metadata (particular setting, overwriting a default algorithm value, etc.), the filter method `.setMetadata(...)` must be called.

Processing images usually take a bit of time but there is not always a graphic feedback. Open your javascript console so that you can see the filter feedback in the log.  
All the following examples are in the [example folder](https://github.com/jonathanlurie/pixpipejs/tree/master/examples).

## basics
Here, we will learn what is an `Image2D`, how to display it in a canvas using `CanvasImageWriter`. In addition, we have two different ways to load an existing image: from its URL (using a `UrlImageReader`) or with a file dialog (using a `FileImageReader`).
- [Create an Image2D and display it](http://me.jonathanlurie.fr/pixpipejs/examples/image2DToCanvas.html) ([source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/image2DToCanvas.html))
- [Create an Image2D from an image URL and display it](http://me.jonathanlurie.fr/pixpipejs/examples/urlToImage2D.html) ([source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/urlToImage2D.html))
- [Same but with multiple images](http://me.jonathanlurie.fr/pixpipejs/examples/urlToImage2D_multiple.html) ([source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/urlToImage2D_multiple.html)))
- [Create an Image2D from a local file and display it](http://me.jonathanlurie.fr/pixpipejs/examples/fileToImage2D.html) ([source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/fileToImage2D.html))

## Simple filters for Image2D
See a `Filter` as a *box* that takes one or more input and produces one or more output. If some parameters are needed to make the filter work properly, this must happen using `setMetadata()`. To ask the filter to do its job, just call `update()`.  
A `Filter` should **NEVER** modify the input data.
- [The filter that lets you apply a treatment at a pixel level](http://me.jonathanlurie.fr/pixpipejs/examples/forEachPixel.html) ([source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/forEachPixel.html))
- [A pixel-wise filter that uses pixel position to adapt its behaviour](http://me.jonathanlurie.fr/pixpipejs/examples/forEachPixelGradient.html) ([source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/forEachPixelGradient.html))
- [Use a math expression evaluator to blend an image and a mask](http://me.jonathanlurie.fr/pixpipejs/examples/imageBlending.html) ([source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/imageBlending.html))
- [Use a math expression evaluator to blend two images](http://me.jonathanlurie.fr/pixpipejs/examples/imageBlending2.html) ([source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/imageBlending2.html))
- [Create a pattern and blend it with an image using a math expression evaluator](http://me.jonathanlurie.fr/pixpipejs/examples/forEachPixelGradientBlend.html) ([source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/forEachPixelGradientBlend.html))
- [Save a Image2D to a `*.pixp` file](http://me.jonathanlurie.fr/pixpipejs/examples/savePixpFile.html) ([source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/savePixpFile.html))
- [Load a `*.pixp` file that contains an Image2D and display it](http://me.jonathanlurie.fr/pixpipejs/examples/pixpFileToImage2D.html) ([source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/pixpFileToImage2D.html))
- [Multiply an image by another](http://me.jonathanlurie.fr/pixpipejs/examples/multiplyImage2D.html) ([source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/multiplyImage2D.html))

## Playing with 3D medical dataset
- [Open a local Minc2 file, extract 3 orthogonal slices and display in canvas](http://me.jonathanlurie.fr/pixpipejs/examples/fileToMinc2.html) ([source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/fileToMinc2.html))
- [Open a local  NIfTI file, extract 3 orthogonal slices and display in canvas](http://me.jonathanlurie.fr/pixpipejs/examples/fileToNifti.html) ([source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/fileToNifti.html))
- [Convert a Minc2 file into a generic `*.pixp` file](http://me.jonathanlurie.fr/pixpipejs/examples/Minc2ToPixpFile.html) ([source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/Minc2ToPixpFile.html))
- [Open a `*.pixp` containing an Image3D file and display 3 otho slices](http://me.jonathanlurie.fr/pixpipejs/examples/Minc2ToPixpFile.html) ([source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/Minc2ToPixpFile.html)))

## Advanced
- [Open a local  NIfTI file and display a mosaic of all the slices](http://me.jonathanlurie.fr/pixpipejs/examples/niftiToMosaic.html) ([source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/niftiToMosaic.html))
- [Open a local file as an ArrayBuffer](http://me.jonathanlurie.fr/pixpipejs/examples/fileToArrayBuffer.html) ([source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/fileToArrayBuffer.html)). Good starting point to create a new binary file parser
- [Open a Structural volume file (NIfTI, Minc2, Pixp), build a 3D texture and display volume with obliques](http://me.jonathanlurie.fr/pixpipejs/examples/volume3DNavigator.html) ([source](https://github.com/jonathanlurie/pixpipejs/tree/master/examples/volume3DNavigator.html))

# Create your own custom filter
As mentioned earlier, a filter must take at least one input et retrieve at least one output, in between the method `.update()` must be called. The only exception to that are `io` filters which are opening or writing from/to a file or a HTML5 canvas.  

## What should my filter inherit from?
All filter should inherit from `Filter`, but some subtypes can also be used. For example, your custom filter can inherit from the class/interface `ImageToImageFilter`, which has the advantage of having some Image2D checking method already built-in.

The class `ImageToImageFilter` itself also inherit from `Filter` and we could imagine creating other *interface* filters that carry some specific logic but no actual data processing. 

## What are inputs and outputs?
Input and ouput data can be of different types but are usually `Image2D` or `Image3D`. They are stored in the already-existing `Filter`'s class attribute `this._input` and `this._output`. These two objects are actually *maps* and need an ID, here called a **category**.

A *category* is just a way to give an identifier when adding an input (externally) or an output (internally, to create it). If your filter needs only a single input, adding a category is optional (*"0"* will be given). Same thing for the output, if your filter creates only one, then it's category should be *"0"* because the method `.getOutput()` uses a default value *"0"* for the *category* argument. The concept of *category* comes very handy when your filter has to manage multiple I/O.

From ouside of your custom filter, here are the methods you can use, without having to implement them since they are part of `Filter` class:

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

From the inside of your filter, there are a few other (suposedly private) I/O-related methods:

```javascript
// get an input when we know we have only one
var theInput = this._getInput();

// get an input of a given category
var theInput = this._getInput("image_one");

// batch process the inputs, when we have many of them
this._forEachInput( function(category, inputObject){
  // do something with each input
})

// add a new ouput of a given type that ecapsulate the category checking
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
In the case of a filter that perform an algorithm, all the settings must be stored as *metadata* and we strongly discourage to use *class attributes* for that. As show on the [diagram](#core-architecture), the metadata logic is hosted by the class/interface `PixpipeObject`, of which inherits `Filter` and every other objects that belong to the Pixpipe project.

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

## Can I had class attributes?
Yes, like any other *class*, your custom filter can use attributes to store temporary data, but not for inputs, outputs or metadata of major importance.

## How to make the filter runable?
As seen earlier, to run a filter, the method `.update()` should be called, though, the method that should be implemented in every new custom filter is `_run()`.  

The `_run()` method is called by `update()` along with some others. It should perform the reading of inputs, the processing and the writing of outputs. 

**A FILTER SHOULD NEVER ALTER THE INPUT**.

## Keep in mind
A filter may need to be compatible with different kind of inputs and it is to the discredion to the developper to make it properly. For example, an filter that takes *Image2D* as input has to deal with a variable number of component per pixel so that it behaves in an expected way with a single-band image (b&w) but also with a RGB or RGBA image.  

If a filter can deal only with a certain kind of input, it should be explicitely stated in the documentation.

## Register your filter
To make your custom filter accessible when building Pixpipe, you must register it in the file `src/pixpipe.js`.

## Simple example
The filter `filter/SimpleThresholdFilter.js` is a pretty simple example of how it works. A simple way to see how it works is by checking the example `examples/imageThresholding.html`.
