# Pipeline

Pipeline.js acthitecture is somewhat inspired by ITK architecture, applied to Javascript. The two main kind of components are:  
- Image: stores the image data
- Filter: takes one or more Image objects as input, gives one or more Image object in output. Apply some processing in between.
- Streamer, used for reading or writing data. They are like filter except they or only give an output (reader) or only take an input (writer).

Unless an image is explicitly initialized using a constructor with options of size or using the `copy()` method, instance of Images must always be created by a teamer or a filer internaly.
