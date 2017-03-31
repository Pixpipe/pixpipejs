![Pixpipe.js](images/pixpipe256.png)

# Cookbook
This cookbook will help you to become familiar with the architecture of **Pixpipe.js**, to understand the code samples and eventually, create your own pipeline.

# Table of content
- Overview
- Core architecture
  - PixpipeObject
  - PixpipeContainer
  - Image2D
  - Image3D
  - MniVolume
  - Filter
  - [ImageToImageFilter](#ImageToImageFilter)
- [Building Pixpipe](#Building-Pixpipe)
- Create a custom filter
- Validate input (input validator)

# Overview
The point of Pixpipe is to be easy to use and easy to contribute to.

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
