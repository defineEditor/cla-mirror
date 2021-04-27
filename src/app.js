const express = require('express');
const fs = require('fs');
const os = require('os');
const http = require('http');
const https = require('https');
const path = require('path');
const compression = require('compression');
const { CdiscLibrary } = require('cla-wrapper');
const ClaCache = require('./claCache.js');
const wrapperRequest = require('./wrapperRequest.js');
const cors = require('cors');
const rateLimit = require("express-rate-limit");

var configData = fs.readFileSync(path.join(__dirname, '..', 'clamirror.conf'), 'utf8');
var config = JSON.parse(configData);

if (config.ct === undefined) {
    config.ct = {
        useNciSiteForCt: false,
        enableNciProxy: false,
    };
}

var app = express();

var debug = config.debug || false;

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

// Rate limit
const rateLimitEnabled = config.rateLimit && config.rateLimit.enabled;
if (rateLimitEnabled) {
    let rateLimitConfig = config.rateLimit;
    delete rateLimitConfig.enabled;
    rateLimitConfig = { message: 'You have reached the number of allowed requests. Please wait.', ...rateLimitConfig };
    const apiLimiter = rateLimit(rateLimitConfig);
    app.use(apiLimiter);
}

// Setup CORS
const corsEnabled = config.cors && config.cors.enabled;
if (corsEnabled) {
    const origins = config.cors.origins;
    let corsOptions;
    if (!(Array.isArray (origins) && origins.length === 1 && origins[0] === '*')) {
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
    apiKey: config.auth.apiKey,
    useNciSiteForCt: config.ct.useNciSiteForCt,
    nciSiteUrl: config.ct.nciSiteUrl,
    cache: cacheEnabled ? { match: (request) => (claCache.claMatch(request)), put: claCache.claPut } : undefined,
});

app.use('/', async (req, res) => {
    try {
        if (debug) {
            console.log('URL:' + req.url);
        }
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
            // If config.apiKey is blank, then use the apiKey from the request
            if (!config.auth.apiKey && req.headers['api-key']) {
                headers['api-key'] = req.headers['api-key'];
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
                if (debug) {
                    console.log('Request failed: ' + response.statusCode);
                }
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
        } else if (req.url.startsWith('/nciSite/') && config.ct.enableNciProxy) {
            let acceptType = 'text/html';
            if (req.url.endsWith('.xml')) {
                acceptType = 'text/xml';
            }
            let response = await cl.coreObject.apiRequest(
                req.url,
                {
                    headers: { Accept: acceptType},
                    returnRaw: true,
                }
            );
            res.send(response.body);
        }
    } catch (error) {
        console.log(`Error when running a request for ${req.url}: ${error.message}`);
    }
});

var port = config.port || 4600;

if (config.https !== undefined && config.https.enabled === true) {
    var key = fs.readFileSync(config.https.privateKeyPath, 'utf8');
    var cert = fs.readFileSync(config.https.certificatePath, 'utf8');
    var httpsServer = https.createServer({key, cert}, app);
    httpsServer.listen(port, () => {
        console.log(`CDISC Library API Mirror is listening on port ${port} using HTTPS protocol`);
    } );
} else {
    app.listen(port, () => {
        console.log(`CDISC Library API Mirror is listening on port ${port} using HTTP protocol`);
    });
}

