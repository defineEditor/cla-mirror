const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');
const compression = require('compression');
const { CdiscLibrary } = require('cla-wrapper');
const ClaCache = require('./claCache.js');
const wrapperRequest = require('./wrapperRequest.js');
const cors = require('cors');

var configData = fs.readFileSync(path.join(__dirname, '..', 'clamirror.conf'), 'utf8');
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

// Setup CORS
const corsEnabled = config.cors && config.cors.enabled;
if (corsEnabled) {
    const origins = config.cors.origins;
    let corsOptions;
    if (Array.isArray (origins) && origins.length > 0 && !(origins.length === 1 && origins[0] === '*')) {
        corsOptions = {
            origin: function (origin, callback) {
                if (origins.indexOf(origin) !== -1) {
                    callback(null, true)
                } else {
                    callback(new Error('Not allowed by CORS'))
                }
            }
        }
    }
    app.use(cors(corsOptions));
}

// Adding compression
app.use(compression({ filter: (req, res) => {
    if (req.headers['x-no-compression']) {
        return false;
    } else if (typeof req.headers['accept-encoding'] === 'string') {
        if (req.headers['accept-encoding'].split(',').map(item => item.trim()).includes('gzip')) {
            return compression.filter(req, res);
        } else {
            return false;
        }
    } else {
        return false;
    }
}}));

// Load CLA Wrapper
const cl = new CdiscLibrary({
    username: config.auth.username,
    password: config.auth.password,
    cache: cacheEnabled ? { match: (request) => (claCache.claMatch(request)), put: claCache.claPut } : undefined,
});

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

            // If the request failed (undefined - value is taken from cache)
            if (response.statusCode !== 200 && response.statusCode !== undefined) {
                res.sendStatus(response.statusCode);
                return;
            }

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
