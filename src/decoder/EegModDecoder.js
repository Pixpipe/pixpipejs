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
    
    console.log( "header ");
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

    console.log("matrixData");
    console.log(matrixData);
    
    // ------------- DECODING RESERVED BYTE SECTION -------------------
    var reservedBytesSectionOffset = matrixOffset + matrixSizeBytes ;
    // we dont care about this section - we wont use it
    
    // ------------- DECODING INFO SECTION -------------------
    // This info section is lways corrupted - we wont use it
    var infoSectionOffset = reservedBytesSectionOffset + header.reservedBytes;
    var infoRealLength = this._view.getUint8(infoSectionOffset);
    var infoBytes = new Uint8Array(inputBuffer, infoSectionOffset+1, infoRealLength);
    var info = String.fromCharCode.apply(String, infoBytes);
    
    //console.log("info");
    //console.log( info );
    
    // ------------- DECODING HEADER OF LIST SECTION -------------------
    var headerOfListOffset = infoSectionOffset + 9;
    
    var listSize = 8;
    var offsetByteSize = 4;
    var totalByteSize = 2;
    var headerOfList = new Array(listSize);
    
    for(var i=0; i<listSize; i++){
      var record = {
        // !! IMPORTANT !! there is a known BUG in the offset value
        //offset: this._view.getInt16(headerOfListOffset + i * (offsetByteSize+totalByteSize), littleEndian),
        total: this._view.getUint16(headerOfListOffset + i * (offsetByteSize+totalByteSize) + offsetByteSize, littleEndian),
        labels: null
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
    headerOfList[7].description = "list of contexts";
    
    var infoSection2Offset = headerOfListOffset + 48;
    
    /*
    var info2Bytes = new Uint8Array(inputBuffer, infoSection2Offset, inputBuffer.byteLength - infoSection2Offset );
    var info2 = String.fromCharCode(...info2Bytes);
    //console.log( info2 );
    //console.log(info2Bytes);
    
    
    for(var i=0; i<info2Bytes.length; i++){
      //if(info2Bytes[i] > 128 )
      console.log( info2Bytes[i] + " --> " + info2[i]);
    }
    */
    
    
    var localOffset = infoSection2Offset

    // list 1 to 6 (0 to 5 on out 0-indexed array)
    for(var i=0; i<headerOfList.length - 2; i++){
      var nbOfElem = headerOfList[i].total;
      
      
      headerOfList[i].labels = nbOfElem ? new Array( nbOfElem ).fill("") : 0;
      
      for(var j=0; j<nbOfElem; j++){
        var strByteLength = this._view.getUint8(localOffset)
        
        if( strByteLength ){
          
          var strBytes = new Uint8Array(inputBuffer, localOffset+1, strByteLength );
          //var str = String.fromCharCode.apply(String, strBytes);
          var str = String.fromCharCode(...strBytes);
          // some ASCII charcode are wrong, hopefully always in the same way
          headerOfList[i].labels[j] = str.replace("æ", "µ").replace("ý", "²"); 
        }
        
        localOffset += strByteLength + 1;
        
      }
      
    }
    
    console.log("ICI: " + localOffset);
    
    // particular case for list 7 (6 on our 0-indexed array) -- the transformations
    // the total value is not the length but the actual value to consider
    var transformation = this._view.getUint8(localOffset);
    headerOfList[6].labels = transformation;
    
    localOffset += headerOfList[6].total*(transformation + 1);
    
    console.log("ICI2: " + localOffset);
    /*
    var offSetForListOfContexts = localOffset;
    
    var info2Bytes = new Uint8Array(inputBuffer, offSetForListOfContexts, inputBuffer.byteLength - offSetForListOfContexts );
    var info2 = String.fromCharCode.apply(String, info2Bytes);
    console.log( info2 );
    console.log(info2Bytes);
    
    
    for(var i=0; i<info2Bytes.length; i++){
      console.log( '[' + (offSetForListOfContexts + i) + '] ' + info2Bytes[i] + " --> " + info2[i]);
    }
    */
    
    // ------------- DECODING THE LIST OF CONTEXT -------------------
    
    // parsing the list of contexts
    var listOfContexts = headerOfList[ headerOfList.length - 1];
    listOfContexts.contextsByteLength = new Array( listOfContexts.total );
    listOfContexts.types = new Array( listOfContexts.total );
    listOfContexts.values = new Array( listOfContexts.total );
    
    const regexTypeDetection = /[a-zA-Z ]*\:{1}([a-zA-Z]*)[\[]?\d*[\]]?/;
    
    listOfContexts.labels = new Array( listOfContexts.total ).fill("");
    
    for(var iCtx=0; iCtx<listOfContexts.total; iCtx++){
  //  var iCtx = 0;
  //  while(  iCtx < listOfContexts.total){
      var strByteLength = this._view.getUint8(localOffset)

      var strBytes = new Uint8Array(inputBuffer, localOffset+1, strByteLength );
      var str = String.fromCharCode.apply(String, strBytes);
      listOfContexts.labels[iCtx] = str.split(":")[0];
      //listOfContexts.contextsByteLength[iCtx] = this._view.getUint8(localOffset + strByteLength + 1) ;
      listOfContexts.contextsByteLength[iCtx] = this._view.getUint16(localOffset + strByteLength + 1, littleEndian);
      
      var typeMatch = regexTypeDetection.exec( str );
      if(typeMatch){
        listOfContexts.types[iCtx] = typeMatch[1].toLowerCase();
      }else{
        listOfContexts.types[iCtx] = null;
      }
      
      localOffset += strByteLength + 3;
    }
    
    
    // getting the values for the contexts
    for(var iCtx=0; iCtx<listOfContexts.total; iCtx++){
      var value = null;
      if( listOfContexts.types[iCtx] === "single" ){
        // single precision floats are on 4 bytes
        value = this._view.getFloat32(localOffset, littleEndian);
        
      }else if(listOfContexts.types[iCtx] === "boolean"){
        value = new Array(listOfContexts.contextsByteLength[iCtx]);
        for(var b=0; b<value.length; b++){
          value[b] = !!this._view.getUint8(localOffset + b)
        }
        
      }else if(listOfContexts.types[iCtx] === "string"){
        var strByteLength = this._view.getUint8(localOffset)
        var strBytes = new Uint8Array(inputBuffer, localOffset+1, strByteLength );
        value = String.fromCharCode.apply(String, strBytes);
      }
      
      localOffset += listOfContexts.contextsByteLength[iCtx];
      listOfContexts.values[ iCtx ] = value;
      
    }
    
    // ------------- CLEANING HEADER OF LIST -------------------
    
    for(var i=0; i<headerOfList.length; i++){
      delete headerOfList[i].total;
    }
    
    delete headerOfList[7].contextsByteLength;
    delete headerOfList[7].types;
    
    console.log( "headerOfList" );
    console.log( headerOfList );
    
    var modEegMetadata = {
      comment: header.comment,
      sizes: {
        measure: header.measureSize,
        duration: header.durationSize,
        firstSpace: header.firstSpaceSize,
        secondSpace: header.secondSpaceSize,
      },
      informationList: headerOfList
    }
    
    
  }
  
} /* END of class EegModDecoder */

export { EegModDecoder }
