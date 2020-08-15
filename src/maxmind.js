const fs = require('fs');
const maxmind = require('maxmind');
const {GwaLog} = require('./log');

/** @constant */
const LOG_TAG = 'GwaMaxMind';

/**
 * AMP-GEO fallback API compatible response conforming to JSON schema version 0.2
 * @typedef {Object} GeoApiResponse
 * @property {?string} country ISO 3166-1 alpha-2 country code
 * @property {?string} subdivision Subdivision part of ISO 3166-2 country-subdivision code
 */

/**
 * Location lookup response
 * @typedef {Object} LookupResponse
 * @property {?string} error Error (if any) encountered during IP lookup
 * @property {?GeoApiResponse} geoApiResponse AMP-GEO fallback API compatible response
 */

class GwaMaxMind {
  /**
   * @param {Object} options MaxMind database and reader options
   * @param {string} options.dbPath Filesystem path to MaxMind database
   * @param {GwaLog} log Log instance
   */
  constructor(options, log) {
    /**
     * @type {GwaLog}
     * @private
     */
    this.log_ = log || new GwaLog();

    assertDbPath(options.dbPath);

    /**
     * @type {string}
     * @private
     */
    this.dbPath_ = options.dbPath;

    /**
     * @type {object}
     * @private
     */
    this.dbReader_ = undefined;
  }

  /**
   * Open MaxMind database and get reader
   * @param {string} dbPath Filesystem path to MaxMind database
   * @returns {object} Database reader
   * @private
   */
  async loadDbReader(dbPath) {
    if (this.dbReader_) {
      this.log_.debug(`[${LOG_TAG}] Database reader appears to be available already`);
    }

    this.log_.debug(`[${LOG_TAG}] Preparing database reader`);
    try {
      this.dbReader_ = await maxmind.open(dbPath, {
        watchForUpdates: true,
      });
    } catch (ex) {
      this.log_.error(`[${LOG_TAG}] Failed to load database: ${dbPath}`);
      throw ex;
    }
    this.log_.debug(`[${LOG_TAG}] Database reader ready`);
  }

  /**
   * Get MaxMind database result for ip
   * @param {string} ip IPv4 or IPv6 address to lookup
   * @returns {Promise<!LookupResponse>} IP lookup result
   */
  async lookup(ip) {
    /** @type {LookupResponse} */
    const ret = {
      error: null,
      geoApiResponse: this.geoApiResponse(null, null),
    };

    if (!this.dbReader_) {
      await this.loadDbReader(this.dbPath_);
    }

    if (!maxmind.validate(ip)) {
      ret.error = `Invalid IP: ${ip}`;
      return ret;
    }

    let mmResult;
    try {
      mmResult = this.dbReader_.get(ip);
    } catch (ex) {
      ret.error = `Failed to search database for IP: ${ip}`;
      return ret;
    }

    /** @type {?string} */
    const country =
      (mmResult &&
        mmResult.country &&
        typeof mmResult.country.iso_code === 'string' &&
        mmResult.country.iso_code) ||
      null;

    /** @type {?string} */
    const subdivision =
      (mmResult &&
        mmResult.subdivisions &&
        Array.isArray(mmResult.subdivisions) &&
        mmResult.subdivisions.length &&
        typeof mmResult.subdivisions[0].iso_code === 'string' &&
        mmResult.subdivisions[0].iso_code) ||
      null;

    ret.geoApiResponse = this.geoApiResponse(country, subdivision);

    return ret;
  }

  /**
   * Build a GeoApiResponse object
   * @param {?string} country ISO 3166-1 alpha-2 country code
   * @param {?string} subdivision Subdivision part of ISO 3166-2 country-subdivision code
   * @returns {GeoApiResponse} Empty GeoApiResponse response
   */
  geoApiResponse(country, subdivision) {
    return {
      country: country || '',
      subdivision: subdivision || '',
    };
  }
}

/**
 * Assert database path exists and is readable
 * @param {string} dbPath Filesystem path to MaxMind database
 * @private
 */
function assertDbPath(dbPath) {
  if (typeof dbPath !== 'string' || !dbPath) {
    throw new Error('MaxMind database path must be specified');
  }
  fs.accessSync(dbPath, fs.constants.R_OK);
}

module.exports = {assertDbPath, GwaMaxMind};
