const fs = require('fs');
const Jszip = require('jszip');
const crypto = require('crypto');
const path = require('path');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);

class ClaCache {
    constructor ({ cacheFolder, cachedIds = [], excludeFilter = [], includeFilter = [] } = {}) {
        this.cacheFolder = cacheFolder;
        this.cachedIds = cachedIds;
        this.excludeFilter = excludeFilter;
        this.includeFilter = includeFilter;
        // Bind methods
        this.init = this.init.bind(this);
        this.getRequestId = this.getRequestId.bind(this);
        this.filterRequest = this.filterRequest.bind(this);
        this.claMatch = this.claMatch.bind(this);
        this.claPut = this.claPut.bind(this);
    }

    async init () {
        try {
            await mkdir(this.cacheFolder);
        } catch (err) {
            if (err.code === 'EEXIST') {
                // Folder exists, which is fine
            } else {
                return;
            }
        }

        // Get currently cached files
        let files;
        try {
            files = await readdir(this.cacheFolder);
        } catch (error) {
            return;
        }

        this.cachedIds = files.map(file => file.replace(/.gz$/, ''));
    }

    async getRequestId (request) {
        let shortenedUrl = request.url
            .replace(/^.*?api\//, '')
            .replace('/root/', '/r/')
            .replace('/cdash/', '/cd/')
            .replace('/cdashig/', '/cdi/')
            .replace('/sdtm/', '/s/')
            .replace('/sdtmig/', '/si/')
            .replace('/send/', '/se/')
            .replace('/sendig/', '/sei/')
            .replace('/adam/', '/a/')
            .replace('/root/', '/r/')
            .replace('/datasets/', '/d/')
            .replace('/domains/', '/dm/')
            .replace('/datastructures/', '/ds/')
            .replace('/classes/', '/c/')
            .replace('/variables/', '/v/')
            .replace('/fields/', '/f/')
            .replace('/varsets/', '/vs/')
            .replace('/packages/', '/p/')
            .replace('/codelists/', '/cl/')
            .replace('/terms/', '/t/')
            .replace('/scenarios/', '/s/')
            .replace(/.*?\/mdr\//, '')
            .replace(/\//g, '.')
        ;
        let requestOptions = JSON.stringify({ ...request, url: undefined });
        let hashHex = crypto.createHash('sha1').update(requestOptions).digest('hex');
        if (hashHex === '31d7e57308b4e168b3b56ede916422c25269d04c') {
            // These are standard request options, no need to add a hash code
            return shortenedUrl;
        } else {
            return shortenedUrl + hashHex;
        }
    }

    filterRequest (request) {
        if (this.includeFilter.length > 0 || this.excludeFilter.length > 0) {
            let endpoint = request.url.replace(/^.*?api\//, '');
            let excludeMatched = this.excludeFilter.some(regex => (RegExp('^' + regex + '$').test(endpoint)));
            if (excludeMatched) {
                console.log(endpoint + ' filtered');
                return true;
            }
            if (this.includeFilter.length > 0) {
                let includeMatched = this.includeFilter.some(regex => (RegExp('^' + regex + '$').test(endpoint)));
                if (!includeMatched) {
                    console.log(endpoint + ' filtered');
                    return true;
                }
            }
        }
        return false;
    }

    async claMatch (request) {
        // Do not match requests which are filtered
        if (this.filterRequest(request)) {
            return;
        }
        // Get an id
        let id = await this.getRequestId(request);

        // Search for the response in cache
        if (this.cachedIds.includes(id)) {
            let zippedData = await readFile(path.join(this.cacheFolder, id + '.gz'));
            let zip = new Jszip();
            await zip.loadAsync(zippedData);
            if (Object.keys(zip.files).includes('response.json')) {
                let result = await zip.file('response.json').async('string');
                return JSON.parse(result);
            }
        }
    }

    async claPut (request, response) {
        // Do not store requests which are filtered
        if (this.filterRequest(request)) {
            return;
        }
        // Get an id
        let id = await this.getRequestId(request);
        // Minify the response
        let data = { headers: response.headers };
        if (data.headers['content-type'].startsWith('application/json')) {
            data.body = JSON.stringify(JSON.parse(response.body));
        } else {
            data.body = response.body;
        }
        // Compress the data
        let zip = new Jszip();
        zip.file('response.json', JSON.stringify(data));
        let zippedData = await zip.generateAsync({
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: {
                level: 7
            }
        });
        await writeFile(path.join(this.cacheFolder, id + '.gz'), zippedData);
        this.cachedIds.push(id);
    }
}

module.exports = ClaCache;
