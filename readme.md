# Pixpipe.js
Pixpipe.js is an attempt of building an image processing pipeline entirely in Javascript for browsers. Its architecture was somewhat inspired by [ITK](https://itk.org/), making a clear separation between objects that *contain* data (`Image2D`) from object that *process* data (`Filter`).  

The concept of *pipeline* implies that the output of a `Filter` can be used as input for the next one, like in *ITK*. In Pixpipe.js, this is done by using the `Filter`'s methods `addInput()` and `getOuput()`. Some `Filter` may have several *input* or *output* of different kinds.

# Motivations
To make image processing:
- accessible, using just a web browser and a text pad
- with no other dependency than `pixpipe.js`
- with no required compilation or system fuss
- modular
- generic enough to use different kind of data/datasource
- easy to contribute
- well documented for both users and contributors.


# The future of Pixpipe.js
The plan is to add more image processing filters and tools, like *FFT*, or *wavelet decomposition* to process data in the frequency domain. Though, this kind of processing is quite greedy and would need a *low-level* approach. This can be done efficiently using *C/C++* code converted into optimal lower-level Javascript using [Emscriptem](http://kripken.github.io/emscripten-site/). These are the next big steps.

# License
MIT - See [LICENSE file](LICENSE).


# Todo
## doc for dev
- how to make _inputValidator (Filter) and when to call validateInput
