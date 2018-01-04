/*
* Author   Jonathan Lurie - http://me.jonathanlurie.fr
* License  MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/


import { PixpipeContainer } from './PixpipeContainer.js';


/**
* PixpipeContainerMultiData is a generic container very close from PixpipeContainer
* (from which it inherits). The main diference is that an instance of PixpipeContainerMultiData
* can contain multiple dataset since the _data property is an Array. This is particularly
* convenient when storing large arrays of numbers that must be split in multiple collections
* such as meshes (a typed array for vertices positions, another typed array for grouping as
* triangle, another one for colors, etc.)
* The class PixpipeContainerMultiData should not be used as-is and should be iherited
* by a more specific datastructure.
*/
class PixpipeContainerMultiData extends PixpipeContainer {
  constructor(){
    super();
    this._data = [];

    // the 'dataIndex' metadata provides an indexing to the _data Array.
    // it is an index to find what kind of sub-dataset is at what index of _data
    this.setMetadata("dataIndex", {} );

    // This provides a list of Strings that identify all the mandatory dataset
    // to achieve a certain level of integrity. By default, this list is empty but
    // as soon as a class inherits from PixpipeContainerMultiData, a list of names
    // should be mentioned (hardcoded in constructor). This will then allow to
    // perform an integrity check.
    this.setMetadata("mandatoryDataset", [] );
  }


  /**
  * Get a sub-dataset given its name.
  * Notice: This gives a pointer, not a copy. Modifying the returns array will affect this object.
  * @param {String} name - name of the sub-dataset
  * @return {TypedArray} a pointer to the typed array of the sub-dataset
  */
  getData( name ){
    var index = this.getDataIndex(name);
    if( index !== -1 ){
      return this._data[index];
    }

    return null;
  }


  /**
  * Get a copy of a sub-dataset given its name.
  * Notice: This gives a copy of a typed array. Modifying the returns array will NOT affect this object.
  * @param {String} name - name of the sub-dataset
  * @return {TypedArray} a copy of the typed array of the sub-dataset
  */
  getDataCopy( name ){
    var data = this.getData(name);
    if( data ){
      return new data.constructor( data );
    }

    return null;
  }


  /**
  * Get the index of a sub-dataset within the _data list, giving its name.
  * @param {String} name - name of the sub-dataset
  * @return {Number} Index of -1 if non existant
  */
  getDataIndex( name ){
    var index = -1;
    var dataIndex = this._metadata.dataIndex;

    if( name in dataIndex ){
      index = dataIndex[name];
    }
    return index;
  }


  /**
  * Return wether or not a sub-dataset exists given its name
  * @param {String} name - name of the sub-dataset
  * @return {Boolean} true if sub-data exists, false if not
  */
  doesDataExist( name ){
    return (this.getDataIndex(name) !== -1);
  }


  /**
  * Associate d with the internal sub-dataset by pointer copy (if Object or Array).
  * A name is necessary so that the internal structure can indentify the sub-dataset,
  * to process it of to retrieve it.
  * @param {TypedArray} d - array of data to associate (not a deep copy)
  * @param {String} name - name to give to thissub-dataset
  */
  setData( d, name=null ){
    if( !d ){
      console.warn("Cannot add null as a dataset.");
      return;
    }

    var index = this.getDataIndex(name);
    var dataIndex = this._metadata.dataIndex;

    // if replacing data at a given position
    if( index !== -1 ){
      this._data[ index ] = d;
    }else{
      index = this._data.length;
      this._data.push( d );
      dataIndex[name] = index;
    }
  }


  /**
  * Performs an integrity check of eixisting sub-dataset Vs mandatory sub-dataset
  * @return {Boolean} true if integrity is ok, false if not
  */
  checkIntegrity(){
    var isOk = true;

    var mandatoryDataset = this.getMetadata("mandatoryDataset");
    for(var i=0; i<mandatoryDataset.length; i++){
      var exists = this.doesDataExist( mandatoryDataset[i] );
      isOk = isOk && exists;
      if(!exists){
        console.warn(`The sub-data of name: ${mandatoryDataset[i]} is missing`);
      }
    }

    return isOk;
  }


  /**
  * Get a deep copy clone of this object. Works for classes that ihnerit from PixpipeContainerMultiData.
  * Notice: the sub-datasets will possibly be ina different order, but with an index that tracks them properly.
  * In other word, not the same order but not an issue.
  * @return {PixpipeContainerMultiData} a clone.
  */
  clone(){
    var metadataClone = this.getMetadataClone();

    if( !metadataClone ){
      console.warn("The metadata object is invalid, cloning is impossible.");
      return null;
    }

    var dataIndex = this._metadata.dataIndex;
    var cloneObject = new this.constructor();
    cloneObject.setRawMetadata( metadataClone );

    for(var dataName in  dataIndex ){
      cloneObject.setData( this.getDataCopy( dataName ), dataName );
    }
    return cloneObject;
  }


} /* END of class PixpipeContainerMultiData */

export { PixpipeContainerMultiData }
