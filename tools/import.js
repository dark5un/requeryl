#!/usr/bin/env node

// This script imports recursively all the wiremock responses and mappings
// usage: import.js <path>

var filePath = process.argv[2] || '.'

var fs = require('fs'),
    path = require('path'),
    exec = require('child_process').exec,
    recursive = require('recursive-readdir')

var config = require('../config')

var rethinkdb = require('rethinkdb'),
    _ = require('lodash')


var db = null;
rethinkdb.connect( {host: config.db.host, port: config.db.port}, function(err, conn) {
    if (err) throw err;
    db = conn;
})

recursive(filePath, function (err, files) {
    // Files is an array of filename
    console.log(files);

});

// packageJson.platforms.forEach(function(platform) {
//     var platformCmd = 'cordova platform ' + command + ' ' + platform;
//     exec(platformCmd);
// });
