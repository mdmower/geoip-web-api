# geoip-web-api

A web API for IP-based geolocation. Both IPv4 and IPv6 are supported. Suitable for use as an [amp-geo fallback](https://github.com/ampproject/amphtml/blob/master/spec/amp-framework-hosting.md#amp-geo-fallback-api) when self-hosting the AMP framework.

## GeoIP database and reader

### Option 1: MaxMind

Setup MaxMind's [GeoIP Update](https://dev.maxmind.com/geoip/geoipupdate/) program to fetch and maintain a GeoIP database. Select a [free](https://dev.maxmind.com/geoip/geoip2/geolite2/) or [paid](https://dev.maxmind.com/geoip/geoip2/downloadable/) database in MaxMind DB file format. A sample cron job to let `geoipupdate` check for database updates each day at midnight looks like:

```
0 0 * * * geoipupdate -f /path/to/GeoIP.conf
```

This module uses [node-maxmind](https://github.com/runk/node-maxmind) for the database reader. When the database is updated on the filesystem, the reader should automatically reload without needing to restart this module.

### Option 2: IP2Location

Setup IP2Location's [Download Client](https://www.ip2location.com/free/downloader) script to fetch and maintain a GeoIP database. Select a [free](https://lite.ip2location.com/database) or [paid](https://www.ip2location.com/database) database in BIN file format.

Optionally, if you need subdivision support, also download the [ISO 3166-2 Subdivision Code](https://www.ip2location.com/free/iso3166-2) database in CSV file format.

This module uses [ip2ldb-reader](https://github.com/mdmower/ip2ldb-reader) for the database reader. When the database is updated on the filesystem, the reader should automatically reload without needing to restart this module.

## Installation

This module has been tested with Node.js 10, 12, 14, and 16. Feel free to try other versions, but additional support is not promised.

Local installation

```
npm install geoip-web-api
```

Global installation

```
npm install -g geoip-web-api
```

## Options

All properties are optional, provided the defaults are suitable.

```JavaScript
{
  // {number} Log level (0:Off, 1:Error, 2:Warn, 3:Info, 4:Debug)
  "logLevel": 3,

  // {number} Port where HTTP server should listen
  "port": 3000,

  // {Object.<string, boolean>} Enabled output values (see HTTP response section)
  "enabledOutputs": {
    "country": true,
    "subdivision": true,
    "ip": false,
    "ip_version": false,
    "data": false
  },

  // {boolean} Pretty JSON output
  "prettyOutput": false,

  // {Object.<string, string|null>} Dictionary of HTTP response headers for GET requests
  "getHeaders": {},

  // {Array<string>} Array of GET paths to which HTTP server should respond
  "getPaths": ['/', '/*'],

  // {Object} Allowed cross-origin requests (CORS)
  "cors": {
    // {Array<string>} Array of allowed CORS origins (exact match)
    "origins": null,

    // {RegEx|string} RegEx test for allowed CORS origins
    "originRegEx": null
  },

  // {Object.<string, string>} MaxMind database and reader options
  "maxmind": {
    // {string} Filesystem path to MaxMind database (in MMDB format)
    "dbPath": "./GeoLite2-Country.mmdb"
  },

  // {Object.<string, string>} IP2Location database and reader options
  "ip2location": {
    // {string} Filesystem path to IP2Location database (in BIN format)
    "dbPath": "",

    // {string} Filesystem path to IP2Location ISO 3166-2 Subdivision Code database (in CSV format)
    "subdivisionCsvPath": ""
  }
}
```

**Additional information**

- `enabledOutputs` - If an output is enabled but is not supported by the database, it will not be output in the final response.

- `getHeaders` - Headers can be removed from the response by setting their values to `null`. The `Content-Type` and `Content-Length` headers are generated automatically and cannot be removed; it is possible to change the `Content-Type` header to another valid MIME type, but it is not possible to alter `Content-Length`. The `ETag` header additionally supports special values `"strong"` and `"weak"` to specify strong or weak ETag generation, respectively (weak by default).

- `getPaths` - See Express [Route paths](https://expressjs.com/en/guide/routing.html#route-paths) documentation for allowed route patterns. Notice that the default configuration matches requests to any path.

- `cors.origins` and `cors.originRegEx` - If the incoming request has an `Origin` HTTP header that satisfies one of these tests (is in `cors.origins` array or satisfies `cors.originRegEx` RegEx test), then an `Access-Control-Allow-Origin` header will be appended to the response with value equal to the `Origin` header. Note that if `cors.originRegEx` is available as a string, the `RegExp` object will be built with `new RegExp(cors.originRegEx, 'i')`.

- `maxmind` and `ip2location` - Only one of these properties should be provided. If both have valid `dbPath` properties, then MaxMind takes precedence.

When running this module as a command line application, these options should be saved in a JSON configuration file whose path is passed to the application with argument `--config`. When using this module in your own Node.js application, these options should be passed to the `GeoIpWebApi` constructor. See Usage section below.

### Example options

```JSON
{
  "logLevel": 1,
  "port": 8080,
  "enabledOutputs": {
    "ip": true,
    "data": true
  },
  "getHeaders": {
    "cache-control": "private, max-age=3600",
    "X-Content-Type-Options": "nosniff"
  },
  "getPaths": ["/geoip/?"],
  "cors": {
    "origins": ["http://example.com", "http://example.net"],
    "originRegEx": "^https://[a-z0-9\\-]+\\.example\\.(com|net)$"
  },
  "maxmind": {
    "dbPath": "/path/to/GeoLite2-City.mmdb"
  }
}
```

## Usage

### Command line interface

If installed globally:

```bash
geoip-web-api --config="/path/to/config.json"
```

If installed locally:

```bash
npx geoip-web-api --config="/path/to/config.json"
```

### Node.js module

```JavaScript
import GeoIpWebApi from 'geoip-web-api';
// Or using require() syntax:
// const GeoIpWebApi = require('geoip-web-api').GeoIpWebApi;
const options = {...};
const geoIpWebApi = new GeoIpWebApi(options);

// Start HTTP server
await geoIpWebApi.start();

// Stop HTTP server
await geoIpWebApi.stop();

// Check whether HTTP server is running
let isRunning = geoIpWebApi.isRunning();
```

## HTTP response

The response body is `application/json` and contains the following data:

```JavaScript
{
  "country": {string},      // ISO 3166-1 alpha-2 country code
  "subdivision": {string},  // Subdivision part of ISO 3166-2 country-subdivision code
  "ip": {string},           // Request IP
  "ip_version": {number}    // Request IP version (4 or 6, or 0 if IP is not valid)
  "data": {object}          // Complete database result
}
```

The schema for `data` depends on the database used.

Response conforms to [AMP-GEO fallback API schema 0.2](https://github.com/ampproject/amphtml/blob/f744c490be41f2553b24cb9f0f0efb5136477e79/extensions/amp-geo/0.1/amp-geo.js#L286-L307)

```JSON
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "country": {
      "type": "string",
      "title": "ISO 3166-1 alpha-2 (case insensitive) country code of client request",
      "default": "",
      "pattern": "^[a-zA-Z]{2}$"
    },
    "subdivision": {
      "type": "string",
      "title": "Subdivision part of ISO 3166-2 (case insensitive) country-subdivision code of client request",
      "default": "",
      "pattern": "^[a-zA-Z0-9]{1,3}$"
    }
  },
  "required": [
    "country"
  ]
}
```

### Sample response

```JSON
{
  "country": "US",
  "subdivision": "CA"
}
```

## Reverse proxy

The HTTP server ([Express](https://expressjs.com/)) in this module is designed to run behind a reverse proxy. It has been configured to trust the leftmost IP in the `X-Forwarded-For` request header (see [documentation](https://expressjs.com/en/guide/behind-proxies.html) for `trust proxy = true`).

### Sample Nginx location block

Listen for requests to `/geoip/` and forward to localhost port `8080`:

```Nginx
location ~ ^/geoip/ {
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_pass http://127.0.0.1:8080;
    proxy_redirect off;
}
```

## License

MIT
