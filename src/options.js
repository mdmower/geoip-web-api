const fs = require('fs');
const path = require('path');
const {LogLevel} = require('./log');
const {expandTildePath} = require('./utils');

/** @constant */
const LOG_TAG = 'GwaOptions';

/**
 * @typedef AppOptions
 * @property {number} logLevel Log level (0:Off, 1:Error, 2:Warn, 3:Info, 4:Debug)
 * @property {number} port Port where HTTP server should listen
 * @property {Object.<string, string>} getHeaders Dictionary of HTTP response headers for GET requests
 * @property {Array<string>} getPaths Array of paths to match for GET requests
 * @property {Object} cors Allowed CORS origin tests
 * @property {?Array<string>} cors.origins Array of allowed CORS origins
 * @property {?(RegExp|string)} cors.originRegEx RegEx test for allowed CORS origins
 * @property {Object} maxmind MaxMind database and reader options
 * @property {string} maxmind.dbPath Filesystem path to MaxMind country or city database
 */

/**
 * Get default options
 * @returns {AppOptions}
 */
function getDefaultOptions() {
  // Suggested headers for AMP-GEO fallback API:
  // https://github.com/ampproject/amphtml/blob/master/spec/amp-framework-hosting.md#amp-geo-fallback-api
  return {
    logLevel: LogLevel.INFO,
    port: 3000,
    getHeaders: {
      'Cache-Control': 'private, max-age=1800',
    },
    getPaths: ['/', '/*'],
    cors: {
      origins: null,
      originRegEx: null,
    },
    maxmind: {
      dbPath: path.join(process.cwd(), 'GeoLite2-Country.mmdb'),
    },
  };
}

/**
 * Safely overlay values in target options object with src options object
 * @param {Object.<string, any> | undefined} src Source options
 * @param {AppOptions} target Target options
 * @returns {AppOptions}
 * @private
 */
function overlayOptions(src, target) {
  if (!src || typeof src !== 'object') {
    return target;
  }

  // Log level
  if (src.logLevel >= 0 && src.logLevel <= 4) {
    target.logLevel = Math.floor(src.logLevel);
  }

  // Only set HTTP server port if a valid value is available
  if (src.port > 0) {
    target.port = Math.floor(src.port);
  }

  // If getHeaders is specified, clear default headers
  if (src.getHeaders instanceof Object) {
    target.getHeaders = {};

    // Only allow string header keys/values
    Object.keys(src.getHeaders).forEach((key) => {
      if (typeof src.getHeaders[key] === 'string') {
        target.getHeaders[key] = src.getHeaders[key];
      }
    });
  }

  // Validation of GET routes via path-to-regexp package doesn't look reliable:
  // https://github.com/pillarjs/path-to-regexp#compatibility-with-express--4x
  // Express seems to tolerate some very invalid path definitions. There's not
  // much to do here other than verify strings.
  if (Array.isArray(src.getPaths)) {
    target.getPaths = src.getPaths
      .map((p) => (typeof p === 'string' ? p.trim() : ''))
      .filter(Boolean);
    // Ensure at least one path is available
    if (!target.getPaths.length) {
      target.getPaths.push('/');
    }
  }

  // CORS properties are null by default, so only modify if good values are found
  if (src.cors instanceof Object) {
    const origins = src.cors.origins;
    if (Array.isArray(origins)) {
      // Filter out non-string and empty values.
      // URL validity will be checked in Cors class.
      target.cors.origins = origins
        .map((o) => (typeof o === 'string' ? o.trim() : ''))
        .filter(Boolean);
    }

    if (
      src.cors.originRegEx &&
      (typeof src.cors.originRegEx === 'string' || src.cors.originRegEx instanceof RegExp)
    ) {
      target.cors.originRegEx = src.cors.originRegEx;
    }
  }

  // MaxMind properties
  if (src.maxmind instanceof Object) {
    if (src.maxmind.dbPath && typeof src.maxmind.dbPath === 'string') {
      target.maxmind.dbPath = expandTildePath(src.maxmind.dbPath);
    }
  }

  return target;
}

/**
 * Import custom configuration
 * @param {string} path Path to custom configuration file
 * @returns {Object.<string, any>}
 */
function getJsonOptions(path) {
  if (!path || typeof path !== 'string') {
    return {};
  }

  const customConfigText = fs.readFileSync(path, {encoding: 'utf8'});
  return JSON.parse(customConfigText);
}

module.exports = {getDefaultOptions, overlayOptions, getJsonOptions};
