# CDISC Library API Relay

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
Create file **.clarelay** in your home folder:
```
{
    "auth": {
        "username": "CDISC Library API username",
        "password": "CDISC Library API password"
    },
    "port": 4600,
    "cache": {
        "enabled": false,
        "includeFilter": [],
        "excludeFilter": ["health", "mdr/products", ".*/root/.*"],
        "cacheFolder": "/path/to/cache/folder"
    }
}
```

The relay support basic caching functionality, to use it, change ***cache.enabled*** value to true.
* cache.enabled - controls whether cache is used.
* includeFilter - array of endpoint regexes which are cached. If none specified, all endpoints are cached, except for those specified in excludeFilter.
* excludeFilter - array of endpoint regexes which are not cached.
* cacheFolder - path to the folder where cached values will be stored

### Installation

Clone the repository:
```
git clone https://github.com/defineEditor/claRelay.git
```
Navigate to the downloaded folder and install all required dependencies:
```
yarn install
```
Run the script:
```
yarn start
```
Now you should be able to access the API via the port specified in the configuration file, e.g.:
```
your.domain.com:4600/api/mdr/products
```

You can use packages like [pm2](https://www.npmjs.com/package/pm2), which will help to run the process as a daemon. In this case instead of using *yarn start*, you can start it as:
```
pm2 start api.js
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
