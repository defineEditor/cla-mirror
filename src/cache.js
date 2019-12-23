const fs = require('fs');
const Jszip =  require('jszip');
const crypto = require('crypto');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const stat = promisify(fs.stat);

class ClaCache {
    constructor ({cacheFolder, cachedIds = []} = {}) {
        this.cacheFolder = cacheFolder;
        this.cachedIds = cachedIds;
    }

    async init () {
        try {
            await mkdir(this.cacheFolder);
        } catch (err) {
            if (err.code === 'EEXIST') {
                // Folder exists, which is fine
            } else {
                let msg = 'Failed creating a cache folder ' + cacheFolder + '. Error: ' + err.message;
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
    
        this.cachedIds = files.map(file => file.replace(/.gz$/,''));
    }

    async getRequestId (request) {
        let shortenedUrl = request.url
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
        ;
        let requestOptions = JSON.toString({ ...request, url: undefined });
        let hashHex = crypto.createHash('sha1').update(requestOptions).digest('hex');
        if (hashHex === '0afd4c0de6a7b1a685edd9e8d152d66d5b4b7bd0') {
            // These are standard request options, no need to add a hash code
            return shortenedUrl;
        } else {
            return shortenedUrl + hashHex;
        }
    }

    async claMatch (request) {
        // Get an id
        let id = await this.getRequestId(request);

        // Search for the response in cache
        if (this.cachedIds.includes(id)) {
            let zippedData = await readFile(path.join(this.cacheFolder,id + '.gz'));
            let zip = new Jszip();
            await zip.loadAsync(zippedData);
            if (Object.keys(zip.files).includes('response.json')) {
                let result = await zip.file('response.json').async('string');
                return { statusCode: 200, body: result };
            }
        }
    }

    async claPut (request, response) {
        // Get an id
        let id = await this.getRequestId(request);
        // Minify the response
        let data = JSON.parse(response.body);
        // Compress the data
        let zip = new Jszip();
        zip.file('response.json', JSON.stringify(data));
        let zippedData = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: {
                level: 7
            }
        });
        await writeFile(path.join(this.cacheFolder,id + '.gz'), zippedData);
    }
}

module.exports = ClaCache;