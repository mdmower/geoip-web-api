import {Ip2lReader} from 'ip2ldb-reader';
import {GwaLog} from '../log';
import {assertPath} from '../utils';

/**
 * Options for GwaIP2Location initialization
 * @typedef IP2LocationOptions
 * @property {string} dbPath Filesystem path to IP2Location database
 * @property {string} [subdivisionCsvPath] Filesystem path to IP2Location subdivision CSV database
 */

/** @constant */
const LOG_TAG = 'GwaIP2Location';

export default class GwaIP2Location {
  /**
   * @param {IP2LocationOptions|undefined} options IP2Location database and reader options
   * @param {GwaLog} log Log instance
   */
  constructor(options, log) {
    if (!options) {
      throw new Error('Attempted to construct IP2Location without valid options');
    }

    assertPath(options.dbPath);

    /**
     * @private
     */
    this.log_ = log;

    /**
     * @private
     */
    this.dbPath_ = options.dbPath;

    /**
     * @private
     */
    this.subdivisionCsvPath_ = options.subdivisionCsvPath;

    /**
     * @private
     */
    this.dbReader_ = null;
  }

  /**
   * Open IP2Location database and get reader
   * @param {string} dbPath Filesystem path to IP2Location database
   * @param {string} [subdivisionCsvPath] Filesystem path to IP2Location subdivision CSV database
   * @returns {Promise<void>} Database reader
   * @private
   */
  async loadDbReader(dbPath, subdivisionCsvPath) {
    if (this.dbReader_) {
      this.log_.debug(`[${LOG_TAG}] IP2Location database reader appears to be available already`);
    }

    this.log_.debug(`[${LOG_TAG}] Preparing IP2Location database reader`);
    try {
      this.dbReader_ = new Ip2lReader();
      await this.dbReader_.init(dbPath, {
        reloadOnDbUpdate: true,
        subdivisionCsvPath: subdivisionCsvPath,
      });
    } catch (ex) {
      this.log_.error(`[${LOG_TAG}] Failed to load IP2Location database at ${dbPath}`);
      throw ex;
    }
    this.log_.debug(`[${LOG_TAG}] IP2Location database reader ready`);
  }

  /**
   * Get IP2Location database result for IP
   * @param {string} ip IPv4 or IPv6 address to lookup
   * @returns {Promise<import('ip2ldb-reader').Ip2lData?>} IP2Location database result
   */
  async get(ip) {
    if (!this.dbReader_) {
      await this.loadDbReader(this.dbPath_, this.subdivisionCsvPath_);
    }
    if (!this.dbReader_) {
      throw new Error('loadDbReader completed without populating IP2Location dbReader');
    }

    let ip2lResult;
    try {
      ip2lResult = this.dbReader_.get(ip);
      if (!ip2lResult) {
        throw new Error('IP2Location database search returned empty result');
      }
    } catch (ex) {
      this.log_.error(`[${LOG_TAG}] Failed to search database for IP: ${ip}`);
      return null;
    }

    return ip2lResult;
  }

  /**
   *
   * @param {import('ip2ldb-reader').Ip2lData?} ip2lResult Result of IP2Location database search
   * @param {string} output Output value to fetch from database
   * @returns {?string} Output value
   */
  getStringValue(ip2lResult, output) {
    if (!ip2lResult) {
      return null;
    }

    if (output === 'country') {
      if (!Object.keys(ip2lResult).includes('country_short')) {
        return null;
      }
      return ip2lResult.country_short || '';
    }

    if (output === 'subdivision') {
      if (!Object.keys(ip2lResult).includes('subdivision')) {
        return null;
      }
      return ip2lResult.subdivision || '';
    }

    return null;
  }
}

export {GwaIP2Location};
