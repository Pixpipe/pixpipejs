//import mathjs from 'mathjs';

import { ImageToImageFilter } from '../core/ImageToImageFilter.js';

class ImageBlendExpressionFilter extends ImageToImageFilter {

  constructor(){
    super();
      
    /*
    // provide a scope
    console.log('\nprovide a scope');
    var node2 = mathjs.parse('x^a');
    var code2 = node2.compile();
    console.log(node2.toString());                    // "x ^ a"
    var scope = {
      x: 3,
      a: 2
    };
    console.log(code2.eval(scope));

    console.log(mathjs);
    */
  }



} /* END of class ImageBlendExpressionFilter */


export { ImageBlendExpressionFilter }
