const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('request');

var configData = fs.readFileSync(path.join(os.homedir(), '.clarelay'), 'utf8');
var config = JSON.parse(configData);

var app = express();

app.use('/', function (req, res) {
    let url = 'https://library.cdisc.org' + req.url;
    let headers = {};
    if (/application\/(json|vnd\.ms-excel)|text\/csv/i.test(req.headers.accept)) {
        headers = req.headers;
    } else {
        // If format parameter is provided, use it to specify the response format
        if (/&format=csv/i.test(url)) {
            url = url.replace(/&format=csv/i, '');
            headers = { 'Accept': 'text/csv' };
        } else if (/&format=xls/i.test(url)) {
            url = url.replace(/&format=xls/i, '');
            headers = { 'Accept': 'application/vnd.ms-excel' };
        } else if (/&format=json/i.test(url)) {
            url = url.replace(/&format=json/i, '');
            headers = { 'Accept': 'application/json' };
        } else {
            headers = { 'Accept': 'application/json' };
        }
    }
    let auth = {
        'user': config.auth.username,
        'pass': config.auth.password,
        'sendImmediately': false
    };
    let r = null;
    if (req.method === 'POST') {
        r = request.post({ uri: url, auth, headers, json: req.body });
    } else {
        r = request({ url, auth, headers });
    }

    req.pipe(r).pipe(res);
});

var port = config.port || 4600;
app.listen(port, function () {
    console.log(`CDISC Library API Relay is listening on port ${port}`);
});
