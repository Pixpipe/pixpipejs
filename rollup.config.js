var config = require('./package.json');

import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';
//import bundleWorker from 'rollup-plugin-bundle-worker';
import builtins from 'rollup-plugin-node-builtins';
import globals from 'rollup-plugin-node-globals';


export default [
  {

    input: config.entry,
    output: {
      file: config.moduleBuildDir + '/' + config.moduleName + '.' + config.moduleFormat + '.js',
      format: config.moduleFormat,
      name: config.moduleName,
      sourcemap: true,
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
      })
    ]
  },
  {
    input: config.entry,
    output: {
      file: config.moduleBuildDir + '/' + config.moduleName + '.js',
      sourcemap: true,
      name: config.moduleName,
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
      })
    ]
  }
];
