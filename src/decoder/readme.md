All decoders inherit from `Filter`, they intend to parse specific file format and output one of the basic `PixpipeObject`. In addition to decoders, you can also find some encoders (`PixBinEncoder`).  

A decoder will usually take an `ArrayBuffer` as input.
