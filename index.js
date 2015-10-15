var httpProxy = require('http-proxy'),
    proxy = httpProxy.createProxyServer({})

var dns = require('native-dns'),
    dnsServer = dns.createServer()

var rethinkdb = require('rethinkdb')

var express = require('express');
var app = express();

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


app.get('/', function (req, res) {
    res.send('Hello World!');
});

var webServer = app.listen(80, function () {
    var host = webServer.address().address;
    var port = webServer.address().port;

    console.log('Example app listening at http://%s:%s', host, port);
});
