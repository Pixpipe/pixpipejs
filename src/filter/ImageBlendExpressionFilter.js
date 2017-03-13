//import mathjs from 'mathjs';

import Parser from 'expr-eval'
//var Parser = require('expr-eval').Parser;

import { ImageToImageFilter } from '../core/ImageToImageFilter.js';

class ImageBlendExpressionFilter extends ImageToImageFilter {

  constructor(){
    super();


    var parser = new Parser.Parser();
    var expr = parser.parse('2 * x + 1');
    console.log(expr.evaluate({ x: 3 })); // 7

    // or
    //Parser.evaluate('6 * x', { x: 7 }) // 42

  }



} /* END of class ImageBlendExpressionFilter */


export { ImageBlendExpressionFilter }
