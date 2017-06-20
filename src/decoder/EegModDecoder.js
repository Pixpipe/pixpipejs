import { Filter } from '../core/Filter.js';

class EegModDecoder extends Filter {
  
  constructor() {
    super();
    this.addInputValidator(0, ArrayBuffer);
    this.setMetadata("debug", false);
    
    // a soon-to-be DataView to read the input buffer
    this._view = null;
  }
  
  _run(){
    var inputBuffer = this._getInput(0);

    if(!inputBuffer){
      console.warn("EegModDecoder requires an ArrayBuffer as input \"0\". Unable to continue.");
      return;
    }
    
    this._view = new DataView( inputBuffer );
    var littleEndian = true;
    
    // ------------- DECODING HEADER -------------------
    
    var header = {};
    
    // Protection Mask
    // Offset: 0, length: 2
    header.protectionMask = this._view.getUint16(0, littleEndian);
    
    // Comment (first byte is the real length)
    // Offset: 2, length: 81
    var commentRealLength = this._view.getUint8(2);
    var commentBytes = new Uint8Array(inputBuffer, 3, commentRealLength);
    header.comment = String.fromCharCode.apply(String, commentBytes);
    
    // Measure (M) Size
    // Offset: 83, length: 2
    header.measureSize = this._view.getUint16(83, littleEndian);
    
    // Duration (D) Size
    // Offset: 85, length: 2
    header.durationSize = this._view.getUint16(85, littleEndian);
    
    // First space (F) Size
    // Offset: 87, length: 2
    header.firstSpaceSize = this._view.getUint16(87, littleEndian);
    
    // Second space (S) Size
    // Offset: 89, length: 2
    header.secondSpaceSize = this._view.getUint16(89, littleEndian);
    
    // Reserved bytes
    // Offset: 91, length: 2
    header.reservedBytes = this._view.getUint16(91, littleEndian);
    
    // Data size
    // Offset: 93, length: 2
    header.dataSize = this._view.getUint16(93, littleEndian);
    
    console.log( header );
    
    // ------------- DECODING MATRIX -------------------
    var matrixOffset = 95;
    
    var matrixSizeElements =  header.measureSize * 
                              header.durationSize * 
                              header.firstSpaceSize * 
                              header.secondSpaceSize;
                              
    var matrixSizeBytes = matrixSizeElements * header.dataSize;
                          
    var matrixData = new Float32Array(matrixSizeElements);
    
    for(var i=0; i<matrixSizeElements; i++){
      matrixData[i] = this._view.getFloat32(matrixOffset + i * header.dataSize, littleEndian) 
    }

    
    console.log(matrixData);
    
    // ------------- DECODING RESERVED BYTE SECTION -------------------
    var reservedBytesSectionOffset = matrixOffset + matrixSizeBytes;
    
    // we dont care about this section
    
    // ------------- DECODING INFO SECTION -------------------
    var infoSectionOffset = reservedBytesSectionOffset + header.reservedBytes;
    var infoRealLength = this._view.getUint8(infoSectionOffset);
    var infoBytes = new Uint8Array(inputBuffer, infoSectionOffset+1, infoRealLength);
    var info = String.fromCharCode.apply(String, infoBytes);
    
    console.log(infoRealLength);
    console.log( info );
    
    
    // ------------- DECODING HEADER OF LIST SECTION -------------------
    var headerOfListOffset = infoSectionOffset + 9;
    
    var listSize = 8;
    var offsetByteSize = 4;
    var totalByteSize = 2;
    var headerOfList = new Array(listSize);
    
    for(var i=0; i<listSize; i++){
      var record = {
        offset: this._view.getInt16(headerOfListOffset + i * (offsetByteSize+totalByteSize), littleEndian),
        total: this._view.getUint8(headerOfListOffset + i * (offsetByteSize+totalByteSize) + offsetByteSize, littleEndian)
      }
      headerOfList[i] = record;
    }
    
    console.log( headerOfList );
    
    
    // ------------- DECODING HEADER OF LIST SECTION -------------------
    var infoSection2Offset = headerOfListOffset + 48;
    
    var info2Bytes = new Uint8Array(inputBuffer, infoSection2Offset, 1000);
    var info2 = String.fromCharCode.apply(String, info2Bytes);
    console.log( info2 );
  }
  
} /* END of class EegModDecoder */

export { EegModDecoder }
