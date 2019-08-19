const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('request');

var configData = fs.readFileSync(path.join(os.homedir(), '.clarelay'), 'utf8');
var config = JSON.parse(configData);

var app = express();

app.use('/', function (req, res) {
    let headers = { 'Accept': 'application/json' };
    let auth = {
        'user': config.auth.username,
        'pass': config.auth.password,
        'sendImmediately': false
    };
    let url = 'https://library.cdisc.org' + req.url;
    let r = null;
    if (req.method === 'POST') {
        r = request.post({ uri: url, auth, headers, json: req.body });
    } else {
        r = request({ url, auth, headers });
    }

    req.pipe(r).pipe(res);
});

var port = 4600;
app.listen(port, function () {
    console.log(`CDISC Library API Relay is listening on port ${port}`);
});
