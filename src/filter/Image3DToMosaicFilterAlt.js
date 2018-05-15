/*
* Author   Jonathan Lurie - http://me.jonathanlurie.fr
* License  MIT
* Link      https://github.com/Pixpipe/pixpipejs
* Lab       MCIN - Montreal Neurological Institute
*/

import { Image3DToMosaicFilterAlt } from './Image3DToMosaicFilterAlt.js';


/**
* DEPRECATED: use Image3DToMosaicFilter instead of Image3DToMosaicFilterAlt.
*/
class Image3DToMosaicFilterAlt extends Image3DToMosaicFilter {

  constructor(){
    super();
    console.warn("DEPRECATED: use Image3DToMosaicFilter instead of Image3DToMosaicFilterAlt.");
  }


} /* END of class Image3DToMosaicFilterAlt */

export { Image3DToMosaicFilterAlt };
