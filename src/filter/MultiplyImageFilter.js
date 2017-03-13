/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { ImageToImageFilter } from '../core/ImageToImageFilter.js';

class MultiplyImageFilter extends {

  construtor(){
    super();

    // both input are images.
    this._inputValidator[ 0 ] = Image2D.TYPE();
    this._inputValidator[ 1 ] = Image2D.TYPE();
  }

  hasSameSize(){
    
  }


} /* END class MultiplyImageFilter */

export { MultiplyImageFilter }
