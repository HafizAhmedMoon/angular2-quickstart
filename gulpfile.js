'use strict';

var browserSync = require('browser-sync').create();
var reload = browserSync.reload;
var del = require('del');
var path = require('path');
var gulp = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var embedTemplates = require('gulp-angular-embed-templates');
var autoprefixer = require('gulp-autoprefixer');
var concat = require('gulp-concat');
var inject = require('gulp-inject');
var minifyCss = require('gulp-minify-css');
var replace = require('gulp-replace');
var rev = require('gulp-rev');
var sass = require('gulp-sass');
var ts = require('gulp-typescript');
var usemin = require('gulp-usemin');
var uglify = require('gulp-uglify');
var gutil = require('gulp-util');
var watch = require('gulp-watch');
var runSequence = require('run-sequence');
var typescript = require('typescript');
var wiredep = require('wiredep').stream;
var through = require('through2');
var tsProject = ts.createProject('tsconfig.json', {
  outFile: 'app.js',
  typescript: typescript
});

var port = process.env.PORT || 8080;

var paths = {
  tmp: './.tmp',
  src: './src',
  dist: './dist'
};

gulp.task('clean', function () {
  del.sync([paths.dist, paths.tmp]);
});

gulp.task('fonts', function () {
  return gulp.src(require('./fonts.json'))
    .pipe(gulp.dest(paths.tmp + '/fonts'))
});

gulp.task('copy', function () {
  gulp.src([paths.tmp + '/fonts/**/*', paths.src + '/fonts/**/*'])
    .pipe(gulp.dest(paths.dist + '/fonts'));
  gulp.src([paths.src + '/assets/**/*'])
    .pipe(gulp.dest(paths.dist + '/assets'));
});

gulp.task('index', function () {
  return gulp.src(paths.src + '/index.html')
    .pipe(gulp.dest(paths.tmp));
});

gulp.task('wiredep', function () {
  var bowerIgnore = require('./bowerignore.json').map(function (val) {
    if (val.charAt(0) == '/' && val.slice(-1) == '/')
      return new RegExp(val.slice(1, -1));
  });
  return gulp.src(paths.tmp + '/index.html')
    .pipe(wiredep({
      exclude: bowerIgnore
    }))
    .pipe(gulp.dest(paths.tmp));
});

gulp.task('inject:sass', function () {
  return gulp.src(paths.src + '/styles/app.{sass,scss}')
    .pipe(inject(gulp.src([paths.src + '/styles/**/*.{sass,scss}', '!' + paths.src + '/styles/app.{sass,scss}'], {read: false}), {
      transform: function (filePath, f, i, l, source) {
        var ext = filePath.split('.').pop(),
          sExt = source.path.split('.').pop();
        filePath = filePath.replace('/src/styles/', '');
        return '@import "' + filePath + '"' + (sExt == 'scss' ? ';' : '');
      }
    }))
    .pipe(gulp.dest(paths.src + '/styles'));
});

gulp.task('sass', function () {
  return gulp.src(paths.src + '/styles/app.{sass,scss}')
    .pipe(sass())
    .on('error', sass.logError)
    .pipe(autoprefixer('last 5 versions'))
    .pipe(gulp.dest(paths.tmp + '/styles'))
    .pipe(browserSync.stream());
});

gulp.task('css', function () {
  return gulp.src(paths.src + '/styles/**/*.css')
    .pipe(autoprefixer('last 5 versions'))
    .on('error', function () {
      gutil.log.apply(gutil, arguments);
      this.emit('end');
    })
    .pipe(gulp.dest(paths.tmp + '/styles'))
    .pipe(browserSync.stream());
});

gulp.task('inject:css', function () {
  return gulp.src(paths.tmp + '/index.html')
    .pipe(inject(gulp.src([paths.tmp + '/styles/**/*.css'], {read: false}), {
      transform: function (filePath) {
        filePath = filePath.replace('/.tmp/', '');
        return '<link rel="stylesheet" href="' + filePath + '">';
      }
    }))
    .pipe(gulp.dest(paths.tmp));
});

gulp.task('ts', function () {
  var tsResult = gulp.src(['./src/**/*.ts', './typings/main.d.ts'])
    .pipe(newFile('./src/app.ts'))
    .pipe(sourcemaps.init())
    .pipe(embedTemplates())
    .pipe(ts(tsProject));
  return tsResult.js
    .pipe(sourcemaps.write('./', {sourceRoot: '/ts'}))
    .pipe(gulp.dest('.tmp/scripts'));
});

function newFile(path, content) {
  if (!path) return;
  content = content || '';
  return through.obj(function (file, encoding, callback) {
    this.push(new gutil.File({path: path, contents: new Buffer(content)}));
    callback(null, file);
  })
}

gulp.task('js', function () {
  return gulp.src(paths.src + '/scripts/**/*.js')
    .pipe(gulp.dest(paths.tmp + '/scripts'));
});

gulp.task('inject:script', function () {
  return gulp.src(paths.tmp + '/index.html')
    .pipe(inject(gulp.src([paths.tmp + '/scripts/**/*.js'], {read: false}), {
      transform: function (filePath) {
        filePath = filePath.replace('/.tmp/', '');
        return '<script src="' + filePath + '"></script>';
      }
    }))
    .pipe(gulp.dest(paths.tmp));
});

gulp.task('usemin:pre', function () {
  return gulp.src(paths.tmp + '/index.html')
    .pipe(usemin({
      styles: [rev()],
      vendor: [rev()],
      //scripts: [uglify(), replace(/('|")use strict('|");?/g, ''), rev()]
      scripts: [rev()]
    }))
    .pipe(gulp.dest(paths.dist));
});

gulp.task('usemin', ['usemin:pre'], function () {
  return gulp.src(paths.dist + '/styles/**/*.css')
    .pipe(minifyCss({keepSpecialComments: 0}))
    .pipe(gulp.dest(paths.dist + '/styles'))
});

gulp.task('usemin:dev', function () {
  return gulp.src(paths.tmp + '/index.html')
    .pipe(usemin({
      styles: [rev()],
      vendor: [rev()],
      scripts: [rev()]
    }))
    .pipe(gulp.dest(paths.dist));
});

gulp.task('serve', ['default'], function () {
  browserSync.init({
    port: port,
    server: {
      baseDir: [
        paths.tmp,
        paths.src
      ],
      routes: {
        "/node_modules": "node_modules"
      }
    }
  })
});

gulp.task('serve:dist', ['build'], function () {
  browserSync.init({
    port: port,
    server: paths.dist
  })
});

gulp.task('watch', function () {
  watch(['./bower.json', './bowerignore.json'], function () {
    runSequence('wiredep', reload);
  });
  watch(require('./fonts.json'), function (file) {
    unlinkFromTmp(file);
    gulp.start('fonts');
  });
  watch(paths.src + '/index.html', function () {
    runSequence('index', 'inject:css', 'inject:script', reload);
  });
  watch([paths.src + '/styles/**/*.{sass,scss}', '!' + paths.src + '/styles/app.{sass,scss}'], function () {
    gulp.start('inject:sass');
  });
  watch(paths.src + '/styles/app.{sass,scss}', function () {
    gulp.start('sass');
  });
  watch(paths.src + '/styles/**/*.css', function (file) {
    unlinkFromTmp(file);
    gulp.start('css');
  });
  watch(paths.tmp + '/styles/**/*.css', function (file) {
    var shouldReload = file.event == 'unlink' || file.event == 'add';
    runSequence('inject:css', shouldReload ? reload : new Function());
  });
  watch(paths.src + '/scripts/**/*.js', function (file) {
    unlinkFromTmp(file);
    runSequence('js', 'inject:script', reload);
  });
  watch(paths.src + '/**/*.ts', function () {
    runSequence('ts', reload);
  });
});

function unlinkFromTmp(file) {
  if (!file) return;
  if (file.event == 'unlink') {
    del.sync(file.path.replace(path.resolve(paths.src), path.resolve(paths.tmp)));
  }
}

gulp.task('build', function (done) {
  runSequence(
    'clean',
    'fonts',
    [
      'index',
      'copy',
      'wiredep',
      'inject:sass',
      'css',
      'ts',
      'js'
    ],
    'sass',
    'inject:script',
    'inject:css',
    'usemin',
    done);
});

gulp.task('build:dev', function (done) {
  runSequence(
    'clean',
    'fonts',
    [
      'index',
      'copy',
      'wiredep',
      'inject:sass',
      'css',
      'ts',
      'js'
    ],
    'sass',
    'inject:script',
    'inject:css',
    'usemin:dev',
    done);
});

gulp.task('default', function (done) {
  runSequence(
    'clean',
    [
      'index',
      'fonts',
      'wiredep',
      'inject:sass',
      'sass',
      'css',
      'ts',
      'js'
    ],
    'inject:script',
    'inject:css',
    'watch',
    done);
});
