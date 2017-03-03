# Pipeline

Pipeline.js acthitecture is somewhat inspired by ITK architecture, applied to Javascript. The two main kind of components are:  
- Image: stores the image data
- Filter: takes one or more Image objects as input, gives one or more Image object in output. Apply some processing in between.
- Source, output an image from a fetching/reading process. Like a filter but does not take any Image object as input.
