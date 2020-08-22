const maxmind = require('maxmind');
const {GwaLog} = require('./log');
const {assertPath} = require('./utils');
const {isIP} = require('net');

/** @constant */
const LOG_TAG = 'GwaMaxMind';

class GwaMaxMind {
  /**
   * @param {Object} options MaxMind database and reader options
   * @param {string} options.dbPath Filesystem path to MaxMind database
   * @param {Object.<string, boolean>} enabledOutputs Values to be included in response
   * @param {GwaLog} log Log instance
   */
  constructor(options, enabledOutputs, log) {
    /**
     * @private
     */
    this.log_ = log;

    assertPath(options.dbPath);

    /**
     * @private
     */
    this.dbPath_ = options.dbPath;

    /**
     * @private
     */
    this.dbReader_ = null;

    /**
     * @private
     */
    this.enabledOutputs_ = Object.keys(enabledOutputs).filter((key) => enabledOutputs[key]);
  }

  /**
   * Open MaxMind database and get reader
   * @param {string} dbPath Filesystem path to MaxMind database
   * @returns {Promise<void>} Database reader
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
   * @returns {Promise<!import('./server').LookupResponse>} IP lookup result
   */
  async lookup(ip) {
    /** @type {import('./server').LookupResponse} */
    const ret = {
      error: null,
      geoIpApiResponse: this.geoIpApiResponse(null, null, null),
    };

    if (!this.dbReader_) {
      await this.loadDbReader(this.dbPath_);
    }
    if (!this.dbReader_) {
      throw new Error('loadDbReader completed without populating dbReader');
    }

    const ipVersion = isIP(ip);
    if (!ipVersion) {
      ret.error = `Invalid IP: ${ip}`;
      return ret;
    }

    let mmResult;
    try {
      mmResult = this.dbReader_.get(ip);
      if (!mmResult) {
        throw new Error('Database search returned empty result');
      }
    } catch (ex) {
      ret.error = `Failed to search database for IP: ${ip}`;
      return ret;
    }

    // Country is required
    if (!Object.keys(mmResult).includes('country')) {
      ret.error = `Unrecognized database result`;
      return ret;
    }

    ret.geoIpApiResponse = this.geoIpApiResponse(mmResult, ip, ipVersion);

    return ret;
  }

  /**
   * Build a GeoApiResponse object
   * @param {any} mmResult Result of MaxMind database search
   * @param {?string} ip Request IP
   * @param {?number} ipVersion Request IP version
   * @returns {import('./server').GeoIpApiResponse} GeoIP API response
   */
  geoIpApiResponse(mmResult, ip, ipVersion) {
    /** @type {import('./server').GeoIpApiResponse} */
    const ret = {
      country: '',
    };

    this.enabledOutputs_.forEach((key) => {
      if (key === 'ip') {
        ret['ip'] = ip || '';
        ret['ip_version'] = ipVersion || 0;
      } else if (key === 'country') {
        ret[key] = this.getCountry(mmResult);
      } else if (key === 'subdivision') {
        const subdivision = this.getSubdivision(mmResult);
        if (subdivision !== null) {
          ret[key] = subdivision;
        }
      }
    });

    return ret;
  }

  /**
   * Get country from MaxMind result
   * @param {any} mmResult Result of MaxMind database search
   * @returns {string} ISO 3166-1 alpha-2 country code
   */
  getCountry(mmResult) {
    return mmResult && mmResult.country && typeof mmResult.country.iso_code === 'string'
      ? mmResult.country.iso_code.trim()
      : '';
  }

  /**
   * Get subdivision from MaxMind result
   * @param {any} mmResult Result of MaxMind database search
   * @returns {?string} Subdivision part of ISO 3166-2 country-subdivision code or null if database
   * does not support subdivision lookup
   */
  getSubdivision(mmResult) {
    // If database does not include subdivision support (e.g. Country database),
    // then subdivisions property is not included in mmResult
    if (!mmResult || !Object.keys(mmResult).includes('subdivisions')) {
      return null;
    }

    return Array.isArray(mmResult.subdivisions) &&
      mmResult.subdivisions[0] &&
      typeof mmResult.subdivisions[0].iso_code === 'string'
      ? mmResult.subdivisions[0].iso_code.trim()
      : '';
  }
}

module.exports = {GwaMaxMind};
