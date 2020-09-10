import {open} from 'maxmind';
import {GwaLog} from '../log';
import {assertPath} from '../utils';

/**
 * Options for GwaMaxMind initialization
 * @typedef MaxMindOptions
 * @property {string} dbPath Filesystem path to MaxMind database
 */

/** @constant */
const LOG_TAG = 'GwaMaxMind';

export default class GwaMaxMind {
  /**
   * @param {MaxMindOptions|undefined} options MaxMind database and reader options
   * @param {GwaLog} log Log instance
   */
  constructor(options, log) {
    if (!options) {
      throw new Error('Attempted to construct GwaMaxMind without valid options');
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
    this.dbReader_ = null;
  }

  /**
   * Open MaxMind database and get reader
   * @param {string} dbPath Filesystem path to MaxMind database
   * @returns {Promise<void>} Database reader
   * @private
   */
  async loadDbReader(dbPath) {
    if (this.dbReader_) {
      this.log_.debug(`[${LOG_TAG}] MaxMind database reader appears to be available already`);
    }

    this.log_.debug(`[${LOG_TAG}] Preparing MaxMind database reader`);
    try {
      this.dbReader_ = await open(dbPath, {
        watchForUpdates: true,
      });
    } catch (ex) {
      this.log_.error(`[${LOG_TAG}] Failed to load MaxMind database at ${dbPath}`);
      throw ex;
    }
    this.log_.debug(`[${LOG_TAG}] MaxMind database reader ready`);
  }

  /**
   * Get MaxMind database result for IP
   * @param {string} ip IPv4 or IPv6 address to lookup
   * @returns {Promise<any>} MaxMind database result
   */
  async get(ip) {
    if (!this.dbReader_) {
      await this.loadDbReader(this.dbPath_);
    }
    if (!this.dbReader_) {
      throw new Error('loadDbReader completed without populating MaxMind dbReader');
    }

    let mmResult;
    try {
      mmResult = this.dbReader_.get(ip);
      if (!mmResult) {
        throw new Error('MaxMind database search returned empty result');
      }
    } catch (ex) {
      this.log_.error(`[${LOG_TAG}] Failed to search database for IP: ${ip}`);
      return null;
    }

    return mmResult;
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

export {GwaMaxMind};
