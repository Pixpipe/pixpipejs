var pkg = require('./package.json');

import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';
import builtins from 'rollup-plugin-node-builtins';
import globals from 'rollup-plugin-node-globals';
import uglify from 'rollup-plugin-uglify';


export default [

  // Default 'main' bundle
  // UMD + ES5 (transpiled from ES6 using Babel)
  {
    input: pkg.entry,
    output: {
      file: pkg.main,
      sourcemap: true,
      name: pkg.name,
      format: 'umd'
    },

    plugins: [
      nodeResolve({
        preferBuiltins: false
      }),
      commonjs(),
      globals(),
      builtins(),
      babel({
        babelrc: false,
        presets: [ 'es2015-rollup' ]
      })
    ]
  },


  // UMD + ES5 + min (transpiled from ES6 using Babel)
  {
    input: pkg.entry,
    output: {
      file: pkg.min,
      sourcemap: false,
      name: pkg.name,
      format: 'umd'
    },

    plugins: [
      nodeResolve({
        preferBuiltins: false
      }),
      commonjs(),
      globals(),
      builtins(),
      babel({
        babelrc: false,
        presets: [ 'es2015-rollup' ]
      }),

      uglify()
    ]
  },

  // UMD + ES6
  {
    input: pkg.entry,
    output: {
      file: pkg.es6,
      name: pkg.name,
      sourcemap: true,
      format: 'umd'
    },

    plugins: [
      nodeResolve({
        preferBuiltins: false
      }),
      commonjs(),
      globals(),
      builtins()
    ]
  },

  // ESMODULE + ES6
  {
    input: pkg.entry,
    output: {
      file: pkg.esmodule,
      name: pkg.name,
      sourcemap: true,
      format: 'es'
    },

    plugins: [
      nodeResolve({
        preferBuiltins: false
      }),
      commonjs(),
      globals(),
      builtins()
    ]
  }

];
