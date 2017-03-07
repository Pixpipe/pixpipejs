
import { PixpipeObject } from './PixpipeObject.js';

/**
* Filter is a base class and must be inherited to be used properly.
* A filter takes one or more Image instances as input and returns one or more
* instances of images as output.
* Every filter has a addInput(), a getOutput() and a update() methods.
* Every input and output can be arranged by category, so that internaly, a filter
* can use and output diferent kind of data.
*/
class Filter extends PixpipeObject {

  constructor(){
    super();
    this._type = Filter.TYPE();

    this._isInputValid = false;

    this._input = {
      "0": []
    };

    this._output = {
      "0" : []
    };

  }


  /**
  * Hardcode the datatype
  */
  static TYPE(){
    return "FILTER";
  }

  /**
  * Set an input, potentially associated to a category.
  * @param {Image} imageObject - instance of an image
  * @param {Number}
  */
  addInput( imageObject, category=0){

    if(category < 0 ){
      console.warn("A input cannot be of category inferior to zero");
      return;
    }

    // the category may not exist, we create it
    if( !(category in this._input) ){
      this._input[category] = [];
    }

    this._input[category].push( imageObject )
  }


  /**
  * Return outputs from a category (default category: 0)
  * @param {Number} category - a category of output.
  */
  getOutput( category=0 ){
    if( category in this._output ){
      return this._output[ category ];
    }else{
      return null;
    }

  }


  /**
  * MUST be implemented by the class that inherit this.
  * MUST change the value of this._isInputValid
  */
  validateInput(){
    console.warn("The update() method has not been written, input integrity are not checked.");
  }


  /**
  * MUST be implemented by the class that inherit this.
  * Launch the process.
  */
  update(){
    console.error("The update() method has not been written, this filter is not valid.");
  }


} /* END class Filter */

export { Filter }
