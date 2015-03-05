var gulp = require('gulp');
var $ = require('gulp-load-plugins')();

gulp.task('build', function() {
    var tsProject = $.typescript.createProject({
        target: "ES5",              // Specify ECMAScript target version: 'ES3' (default), 'ES5' or 'ES6'.
        declarationFiles: true,     // Generates corresponding .d.ts files.
        removeComments: true,       // Do not emit comments to output.
        module: 'commonjs',         // Specify module code generation: 'commonjs' or 'amd'
        noEmitOnError: true,        // Do not emit outputs if any type checking errors were reported.
        sortOutput: true,           // Sort output files. Usefull if you want to concatenate files (see below).
        sourceRoot: 'src'           // Specifies the location where debugger should locate TypeScript files instead of source locations.
    });

    return gulp.src('src/*.ts')
        .pipe($.typescript(tsProject))
        .pipe($.uglify({
            mangle: true,           // Pass false to skip mangling names.
            compress: true,         // Pass an object to specify custom compressor options. Pass false to skip compression completely.
            preserveComments: "all" // A convenience option for options.output.comments. Defaults to preserving no comments. all / some / function
        }))
        .pipe(gulp.dest('bin'));
});

gulp.task('default', ['build']);
