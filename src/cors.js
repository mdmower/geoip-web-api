import {GwaLog} from './log';
import {URL} from 'url';

/** @constant */
const LOG_TAG = 'GwaCors';

export default class GwaCors {
  /**
   * @param {Object} options Cross-origin requests options
   * @param {?Array<string>} options.origins Origins array for allowed cross-origin requests
   * @param {?(RegExp|string)} options.originRegEx Origin RegEx for allowed cross-origin requests
   * @param {GwaLog} log Log instance
   */
  constructor(options, log) {
    /**
     * @private
     */
    this.log_ = log;

    /**
     * @private
     */
    this.origins_ = this.sanitizeOrigins(options.origins);

    /**
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
      .map((o) => o.trim())
      .filter(Boolean)
      .map((o) => {
        try {
          return new URL(o).origin;
        } catch (ex) {
          this.log_.error(`[${LOG_TAG}] Invalid origin ${o}\n`, ex);
        }
        return '';
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
      ((Array.isArray(this.origins_) && this.origins_.includes(origin)) ||
        (this.originRegEx_ != null && this.originRegEx_.test(origin)))
    );
  }

  /**
   * Get CORS headers (if appropriate) for origin
   * @param {string|undefined} origin Origin header value from HTTP request
   * @returns {?Object.<string, string>}
   */
  getCorsHeaders(origin) {
    return origin && this.isCorsOrigin(origin)
      ? {
          'Access-Control-Allow-Origin': origin,
        }
      : null;
  }
}

export {GwaCors};
