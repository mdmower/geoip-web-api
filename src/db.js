const {GwaMaxMind} = require('./db-interface/maxmind');
const {GwaIP2Location} = require('./db-interface/ip2location');
const {GwaLog} = require('./log');
const {isIP} = require('net');

/** @constant */
const LOG_TAG = 'GwaDb';

/**
 * Options for GwaDb initialization
 * @typedef GwaDbOptions
 * @property {DbProvider} dbProvider Database provider
 * @property {import('./db-interface/maxmind').MaxMindOptions} [maxMindOptions] MaxMind database and reader options
 * @property {import('./db-interface/ip2location').IP2LocationOptions} [ip2LocationOptions] IP2Location database and reader options
 */

/** @enum {number} */
const DbProvider = {
  UNKNOWN: 0,
  MAXMIND: 1,
  IP2LOCATION: 2,
};

class GwaDb {
  /**
   * @param {GwaDbOptions} dbOptions Database and reader options
   * @param {Array<string>} enabledOutputs Values to be included in response
   * @param {GwaLog} log Log instance
   */
  constructor(dbOptions, enabledOutputs, log) {
    /**
     * @private
     */
    this.log_ = log;

    /**
     * @private
     */
    this.dbProvider_ = DbProvider.MAXMIND;

    /**
     * @private
     */
    this.dbInterface_ = this.getDbInterface(dbOptions);

    /**
     * @private
     */
    this.enabledOutputs_ = enabledOutputs;
  }

  /**
   * Identify and construct relevant DB interface
   * @param {GwaDbOptions} gwaDbOptions Database and reader options
   * @returns {GwaMaxMind|GwaIP2Location}
   * @private
   */
  getDbInterface(gwaDbOptions) {
    if (gwaDbOptions.dbProvider === DbProvider.MAXMIND) {
      return new GwaMaxMind(gwaDbOptions.maxMindOptions, this.log_);
    } else if (gwaDbOptions.dbProvider === DbProvider.IP2LOCATION) {
      return new GwaIP2Location(gwaDbOptions.ip2LocationOptions, this.log_);
    }

    throw new Error(`[${LOG_TAG}] Could not identify a database to load`);
  }

  /**
   * Get database result for ip
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

    let dbResult = await this.dbInterface_.get(ip);
    if (!dbResult) {
      ret.error = `Failed to search database for IP: ${ip}`;
      return ret;
    }

    ret.geoIpApiResponse = this.geoIpApiResponse(dbResult, ip, ipVersion);

    return ret;
  }

  /**
   * Build a GeoApiResponse object
   * @param {any} dbResult Result of database search
   * @param {?string} ip Request IP
   * @param {?number} ipVersion Request IP version
   * @returns {import('./server').GeoIpApiResponse} GeoIP API response
   */
  geoIpApiResponse(dbResult, ip, ipVersion) {
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
          const value = this.dbInterface_.getStringValue(dbResult, output);
          if (value !== null) {
            ret[output] = value;
          }
          break;
        }
        case 'data': {
          if (dbResult) {
            ret[output] = dbResult;
          }
        }
      }
    });

    return ret;
  }
}

module.exports = {GwaDb, DbProvider};
