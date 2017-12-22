![Pixpipe.js](images/pixpipe256.png)

[Pixpipe.js](https://github.com/Pixpipe/pixpipejs) is an attempt of building an image processing pipeline entirely in native Javascript for browsers. Its architecture was somewhat inspired by [ITK](https://itk.org/), making a clear distinction between objects that *contains* data (inherit from `PixpipeContainer`) from object that *processes* data (inherit from `Filter`).  

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

# Presentation
[Here](http://me.jonathanlurie.fr/slides/pixpipejs_01) are some slides to present Pixpipejs. Maybe an easier introduction.

# Cookbook
The best way to learn how to uses Pixpipe is by going through the [cookbook](http://www.pixpipe.io/cookbook/). You'll find in-depth descriptions of the core components, [examples](http://www.pixpipe.io/cookbook/4-learning-with-examples/0-README.html) and how-to's.


# Documentation
This [documentation](https://pixpipe.github.io/pixpipejs/doc/)  is autogenerated from source comments and thus is pretty complete. Interested in how to generate your own? go [there](http://www.pixpipe.io/cookbook/3-build-pixpipe/0-README.html).


# Compatible formats
Here is the list of compatible formats:
- jpeg (to Image2D)
- png (to Image2D)
- tiff (to Image2D)
- NIfTI (to Image3D / MniVolume)
- Minc2 (to Image3D / MniVolume)
- MGH/MHZ (to Image3D / MniVolume)
- Pixp (generic *Pixpipe* format for both Image2D and Image3D )

# Sample data
[HERE](https://github.com/Pixpipe/pixpipeData) is the repo where some sample data are stored (mainly to avoid this repos to be too fat).


# The PixBin format
This is the binary file format used to store data from a Pixpipe pipeline. Thanks to it's proximity to Pixpipe structures a PixBin file can be opened and create the Pixpipe object instances as you left them.  

The codec for PixBin is part of Pixpipejs but is also available as a separate package [here](https://github.com/Pixpipe/pixbincodec). A in-depth description of the file format is also available [here](https://github.com/Pixpipe/pixbincodec/blob/master/pixbinformat.md).

# Contribution
Pixpipejs is open to contribution via **fork + pull requests**.  
In addition, if you have an idea of a feature you would like to see in Pixpipejs, you can mention if in the **Wiki** and we'll see what we can do.

# License
MIT - See [LICENSE file](LICENSE).
