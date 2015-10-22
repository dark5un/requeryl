var Promise = require('bluebird')

var config = require('./config')

var http = require('http'),
    httpProxy = require('http-proxy'),
    proxy = httpProxy.createProxyServer({})

var dns = require('native-dns'),
    dnsServer = dns.createServer()

var rethinkdb = require('rethinkdb')

var db = null;
rethinkdb.connect( {host: config.db.host, port: config.db.port}, function(err, conn) {
    if (err) throw err;
    db = conn;
})

var express = require('express')
var api = express(),
    app = express()

var fs = require('fs'),
    _ = require('lodash')

Promise.promisifyAll(fs)

var watchResolvConf = function() {
    fs.watchFile('/etc/resolv.conf', function (curr, prev) {
        setLocalDns()
    });
}

var unwatchResolvConf = function() {
    fs.unwatchFile('/etc/resolv.conf');
}

var setLocalDns = function(callback) {
    var findLocalNameserver = /.*nameserver\s*127\.0\.0\.1.*/
    fs.readFileAsync('/etc/resolv.conf', { encoding: 'utf8' })
        .then(function(resolvData) {
            if(findLocalNameserver.test(resolvData)) { return new Promise(function(resolve, reject) { reject() }) }
            return resolvData.toString().split('\n')
        })
        .then(function(lines) {
            var linesProcessed = lines || []
            for(var i=0; i<linesProcessed.length; i++ ) {
                if(linesProcessed[i].indexOf('nameserver') !== -1) {
                    linesProcessed.splice(i, 0, 'nameserver 127.0.0.1')
                    break
                }
            }
            if(lines.length !== linesProcessed.length || linesProcessed.length === 1 && linesProcessed[0] === '') linesProcessed[linesProcessed.length] = 'nameserver 127.0.0.1'
            return linesProcessed
        })
        .then(function(newLines) {
            unwatchResolvConf()
            fs.writeFile('/etc/resolv.conf', newLines.join('\n'), { encoding: 'utf8' }, function(error) {
                watchResolvConf()
                if(callback) { callback(error) }
            })
        })
        .catch(function(e) {
            if(e) {
                console.log(e)
                return
            }
            if(callback) callback(e)
        })
}

var unsetLocalDns = function(callback) {
    var findLocalNameserver = /.*nameserver\s*127\.0\.0\.1.*/
    fs.readFileAsync('/etc/resolv.conf', { encoding: 'utf8' })
        .then(function(resolvData) {
            if(!findLocalNameserver.test(resolvData)) { return new Promise(function(resolve, reject) { reject() }) }
            return resolvData.toString().split('\n')
        })
        .then(function(lines) {
            for(var i=0; i<lines.length; i++ ) {
                if(findLocalNameserver.test(lines[i])) {
                    lines.splice(i, 1)
                    break
                }
            }
            return lines
        })
        .then(function(newLines) {
            unwatchResolvConf()
            fs.writeFile('/etc/resolv.conf', newLines.join('\n'), { encoding: 'utf8' }, function(error) {
                watchResolvConf()
                if(callback) { callback(false) }
            })
        })
        .catch(function(e) {
            if(e) {
                console.log(e)
                return
            }
            if(callback) callback(e)
        })
}

setLocalDns()

dnsServer.on('request', function(req, res) {
    if(req.question[0].name.indexOf(".dev") !== -1) {
        res.answer.push(dns.A({
            name: req.question[0].name,
            address: '127.0.0.1',
            ttl: 600
        }))
        res.send()
    }
})

dnsServer.on('error', function(err, buff, req, res) {
    console.log(err.stack)
})

dnsServer.serve(53)

proxy.on('error', function (err, req, res) {
    res.writeHead(500, {
        'Content-Type': 'text/plain'
    });

    res.end('Cannot proxy the req');
});

api.use(function(req, res) {
    console.log(req.headers)
    proxy.web(req, res, { target: 'http://127.0.0.1:5060' })
})

process.on('SIGINT', function() {
    unsetLocalDns(function(error) {
        if(error) console.log(error)
        process.exit(0)
    })
});


var apiServer = api.listen(config.api.port, config.api.ip, function() {
    var host = apiServer.address().address;
    var port = apiServer.address().port;

    console.log('Api listening at http://%s:%s', host, port);
})

var appServer = app.listen(config.app.port, config.app.ip, function () {
    var host = appServer.address().address;
    var port = appServer.address().port;

    console.log('Application listening at http://%s:%s', host, port);
})
