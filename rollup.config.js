var config = require('./package.json');

export default {
  entry: config.main,
  format: config.moduleFormat,
  moduleName: config.moduleName,
  sourceMap: true,
  dest: config.moduleBuildDir + '/' + config.moduleName + '.js'
};
