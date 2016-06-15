/**
 * Togetheroo Gulp Automation
 *
 * Main tasks:
 * 
 * - "gulp" - build and run the site
 * - "gulp build" - build src/ into build/
 * - "gulp run" - watch files and start a local server
 * - "gulp deploy:ftp" - build and deploy build/ to the live site
 * - "gulp deploy:gh-pages" - build and deploy build/ to gh-pages
 * - "gulp clean:build" - clean build/
 *
 * Command line flags:
 * - "-p" or "--production" - minifies the files when building the site. If this
 *                            flag is not set, the build will not be minified.
 */

// _____________________________________________________________________________
// SETUP
// Bring in the required node modules to make everything run smoothly

var gulp = require("gulp");
var sass = require("gulp-sass");
var autoprefixer = require("gulp-autoprefixer");
var sourcemaps = require("gulp-sourcemaps");
var liveReload = require("gulp-livereload");
var order = require("gulp-order");
var concat = require("gulp-concat");
var uglify = require("gulp-uglify");
var newer = require("gulp-newer");
var ghPages = require("gulp-gh-pages");
var open = require("gulp-open");
var gutil = require("gulp-util");
var jshint = require("gulp-jshint"); // Requires npm jshint
var stylish = require("jshint-stylish");
var browserify = require("browserify");
var source = require("vinyl-source-stream");
var buffer = require("vinyl-buffer");
var del = require("del");
var express = require("express");
var path = require("path");
var fs = require("fs");
var runSequence = require("run-sequence");
var gulpif = require("gulp-if");
var ftp = require("vinyl-ftp");

// Check the command line to see if this is a production build
var isProduction = (gutil.env.p || gutil.env.production);
console.log("Build environment: " + (isProduction ? "production" : "debug"));


// _____________________________________________________________________________
// BUILD TASKS
// These gulp tasks take everything that is in src/, process them (e.g. turn
// SASS into css) and output them into build/.

// Take any HTML and in src/ and copy it over to build/
// Pipe the changes to LiveReload, so that saving a file triggers the site to 
// reload in the browser.
gulp.task("copy-html", function () {
    return gulp.src("src/**/*.html")
        .pipe(gulp.dest("build/"))
        .pipe(liveReload());
});

// Turn the SASS in src/ into css in build/.  This task autoprefixes the SASS 
// with CSS vendor prefixes.  It also adds sourcemaps, making debugging with 
// inspector much easier.
gulp.task("sass", function () {
    return gulp.src("src/sass/**/*.{scss,sass}")
        .pipe(sourcemaps.init())
            .pipe(sass({
                outputStyle: "compressed"
            }).on("error", sass.logError))
            .pipe(autoprefixer({
                browsers: [
                    // Add vendor prefixes to match bootstrap:
                    // https://github.com/twbs/bootstrap-sass#sass-autoprefixer
                    "Android 2.3",
                    "Android >= 4",
                    "Chrome >= 20",
                    "Firefox >= 24",
                    "Explorer >= 8",
                    "iOS >= 6",
                    "Opera >= 12",
                    "Safari >= 6"
                ],
                cascade: true
            }))
        .pipe(sourcemaps.write("maps"))
        .pipe(gulp.dest("build"))
        .pipe(liveReload());
});

// Combine, sourcemap and uglify vendor libraries (e.g. bootstrap, jquery, etc.)
// into build/js/libs.js folder.  The vendor libraries need to be added in a 
// particular order (e.g. bootstrap needs jquery).  This task also adds 
// sourcemaps, making debugging with inspector much easier.
gulp.task("js-libs", function() {
    return gulp.src("src/js/libs/**/*.js")
        .pipe(order([
            "tether.js",
            "shepherd-custom.js", // Shepherd depends on thether
            "**/*.js" 
        ]))
        .pipe(sourcemaps.init())
            .pipe(concat("libs.js"))
            .pipe(gulpif(isProduction, uglify()))
        .pipe(sourcemaps.write("libs-maps"))
        .pipe(gulp.dest("build/js"))
        .pipe(liveReload());
});

gulp.task("js-playspace", function() {
    var b = browserify({
        entries: "src/js/main.js",
        debug: true
    })
    return b.bundle()
        .on("error", gutil.log)
        .pipe(source("main.js"))
        .pipe(buffer())
        .pipe(sourcemaps.init({loadMaps: true}))
            .pipe(gulpif(isProduction, uglify()))
            .on("error", gutil.log)
        .pipe(sourcemaps.write("main-maps"))
        .pipe(gulp.dest("build/js"))
        .pipe(liveReload());
});

gulp.task("jslint", function() {
    return gulp.src(["src/js/**.js", "!src/js/libs/**/*.js"])
        .pipe(jshint())
        .pipe(jshint.reporter(stylish));
});

// Take any (new) images from src/images over to build/images.
gulp.task("images", function () {
    return gulp.src(["src/images/**/*.*", "!src/images/**/*.{ai,tps,py,pes}"])
        .pipe(newer("build/images"))
        .pipe(gulp.dest("build/images"));
});

// Take any (new) app assets from src/app-assets over to build/app-assets.
gulp.task("app-assets", function () {
    return gulp.src([
            "src/app-assets/**/*.*", 
            "!src/app-assets/**/*.{ai,tps,py,pes}",
            "!src/app-assets/*/atlases/frames/**/*.*"
        ])
        .pipe(newer("build/app-assets"))
        .pipe(gulp.dest("build/app-assets"));
});

// Take any (new) fonts from src/fonts over to build/fonts.
gulp.task("fonts", function () {
    return gulp.src("src/fonts/**/*.*")
        .pipe(newer("build/fonts"))
        .pipe(gulp.dest("build/fonts"));
});

// The build task will run all the individual build-related tasks above.
gulp.task("build", [
    "copy-html",
    "sass",
    "jslint",
    "js-libs",
    "js-playspace",
    "images",
    "app-assets",
    "fonts"
]);


// _____________________________________________________________________________
// RUNNING TASKS
// These gulp tasks handle everything related to running the site.  Starting a
// local server, watching for changes to files, opening a browser, etc.

// Watch for changes to any files (e.g. saving a file) and then trigger the 
// appropraite build task.  This task also starts a LiveReload server that can
// tell the browser to refresh the page automatically when changes are made.
gulp.task("watch", function () {
    liveReload.listen(); // Start the LiveReload server
    gulp.watch("src/**/*.html", ["copy-html"]);
    gulp.watch("src/js/libs/**/*.js", ["js-libs"]);
    gulp.watch(["src/js/**/*.js", "!src/js/libs/**/*.js"], 
        ["jslint", "js-playspace"]);
    gulp.watch("src/sass/**/*.{scss,sass,css}", ["sass"]);
    gulp.watch("src/images/**/*.*", ["images"]);
    gulp.watch("src/app-assets/**/*.*", ["app-assets"]);
    gulp.watch("src/fonts/**/*.*", ["fonts"]);
});

// Start an express server that serves everything in build/ to localhost:8080/.
gulp.task("express-server", function () {
    var app = express();
    app.use(express.static(path.join(__dirname, "build")));
    app.listen(8080);
});

// Automatically open localhost:8080/ in the browser using whatever the default
// browser.
gulp.task("open", function() {
    return gulp.src(__filename)
        .pipe(open({uri: "http://127.0.0.1:8080"}));
});

// The build task will run all the individual run-related tasks above.
gulp.task("run", [
    "watch",
    "express-server",
    "open"
]);


// _____________________________________________________________________________
// DEPLOYING TASKS
// These gulp tasks handle everything related to deploying the site to live
// server(s).

gulp.task("push:gh-pages", function () {
    return gulp.src("./build/**/*")
        .pipe(ghPages({
            remoteUrl: "https://github.com/mikewesthad/adaptablox.git"
        }));
});

// Build, deploy build/ folder to gh-pages and then clean up
gulp.task("deploy:gh-pages", function () {
    return runSequence("build", "push:gh-pages", "clean:publish");
});

gulp.task("push:ftp", function () {
    var url = "/public_html/playspace/";
    var ftpInfo = require("./ftp-info.json");
    var conn = ftp.create({
        host: ftpInfo.host,
        user: ftpInfo.user,
        password: ftpInfo.password,
        parallel: 4,
        log: gutil.log,
        remotePath: url
    });
    // Base "." will translate to /public_html
    return gulp.src("./build/**/*", {base: "./build", buffer: false})
        .pipe(conn.newer(url))
        .pipe(conn.dest(url));
});

// Build & deploy the togetheroo/playspace/
gulp.task("deploy:ftp", function () {
    return runSequence("build", "push:ftp");
});


// _____________________________________________________________________________
// CLEANING TASKS
// These gulp tasks handle deleting files.

// Delete all of the build folder contents.
gulp.task("clean:build", function () {
    return del(["./build/**/*"]);
});

gulp.task("clean:publish", function () {
    return del(["./.publish"]);
});


// _____________________________________________________________________________
// DEFAULT TASK
// This gulp task runs automatically when you don't specify task.

// Build and then run it.
gulp.task("default", function(callback) {
    runSequence("build", "run", callback);
});