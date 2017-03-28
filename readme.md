<img src="images/pixpipe.png" width=250></img>


Pixpipe.js is an attempt of building an image processing pipeline entirely in Javascript for browsers. Its architecture was somewhat inspired by [ITK](https://itk.org/), making a clear separation between objects that *contain* data (`Image2D`) from object that *process* data (`Filter`).  

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

# Documentation
See [here](doc/) for the code documentation. Though, if you are just getting into `Pixpipe.js`, the best way to learn is by checking the examples below.

# Examples
Processing images usually take a bit of time, open your javascript console so that you can see the filter feedback.

## basics
Here, we will learn what is an `Image2D`, how to display it in a canvas using `CanvasImageWriter`. In addition, we have two different ways to load an existing image: from its URL (using a `UrlImageReader`) or with a file dialog (using a `FileImageReader`).
- [Create an Image2D and display it](examples/image2DToCanvas.html)
- [Create an Image2D from an image URL and display it](examples/urlToImage2D.html)
- [Same but with multiple images](examples/urlToImage2D_multiple.html)
- [Create an Image2D from a local file and display it](examples/fileToImage2D.html)

## Simple filters for `Image2D`
See a `Filter` as a *box* that takes one or more input and produces one or more output. If some parameters are needed to make the filter work properly, this must happen using `setMetadata()`. To ask the filter to do its job, just call `update()`.  
A `Filter` should **NEVER** modify the input data.
- [The filter that lets you apply a treatment at a pixel level](examples/forEachPixel.html)
- [A pixel-wise filter that uses pixel position to adapt its behaviour](examples/forEachPixelGradient.html)
- [Use a math expression evaluator to blend an image and a mask](examples/imageBlending.html)
- [Use a math expression evaluator to blend two images](examples/imageBlending2.html)
- [Create a pattern and blend it with an image using a math expression evaluator](examples/forEachPixelGradientBlend.html)

## Open medical 3D dataset
- [Open a local Minc2 file, extract 3 orthogonal slices and display in canvas](examples/fileToMinc2.html)
- [Open a local  NIfTI file, extract 3 orthogonal slices and display in canvas](examples/fileToNifti.html)

## Advanced
- [Open a local  NIfTI file and display a mosaic of all the slices](examples/niftiToMosaic.html)
- [Open a local file as an ArrayBuffer](examples/fileToArrayBuffer.html). Good starting point to create a new binary file parser

# License
MIT - See [LICENSE file](LICENSE).


# Todo
- ~~replace all the events named "ready" by "ready"~~
- Doc and tutorials for developers
- Integrate wokers with Rollup
- FFT
- ~~Image3D~~
- ~~Replace ncpp attribute by a metadata (Image2D & Image3D)~~
- ~~Push some methods of MniVolume to Image3D~~
- Write about the features in this readme
- Oblique sampling for Image3D
- ~~export a/multiple Image2D of sliced Image3D (upon 2D size limit) with mosaic (for shader texturing)~~
- Better test time series with NIfTI (maybe add an example)
- Load a file as a ArrayBuffer with a AJAX
- Add an efficient way to minify the code
- ~~Load a file as a ArrayBuffer with a file dialog~~ DONE: `FileToArrayBufferReader`
- ~~Readers for Minc and NIfTI~~ DONE: `Minc2Decoder` and `NiftiDecoder`
