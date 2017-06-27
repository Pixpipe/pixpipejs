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
        // !! IMPORTANT !! there is a know BUG in the offset value
        //offset: this._view.getInt16(headerOfListOffset + i * (offsetByteSize+totalByteSize), littleEndian),
        total: this._view.getUint8(headerOfListOffset + i * (offsetByteSize+totalByteSize) + offsetByteSize, littleEndian),
        labels: []
      }
      headerOfList[i] = record;
    }
    
    headerOfList[0].description = "list of labels for measure dimension";
    headerOfList[1].description = "list of labels for duration dimension";
    headerOfList[2].description = "list of labels for first space dimension";
    headerOfList[3].description = "list of labels for second space dimension";
    headerOfList[4].description = "list of scales";
    headerOfList[5].description = "list of units";
    headerOfList[6].description = "list of transformations";
    headerOfList[7].description = "list of context";
    
    console.log( headerOfList );
    
    
    // ------------- DECODING HEADER OF LIST SECTION -------------------
    
    
    
    var infoSection2Offset = headerOfListOffset + 48;
    
    var info2Bytes = new Uint8Array(inputBuffer, infoSection2Offset, inputBuffer.byteLength - infoSection2Offset );
    var info2 = String.fromCharCode.apply(String, info2Bytes);
    console.log( info2 );
    console.log(info2Bytes);
    
    for(var i=0; i<info2Bytes.length; i++){
      console.log( info2Bytes[i] + " --> " + info2[i]);
    }
    
    var labels = [];
    
    var localOffset = infoSection2Offset
    var uintAtLocalOffset = this._view.getUint8(localOffset)
    
    while( uintAtLocalOffset > 0){
      var strByteLength = this._view.getUint8(localOffset)
      
      var strBytes = new Uint8Array(inputBuffer, localOffset+1, strByteLength );
      var str = String.fromCharCode.apply(String, strBytes);
      
      console.log( str );
      
      localOffset += strByteLength + 1;
      
      uintAtLocalOffset = this._view.getUint8(localOffset)
    }
    
    /*
    for(var i=0; i<info2Bytes.length; i++){
      var charcode = info2Bytes[i]; // the charcode must be >=32 and < 128 so that it's a proper characther
      
      // 
      if( charcode >= 32 && charcode < 128 ){
        
      }
      
      
      var char = String.fromCharCode(charcode)
      console.log( charcode + " --> " + char );
    }
    */
    
  }
  
} /* END of class EegModDecoder */

export { EegModDecoder }
