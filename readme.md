![Pixpipe.js](images/pixpipe256.png)

[Pixpipe.js](https://github.com/jonathanlurie/pixpipejs) is an attempt of building an image processing pipeline entirely in Javascript for browsers. Its architecture was somewhat inspired by [ITK](https://itk.org/), making a clear separation between objects that *contain* data (`Image2D`) from object that *process* data (`Filter`).  

The concept of *pipeline* implies that the output of a `Filter` can be used as an input for the next one, like in *ITK*. In Pixpipe.js, this is done by using the `Filter`'s methods `addInput()` and `getOuput()`. Some `Filter` may have several *input* or *output* of different kinds.

# Motivations
To make image processing:
- accessible, using just a web browser and a textpad
- easy to use in a sense that "all filters work the same way".
- with no other dependency than `pixpipe.js`
- with no required compilation or system fuss
- modular
- generic enough to use different kind of data/datasource
- easy to contribute
- well documented for both users and contributors.

# Compatible formats
Here is the list of compatible formats:
- jpeg (to Image2D)
- png (to Image2D)
- NIfTI (to Image3D / MniVolume)
- Minc2 (to Image3D / MniVolume)
- Pixp (generic *Pixpipe* format for both Image2D and Image3D )

# The Pixp format
For saving intermediate or final results to a local storage, Pixpipe needs a file format. I wanted something generic enough to works with Image3D, Image2D and possible future formats without having to deal without having to deal with this or that specificity of this or that container. In other words, one single `save()` method and one single `open()` method, no matter the kind of data. This is possible thanks to the common features of `Image2D` and `Image3D` (they both inherit from `PixpipeContainer`). The format I've chosen for quite naive but very versatile: JSON, compressed with gzip (using [Pako](https://github.com/nodeca/pako)) The extension is `*.pixp`, here is the format description:

```javascript
// this is a 2D image
{
  // TypedArray type
  "dataType":"Float32Array",

  // 1D array of data
  "data":[
    255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255,255,128,64,255
  ],

  // metadata
  "metadata":{
    "ncpp":4,
    "width":10,
    "height":5
  },

  // Original Pixpipe type
  "pixpipeType":"Image2D"
}
```
- **TypedArray type** can be any typed array from here https://mzl.la/2nASpcK
- **1D array of data** in case of rgba image, the data are ordered *rgbargbargba...*
- **metadata** are usually different from Image2D and Image3D but always carry dimensionality and the number of components per pixel
- **Original Pixpipe type** to be able to reconstruct the original object

*Note:* JSON serialization does not play well with TypedArrays and interpret them as *Object* when parsing back, this is why we need to keep a track of the TypedArray type and need to convert the *data* into a regular *Array* (and not *TypedArray*).


# Documentation
See [here](doc/) for the code documentation. Though, if you are just getting into `Pixpipe.js`, the best way to learn is by checking the examples below.

# Cookbook
Processing images usually take a bit of time, open your javascript console so that you can see the filter feedback.  
All the following examples are in the [example folder](https://github.com/jonathanlurie/pixpipejs/tree/master/examples).

## basics
Here, we will learn what is an `Image2D`, how to display it in a canvas using `CanvasImageWriter`. In addition, we have two different ways to load an existing image: from its URL (using a `UrlImageReader`) or with a file dialog (using a `FileImageReader`).
- [Create an Image2D and display it](http://me.jonathanlurie.fr/pixpipejs/examples/image2DToCanvas.html)
- [Create an Image2D from an image URL and display it](http://me.jonathanlurie.fr/pixpipejs/examples/urlToImage2D.html)
- [Same but with multiple images](http://me.jonathanlurie.fr/pixpipejs/examples/urlToImage2D_multiple.html)
- [Create an Image2D from a local file and display it](http://me.jonathanlurie.fr/pixpipejs/examples/fileToImage2D.html)

## Simple filters for Image2D
See a `Filter` as a *box* that takes one or more input and produces one or more output. If some parameters are needed to make the filter work properly, this must happen using `setMetadata()`. To ask the filter to do its job, just call `update()`.  
A `Filter` should **NEVER** modify the input data.
- [The filter that lets you apply a treatment at a pixel level](http://me.jonathanlurie.fr/pixpipejs/examples/forEachPixel.html)
- [A pixel-wise filter that uses pixel position to adapt its behaviour](http://me.jonathanlurie.fr/pixpipejs/examples/forEachPixelGradient.html)
- [Use a math expression evaluator to blend an image and a mask](http://me.jonathanlurie.fr/pixpipejs/examples/imageBlending.html)
- [Use a math expression evaluator to blend two images](http://me.jonathanlurie.fr/pixpipejs/examples/imageBlending2.html)
- [Create a pattern and blend it with an image using a math expression evaluator](http://me.jonathanlurie.fr/pixpipejs/examples/forEachPixelGradientBlend.html)
- [Save a Image2D to a `*.pixp` file](http://me.jonathanlurie.fr/pixpipejs/examples/savePixpFile.html)
- [Load a `*.pixp` file that contains an Image2D and display it](http://me.jonathanlurie.fr/pixpipejs/examples/pixpFileToImage2D.html)

## Playing with 3D medical dataset
- [Open a local Minc2 file, extract 3 orthogonal slices and display in canvas](http://me.jonathanlurie.fr/pixpipejs/examples/fileToMinc2.html)
- [Open a local  NIfTI file, extract 3 orthogonal slices and display in canvas](http://me.jonathanlurie.fr/pixpipejs/examples/fileToNifti.html)
- [Convert a Minc2 file into a generic `*.pixp` file](http://me.jonathanlurie.fr/pixpipejs/examples/Minc2ToPixpFile.html)
- [Open a `*.pixp` containing an Image3D file and display 3 otho slices](http://me.jonathanlurie.fr/pixpipejs/examples/Minc2ToPixpFile.html)

## Advanced
- [Open a local  NIfTI file and display a mosaic of all the slices](http://me.jonathanlurie.fr/pixpipejs/examples/niftiToMosaic.html)
- [Open a local file as an ArrayBuffer](http://me.jonathanlurie.fr/pixpipejs/examples/fileToArrayBuffer.html). Good starting point to create a new binary file parser

# Todo
- Doc and tutorials for developers
- Integrate wokers with Rollup
- 2D FFT
- Bilinear and trilinear interpolation + resampling filter
- Write about the features in this readme
- Oblique sampling for Image3D
- Better test time series with NIfTI (maybe add an example)
- Add an efficient way to minify the code
- ~~Load a file as a ArrayBuffer with a AJAX~~
- ~~Export `Image2D`, `Image3D` or generic `*.pixp` file (using serialization and Pako)~~
- ~~Load a file as a ArrayBuffer with a file dialog~~ DONE: `FileToArrayBufferReader`
- ~~Readers for Minc and NIfTI~~ DONE: `Minc2Decoder` and `NiftiDecoder`
- ~~Image3D~~
- ~~Replace ncpp attribute by a metadata (Image2D & Image3D)~~
- ~~Push some methods of MniVolume to Image3D~~
- ~~export a/multiple Image2D of sliced Image3D (upon 2D size limit) with mosaic (for shader texturing)~~

# License
MIT - See [LICENSE file](LICENSE).
