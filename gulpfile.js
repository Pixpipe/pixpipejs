/* File: gulpfile.js */

// grab our gulp packages
var gulp  = require('gulp'),
    gutil = require('gulp-util'),
    rollup     = require('gulp-rollup'),
    config = require('./package.json');

// create a default task and just log a message
gulp.task('default', function() {
  return gutil.log('Gulp is running!')
});



// source budling task with rollup
gulp.task('bundle', function() {

  gulp.src('./src/**/*.js')
  // transform the files here.
  .pipe(rollup({
    // any option supported by Rollup can be set here.
    entry: config.main,//'./src/es6module.js',
    format: config.moduleFormat, //'umd',
    moduleName: config.moduleName //'ES6MOD',
  }))

  .pipe(gulp.dest('./' + config.moduleBuildDir + '/' + config.name));

  return gutil.log('Building source bundle...')
});


// run rollup to bundle the source
gulp.watch('./src/**/*.js', ['bundle']);
