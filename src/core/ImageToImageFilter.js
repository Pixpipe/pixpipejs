/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { Filter } from './Filter.js';
import { Image2D } from './Image2D.js';

/**
* ImageToImageFilter is not to be used as-is but rather as a base class for any
* filter that input a single Image2D and output a single Image2D.
* This class does not overload the update() method.
*/
class ImageToImageFilter extends Filter {

  constructor(){
    super();
    this._inputValidator[ 0 ] = Image2D.TYPE();

    // will be a copy of the input Image2D buffer
    this._inputBuffer = null;
  }

} /* END class ImageToImageFilter */

export { ImageToImageFilter }
