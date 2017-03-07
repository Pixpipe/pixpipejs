/**
* PixpipeObject is the base object of all. It creates a uuid and has few
* generic attributes like type, name and description. Not all these attributes
* always useful;
*/
class PixpipeObject {

  constructor(){
    // unique identifier
    this._uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    });

    this._name = null;
    this._description = null;
    this._type = PixpipeObject.TYPE();
  }


  /**
  * Acces it like a static attribute.
  * Must be overloaded.
  */
  static TYPE(){
    return "GENERIC";
  }


  /**
  * Compare a give type to the type of this object.
  * @param {String} t - a type, better to call the static method of each object, like Image.TYPE()
  */
  isOfType( t ){
    return !(this._type.localeCompare(t))
  }


  /**
  * Get type of object.
  * @return {String} the type
  */
  getType(){
    this._type;
  }

  /**
  * Return a copy of the uuid
  */
  get uuid(){
    return this._uuid.slice();
  }


  // some anti-messup protection
  set _uuid(v){
    console.warn("Changing the uuid manually is not allowed.");
  }


  /**
  * Setter fo the name.
  * @param {String} n - name
  */
  setName( n ){
    this._name = n;
  }


  /**
  * Getter for the name
  * @return {String} name
  */
  getName(){
    return this._name;
  }


  /**
  * Setter fo the description.
  * @param {String} d - description
  */
  setDescription( d ){
    this._description = d;
  }


  /**
  * Getter for the description
  * @return {String} description
  */
  getDescription(){
    return this._description;
  }


}

export { PixpipeObject }
