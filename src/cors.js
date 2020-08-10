const {GwaLog} = require('./log');

const URL = require('url').URL;

/** @constant */
const LOG_TAG = 'GwaCors';

class GwaCors {
  /**
   * @param {Object} options Cross-origin requests options
   * @param {?Array<string>} options.origins Origins array for allowed cross-origin requests
   * @param {?(RegExp|string)} options.originRegEx Origin RegEx for allowed cross-origin requests
   * @param {GwaLog} log Log instance
   */
  constructor(options, log) {
    /**
     * @type {GwaLog}
     * @private
     */
    this.log_ = log || new GwaLog();

    /**
     * @type {?Array<string>}
     * @private
     */
    this.origins_ = this.sanitizeOrigins(options.origins);

    /**
     * @type {?RegExp}
     * @private
     */
    this.originRegEx_ = this.parseOriginsRegEx(options.originRegEx);
  }

  /**
   * Validate URL format of each entry in an array of origins and return the sanitized entries
   * @param {?Array<string>} origins Origins array
   * @returns {?Array<string>}
   */
  sanitizeOrigins(origins) {
    if (!Array.isArray(origins)) {
      return null;
    }

    const sanitizedOrigins = origins
      .map((o) => typeof o === 'string' && o.trim())
      .filter(Boolean)
      .map((o) => {
        try {
          return new URL(o).origin;
        } catch (ex) {
          this.log_.error(`[${LOG_TAG}] Invalid origin ${o}\n`, ex);
        }
      })
      .filter(Boolean);

    return sanitizedOrigins.length ? sanitizedOrigins : null;
  }

  /**
   * Set the origins array for allowed cross-origin requests
   * @param {?Array<string>} origins Origins array
   */
  setOrigins(origins) {
    this.origins_ = this.sanitizeOrigins(origins);
  }

  /**
   * Construct (if necessary) the RegEx origin test
   * @param {?(RegExp|string)} originRegEx Origins RegEx
   * @returns {?RegExp}
   */
  parseOriginsRegEx(originRegEx) {
    if (typeof originRegEx === 'string') {
      try {
        return new RegExp(originRegEx, 'i');
      } catch (ex) {
        this.log_.error(`[${LOG_TAG}] Failed to origin RegEx\n`, ex);
      }
    } else if (originRegEx instanceof RegExp) {
      return originRegEx;
    }

    return null;
  }

  /**
   * Set the origins RegEx for allowed cross-origin requests
   * @param {?(RegExp|string)} originRegEx Origins RegEx
   */
  setOriginRegEx(originRegEx) {
    this.originRegEx_ = this.parseOriginsRegEx(originRegEx);
  }

  /**
   * Check whether origin is an allowed CORS origin
   * @param {string} origin Origin header value from HTTP request
   * @returns {boolean}
   */
  isCorsOrigin(origin) {
    return (
      Boolean(origin) &&
      ((this.origins_ && this.origins_.includes(origin)) ||
        (this.originRegEx_ && this.originRegEx_.test(origin)))
    );
  }

  /**
   * Get CORS headers (if appropriate) for origin
   * @param {string} origin Origin header value from HTTP request
   * @returns {Object.<string, string>}
   */
  getCorsHeaders(origin) {
    if (this.isCorsOrigin(origin)) {
      return {
        'Access-Control-Allow-Origin': origin,
      };
    }

    return {};
  }
}

module.exports = {GwaCors};
