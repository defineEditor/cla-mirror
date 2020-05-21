const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');
const compression = require('compression');
const { CdiscLibrary } = require('cla-wrapper');
const ClaCache = require('./claCache.js');
const wrapperRequest = require('./wrapperRequest.js');

var configData = fs.readFileSync(path.join(os.homedir(), '.clamirror'), 'utf8');
var config = JSON.parse(configData);

var app = express();

// Initialize a cache object
const cacheEnabled = config.cache && config.cache.enabled;
let claCache = {};
if (cacheEnabled) {
    claCache = new ClaCache({
        cacheFolder: config.cache.cacheFolder,
        excludeFilter: config.cache.excludeFilter,
        includeFilter: config.cache.includeFilter
    });
    claCache.init();
}

// Load CLA Wrapper
const cl = new CdiscLibrary({
    username: config.auth.username,
    password: config.auth.password,
    cache: cacheEnabled ? { match: (request) => (claCache.claMatch(request)), put: claCache.claPut } : undefined,
});

// Adding compression
app.use(compression({ filter: (req, res) => {
    if (typeof req.headers['accept-encoding'] === 'string') {
        if (req.headers['accept-encoding'].split(',').map(item => item.trim()).includes('gzip')) {
            return compression.filter(req, res);
        } else {
            return false;
        }
    } else {
        return false;
    }
}}));

app.use('/', async (req, res) => {
    try {
        if (req.url.startsWith('/api/')) {
            let endpoint = req.url.replace(/^\/api/, '');
            let headers = {};
            if (/application\/(json|vnd\.ms-excel)|text\/csv/i.test(req.headers.accept)) {
                headers.Accept = req.headers.accept;
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
            let response = await cl.coreObject.apiRequest(
                endpoint,
                {
                    headers,
                    returnRaw: true,
                }
            );

            if (response.headers['content-type'] === 'application/vnd.ms-excel') {
                let fileName = endpoint.replace(/.*\/(.+\/.+)/, '$1').replace(/\W/g, '.') + '.xls';
                res.setHeader('Content-Disposition', 'attachment; filename=' + fileName);
                res.setHeader('Content-Type', response.headers['content-type']);
                res.setHeader('Transfer-Encoding', response.headers['transfer-encoding']);
                res.send(Buffer.from(response.body, 'binary'));
            } else {
                res.setHeader('Content-Type', response.headers['content-type']);
                res.send(response.body);
            }
        } else if (req.url.startsWith('/?')) {
            let response = await wrapperRequest(req.url.replace(/^\//, ''), cl);
            res.send(response.body);
        }
    } catch (error) {
        console.log(`Error when running a request for ${req.url}: ${error.message}`);
    }
});

var port = config.port || 4600;
app.listen(port, function () {
    console.log(`CDISC Library API Mirror is listening on port ${port}`);
});
