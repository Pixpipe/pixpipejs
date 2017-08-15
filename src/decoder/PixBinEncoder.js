/*
* Author    Jonathan Lurie - http://me.jonahanlurie.fr
*
* License   MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import pako from 'pako';
import md5 from 'js-md5';
import { Filter } from '../core/Filter.js';
import { CodecUtils } from './CodecUtils.js';
import { PixBlockEncoder } from './PixBlockEncoder.js';

/**
* A PixBinEncoder instance takes an Image2D or Image3D as input with `addInput(...)`
* and encode it so that it can be saved as a *.pixp file.
* An output filename can be specified using `.setMetadata("filename", "yourName.pixp");`,
* by default, the name is "untitled.pixp".
* When `update()` is called, a gzip blog is prepared as output[0] and can then be downloaded
* when calling the method `.download()`. The gzip blob could also be sent over AJAX
* using a third party library.
*
* **Usage**
* - [examples/savePixpFile.html](../examples/savePixpFile.html)
*/
class PixBinEncoder extends Filter {
  constructor(){
    super();
    this.setMetadata("filename", "untitled.pixb");
    this.setMetadata("extension", "pixb");
    this.setMetadata("compress", true)

  }


  /**
  * [static]
  * the first sequence of bytes for a pixbin file is this ASCII string
  */
  static MAGIC_NUMBER(){
    return "PIXPIPE_PIXBIN";
  }


  _run(){
    var that = this;
    var today = new Date();
    var isLittleEndian = CodecUtils.isPlatformLittleEndian();
    var blockEncoder = new PixBlockEncoder();

    // this object is the JSON description at the begining of a PixBin
    var pixBinIndex = {
      date: today.toISOString(),
      createdWith: "pixpipejs",
      description: this.getMetadata( "description" ),
      userObject: this.getMetadata( "userObject" ),
      pixblocksInfo: []
    }

    // array of binary blocks (each are Uint8Array or ArrayBuffer)
    var pixBlocks = []

    // just a convenient shortcut
    var pixblocksInfo = pixBinIndex.pixblocksInfo;


    this._forEachInput(function( category, input ){
      blockEncoder.addInput( input, 0 );
      blockEncoder.setMetadata( "compress", that.getMetadata("compress") );
      blockEncoder.update();
      var encodedBlock = blockEncoder.getOutput();

      if( !encodedBlock ){
        console.warn("The input of category " + category + " could not be encoded as a PixBlock.");
        return;
      }

      // adding an entry to the PixBin index
      var pixBinIndexEntry = {
        type        : input.constructor.name,
        description : input.getMetadata( "description" ),
        byteLength  : encodedBlock.byteLength,
        checksum    : md5( encodedBlock ),
      };

      pixblocksInfo.push( pixBinIndexEntry )
      pixBlocks.push( encodedBlock )
    });


    if( !pixBlocks.length ){
      console.warn("No input was compatible for PixBlock encoding.");
    }

    // Building the header ArrayBuffer of the file. It contains:
    // - A ASCII string "pixpipe". 7 x Uint8 of charcodes (7 bytes)
    // - A flag for encoding endianess, 0: big, 1: little. 1 x Uint8 (1 byte)
    // - The byte length of the PixBin meta binary object. 1 x Uint32 (4 bytes)

    // encoding the meta object into an ArrayBuffer
    var pixBinIndexBinaryString = CodecUtils.objectToArrayBuffer(pixBinIndex);
    var magicNumber = PixBinEncoder.MAGIC_NUMBER();

    // the +5 stands for 1 endiannes byte (Uint8) + 4 bytes (1xUint32) of header length
    var fixedHeader = new ArrayBuffer( magicNumber.length + 5 );
    var fixedHeaderView = new DataView( fixedHeader );

    CodecUtils.setString8InBuffer( magicNumber, fixedHeader );
    fixedHeaderView.setUint8( magicNumber.length, (+isLittleEndian))
    fixedHeaderView.setUint32( magicNumber.length + 1, pixBinIndexBinaryString.byteLength, isLittleEndian );

    var allBuffers = [fixedHeader, pixBinIndexBinaryString].concat( pixBlocks )
    this.addTimeRecord("beforeMerge");
    this._output[0] = CodecUtils.mergeBuffers( allBuffers )
    this.addTimeRecord("afterMerge");
    this.getTime("beforeMerge", "afterMerge", true);
  }


  /**
  * Download the generated file
  */
  download(){
    var output = this.getOutput();

    if(output){
      FileSaver.saveAs( this.getOutput(), this.getMetadata("filename"));
    }else{
      console.warn("No output computed yet.");
    }
  }


} /* END of class PixBinEncoder */

export { PixBinEncoder }
