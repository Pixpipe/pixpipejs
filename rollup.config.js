var pkg = require('./package.json');

import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';
import builtins from 'rollup-plugin-node-builtins';
import globals from 'rollup-plugin-node-globals';
import uglify from 'rollup-plugin-uglify';


export default [
  {
    input: pkg.entry,
    output: {
      file: pkg.umd,
      sourcemap: true,
      name: pkg.name,
      format: 'umd'
    },

    plugins: [
      nodeResolve({
        preferBuiltins: false
      }),
      commonjs(),
      //bundleWorker(),
      globals(),
      builtins(),
      babel({
        babelrc: false,
        presets: [ 'es2015-rollup' ]
      }),

      uglify()
    ]
  }
];
