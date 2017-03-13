/**
 * Created by Administrator on 2017/3/13 0013.
 */
var gulp = require('gulp'),
    sass = require('gulp-sass');

gulp.task('sass',function(){
    gulp.src('./scss/*.scss')
        .pipe(sass())
        .pipe(gulp.dest('./css/'));
});

gulp.task('default',function () {
    gulp.start('sass');
    gulp.watch('./scss/*.scss',function () {
        gulp.start('sass');
    });
});