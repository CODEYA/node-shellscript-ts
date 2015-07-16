var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var reporters = require('jasmine-reporters');

var tsProject = $.typescript.createProject({
    target: "ES6",              // Specify ECMAScript target version: 'ES3' (default), 'ES5' or 'ES6'.
    declarationFiles: true,     // Generates corresponding .d.ts files.
    removeComments: true,       // Do not emit comments to output.
    module: 'commonjs',         // Specify module code generation: 'commonjs' or 'amd'
    noEmitOnError: true,        // Do not emit outputs if any type checking errors were reported.
    sortOutput: true,           // Sort output files. Usefull if you want to concatenate files (see below).
    sourceRoot: 'src'           // Specifies the location where debugger should locate TypeScript files instead of source locations.
});

gulp.task('build', function() {
    return gulp.src('src/*.ts')
        .pipe($.typescript(tsProject))
        .pipe(gulp.dest('bin'));
});

gulp.task('test-compile', function (cb) {
  gulp.src(['src/*.ts', 'test/*.ts'])
      .pipe($.typescript(tsProject))
      .pipe(gulp.dest('test'))
      .on('end', function() { cb(); });
});

gulp.task('test', ['test-compile'], function () {
  gulp.src('test/*.spec.js')
      .pipe($.jasmine({
        verbose: true,
        reporter: new reporters.JUnitXmlReporter({
          savePath: './test',
        })
      }));
});

gulp.task('default', ['build']);
