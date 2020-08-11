# geoip-web-api

A web API for use as an [amp-geo fallback](https://github.com/ampproject/amphtml/blob/master/spec/amp-framework-hosting.md#amp-geo-fallback-api) when self-hosting the AMP framework. Also suitable for general IP-based geolocation at the [country](https://en.wikipedia.org/wiki/ISO_3166-1) level with optional [subdivision](https://en.wikipedia.org/wiki/ISO_3166-2) support. Both IPv4 and IPv6 are supported.

## GeoIP database and reader

You will need to separately setup MaxMind's [GeoIP Update](https://dev.maxmind.com/geoip/geoipupdate/) program to fetch and maintain a GeoIP database. Select a [free](https://dev.maxmind.com/geoip/geoip2/geolite2/) or [paid](https://dev.maxmind.com/geoip/geoip2/downloadable/) Country or City database in MaxMind DB file format. A sample cron job to let `geoipupdate` check for database updates each day at midnight looks like:

```
0 0 * * * geoipupdate -f /path/to/GeoIP.conf
```

This module uses [node-maxmind](https://github.com/runk/node-maxmind) for the database reader. When the database is updated on the filesystem, the reader should automatically reload without needing to restart this module.

## Installation

This module has been tested with Node.js 10, 12, and 14. Feel free to try other versions, but additional support is not promised.

```
npm install geoip-web-api
```

## Options

All properties are optional, provided the defaults are suitable.

```JavaScript
{
  // {number} Log level (0:Off, 1:Error, 2:Warn, 3:Info, 4:Debug)
  "logLevel": 3,

  // {number} Port where HTTP server should listen
  "port": 3000,

  // {Object.<string, string>} Dictionary of HTTP response headers for GET requests
  "getHeaders": {
    "cache-control": "private, max-age=1800"
  },

  // {Object} Allowed CORS origin tests
  "cors": {
    // {Array<string>} Array of allowed CORS origins
    "origins": null,

    // {RegEx|string} RegEx test for allowed CORS origins
    "originRegEx": null
  },

  // {Object} MaxMind database and reader options
  "maxmind": {
    // {string} Filesystem path to MaxMind country or city database
    "dbPath": path.join(process.cwd(), 'GeoLite2-Country.mmdb')
  }
}
```

If `cors.origins` and/or `cors.originRegEx` is available and the incoming request has an `Origin` HTTP header that satisfies one of these tests (is in `cors.origins` array or satisfies `cors.originRegEx` RegEx test), then an `Access-Control-Allow-Origin` header will be appended to the response with value equal to the `Origin` header. Note that if `cors.originRegEx` is available as a string, the `RegExp` object will be built with `new RegExp(cors.originRegEx, 'i')`.

If `getHeaders` is available, the default set is removed and only the headers in options are appended to responses. Some response headers are generated automatically, like `Content-Type` and `Content-Length`.

When running this module as a command line application, these options should be saved in a JSON configuration file whose path is passed to the application with argument `--config`. When using this module in your own Node.js application, these options should be passed to the `GwaServer` constructor. See Usage section below.

### Example options

```JSON
{
  "logLevel": 1,
  "port": 8080,
  "getHeaders": {
    "cache-control": "private, max-age=3600",
    "X-Content-Type-Options": "nosniff"
  },
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

### Command line

```bash
$ npm install -g geoip-web-api
$ geoip-web-api --config="/path/to/config.json"
```

### Node.js

```JavaScript
const GwaServer = require('geoip-web-api');
const options = {...};
const gwaServer = new GwaServer(options);

// Start HTTP server
await gwaServer.start();

// Stop HTTP server
await gwaServer.stop();

// Check whether HTTP server is running
let isRunning = gwaServer.isRunning();
```

## HTTP response

JSON response body conforms to [AMP-GEO fallback API schema 0.2](https://github.com/ampproject/amphtml/blob/f744c490be41f2553b24cb9f0f0efb5136477e79/extensions/amp-geo/0.1/amp-geo.js#L286-L307)

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

The HTTP server ([Express](https://expressjs.com/)) in this module is designed to run behind a reverse proxy. It has been configured to:

- trust the leftmost IP in the `X-Forwarded-For` request header (see [documentation](https://expressjs.com/en/guide/behind-proxies.html) for `trust proxy = true`)
- respond to requests for any path

### Sample Nginx location block

Listen for requests to `/geoip/` on port `8080`:

```Nginx
location ~ ^/geoip/ {
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_pass http://127.0.0.1:8080;
    proxy_redirect off;
}
```

## License

MIT
