const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { CdiscLibrary } = require('cla-wrapper');
const wrapperRequest = require('./wrapperRequest.js');

var configData = fs.readFileSync(path.join(os.homedir(), '.clarelay'), 'utf8');
var config = JSON.parse(configData);

var app = express();

// Load CLA Wrapper
const cl = new CdiscLibrary({ username: config.auth.username, password: config.auth.password });
let requestInProcess = false;

app.use('/', async (req, res) => {
    try {
        if (req.url.startsWith('/api/')) {
            let endpoint = req.url.replace(/^\/api/, '');
            let headers = {};
            if (/application\/(json|vnd\.ms-excel)|text\/csv/i.test(req.headers.accept)) {
                headers.accept = req.headers.accept;
            } else {
                // If format parameter is provided, use it to specify the response format
                if (/&format=csv/i.test(endpoint)) {
                    endpoint = endpoint.replace(/&format=csv/i, '');
                    headers = { 'Accept': 'text/csv' };
                } else if (/&format=xls/i.test(endpoint)) {
                    endpoint = endpoint.replace(/&format=xls/i, '');
                    headers = { 'Accept': 'application/vnd.ms-excel' };
                } else if (/&format=json/i.test(endpoint)) {
                    endpoint = endpoint.replace(/&format=json/i, '');
                }
            }
            let response = await cl.coreObject.apiRequest(endpoint, headers, true);

            res.send(response.body);
            // req.pipe(response).pipe(res);
        } else if (req.url.startsWith('/?')) {
            requestInProcess = true;
            let response = await wrapperRequest(req.url.replace(/^\//, ''), cl);
            requestInProcess = false;
            res.send(response.body);
        }
    } catch (error) {
        console.log(`Error when running a request for ${req.url}: ${Object.keys(error)}`);
    }
});

var port = config.port || 4600;
app.listen(port, function () {
    console.log(`CDISC Library API Relay is listening on port ${port}`);
});
