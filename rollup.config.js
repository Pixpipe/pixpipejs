var config = require('./package.json');

import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';
//import bundleWorker from 'rollup-plugin-bundle-worker';
import builtins from 'rollup-plugin-node-builtins';
import globals from 'rollup-plugin-node-globals';


export default {
  entry: config.entry,
  format: config.moduleFormat,
  moduleName: config.moduleName,
  sourceMap: true,
  dest: config.moduleBuildDir + '/' + config.moduleName + '.module.js',
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
};
