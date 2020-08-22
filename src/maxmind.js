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
   * @param {Array<string>} enabledOutputs Values to be included in response
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
    this.enabledOutputs_ = enabledOutputs;
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
    const ipVersion = isIP(ip);

    /** @type {import('./server').LookupResponse} */
    const ret = {
      error: null,
      geoIpApiResponse: this.geoIpApiResponse(null, ip, ipVersion),
    };

    if (!ipVersion) {
      ret.error = `Invalid IP: ${ip}`;
      return ret;
    }

    // User doesn't want any GeoIP features? Ok then.
    const ipOutputs = ['ip', 'ip_version'];
    const isDbNeeded =
      this.enabledOutputs_.filter((option) => !ipOutputs.includes(option)).length > 0;
    if (!isDbNeeded) {
      return ret;
    }

    if (!this.dbReader_) {
      await this.loadDbReader(this.dbPath_);
    }
    if (!this.dbReader_) {
      throw new Error('loadDbReader completed without populating dbReader');
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
    const ret = {};

    this.enabledOutputs_.forEach((output) => {
      switch (output) {
        case 'ip':
          ret[output] = ip || '';
          break;
        case 'ip_version':
          ret[output] = ipVersion || 0;
          break;
        case 'country':
        case 'subdivision': {
          const value = this.getStringValue(mmResult, output);
          if (value !== null) {
            ret[output] = value;
          }
          break;
        }
        case 'data': {
          if (mmResult) {
            ret[output] = mmResult;
          }
        }
      }
    });

    return ret;
  }

  /**
   *
   * @param {any} mmResult Result of MaxMind database search
   * @param {string} output Output value to fetch from database
   * @returns {?string} Output value
   */
  getStringValue(mmResult, output) {
    if (!mmResult) {
      return null;
    }

    if (output === 'country') {
      if (!Object.keys(mmResult).includes('country')) {
        return null;
      }
      return (
        (mmResult.country &&
          typeof mmResult.country.iso_code === 'string' &&
          mmResult.country.iso_code.trim()) ||
        ''
      );
    }

    if (output === 'subdivision') {
      if (!Object.keys(mmResult).includes('subdivisions')) {
        return null;
      }

      return (
        (Array.isArray(mmResult.subdivisions) &&
          mmResult.subdivisions[0] &&
          typeof mmResult.subdivisions[0].iso_code === 'string' &&
          mmResult.subdivisions[0].iso_code.trim()) ||
        ''
      );
    }

    return null;
  }
}

module.exports = {GwaMaxMind};
