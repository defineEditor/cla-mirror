# CDISC Library API Mirror

This script allows to use CDISC Library API by keeping the authentication information in a central location.

**WARNING** You must follow the CDISC Library API EULA, including the following:
* You shall not (and will not allow or assist any third party to) access the API in order to replicate or compete with CDISC Library or CDISC Materials.
* You are solely responsible for the user(s) accessing the API using the account provided

* Verify that the server at which you are running the application is available only in the intranet.*


# Installation
### Prerequisites

The following software is needed to compile the application:
* Git
* Node.js
* Yarn

### Configuration
Create file **clamirror.conf** in the project root folder (see clamirror.conf.example):
```
{
    "auth": {
        "apiKey": "CDISC Library API primary key"
    },
    "port": 4600,
    "debug": false,
    "cache": {
        "enabled": false,
        "includeFilter": [],
        "excludeFilter": ["health", "mdr/lastupdated", "mdr/products", ".*/root/.*", "mdr/search/.*"],
        "cacheFolder": "/path/to/cache/folder"
    }
    "cors": {
        "enabled": false,
        "origins": ["*"]
    },
    "https": {
        "enabled": false,
        "privateKeyPath": "/path/to/key",
        "certificatePath": "/path/to/cert",
    },
    "ct": {
        "useNciSiteForCt": false,
        "nciSiteUrl": "https://evs.nci.nih.gov/ftp1/CDISC",
        "enableNciProxy": false
    }
}
```

The mirror support basic caching functionality, to use it, change ***cache.enabled*** value to true.
* debug - controls whether additional information is printed to STDOUT. Must be boolean (true/false).
* cache.enabled - controls whether cache is used.
* cache.includeFilter - array of endpoint regexes which are cached. If none specified, all endpoints are cached, except for those specified in excludeFilter.
* cache.excludeFilter - array of endpoint regexes which are not cached. It is suggested to use values from the example above.
* cache.cacheFolder - path to the folder where cached values will be stored.
* cors.enalbed - controls whether cross-origin resource sharing is used.
* cors.origins - array of origins which are allowed. Value "*" allows all origins.
* https.enabled - controls whether HTTPS should be used instead of HTTP.
* https.privateKeyPath - path to a private key, must be provided when HTTPS is ebabled.
* https.certificatePath - path to a certificated, must be provided when HTTPS is ebabled.
* ct.useNciSiteForCt - When enabled, terminology will be loaded from NCI site, rather than CDISC Library.
* ct.nciSiteUrl - Path to NCI site. Can be left blank for default site. Note that nci.nig.gov does not support CORS.
* ct.enableNciProxy - When enabled requests to /nciSite/* will be redirected to nciSiteUrl.
* rateLimit.enalbed - Controls rate limit for a request from a single IP. See [express-rate-limit](https://www.npmjs.com/package/express-rate-limit) for details.
* rateLimit.windowMs - Window length in miliseconds.
* rateLimit.max - Max number of requests from a single IP.

If apiKey property is removed, 'api-key' header property from the response will be used.

### Installation

Clone the repository:
```
git clone https://github.com/defineEditor/cla-mirror.git
```
Navigate to the downloaded folder and install all required dependencies:
```
npm install
```
Run the script:
```
npm run start
```
Now you should be able to access the API via the port specified in the configuration file, e.g.:
```
your.domain.com:4600/api/mdr/products
```

You can use packages like [pm2](https://www.npmjs.com/package/pm2), which will help to run the process as a daemon. In this case instead of using *yarn start*, you can start it as:
```
pm2 start src/app.js
```

### Additions

You can access CSV and XLS formats by adding '&format=(csv|xls|json)' at the end of the address

```
your.domain.com:4600/api/mdr/adam/adam-occds-1-0&format=csv
```
Note that only a limited number of API endpoints have CSV or XLS formats. See [CDISC Library documentation](https://wiki.cdisc.org/display/LIBSUPRT/Documentation) for details.

## Authors

* [**Dmitry Kolosov**](https://www.linkedin.com/in/dmitry-kolosov-91751413/)
* [**Sergei Krivtcov**](https://www.linkedin.com/in/sergey-krivtsov-677419b4/)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
