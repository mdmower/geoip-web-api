import {GwaLog} from './log';
import {URL} from 'url';

const LOG_TAG = 'GwaCors';

/**
 * Options for GwaCors initialization
 */
interface CorsOptions {
  /**
   * Array of allowed CORS origins
   */
  origins?: string[];

  /**
   * RegEx test for allowed CORS origins
   */
  originRegEx?: RegExp | string;
}

export default class GwaCors {
  private origins_?: string[];
  private originRegEx_?: RegExp;

  /**
   * @param log_ Log instance
   * @param options Cross-origin requests options
   */
  constructor(private log_: GwaLog, options: CorsOptions) {
    this.origins_ = this.sanitizeOrigins(options.origins);
    this.originRegEx_ = this.parseOriginsRegEx(options.originRegEx);
  }

  /**
   * Validate URL format of each entry in an array of origins and return the sanitized entries
   * @param origins Origins array
   */
  private sanitizeOrigins(origins?: string[]): string[] | undefined {
    if (!Array.isArray(origins)) {
      return;
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

    return sanitizedOrigins.length ? sanitizedOrigins : undefined;
  }

  /**
   * Set the origins array for allowed cross-origin requests
   * @param origins Origins array
   */
  private setOrigins(origins?: string[]): void {
    this.origins_ = this.sanitizeOrigins(origins);
  }

  /**
   * Construct (if necessary) the RegEx origin test
   * @param originRegEx Origins RegEx
   */
  private parseOriginsRegEx(originRegEx?: RegExp | string): RegExp | undefined {
    if (typeof originRegEx === 'string') {
      try {
        return new RegExp(originRegEx, 'i');
      } catch (ex) {
        this.log_.error(`[${LOG_TAG}] Failed to construct origin RegEx\n`, ex);
      }
    } else if (originRegEx instanceof RegExp) {
      return originRegEx;
    }
  }

  /**
   * Set the origins RegEx for allowed cross-origin requests
   * @param originRegEx Origins RegEx
   */
  private setOriginRegEx(originRegEx?: RegExp | string): void {
    this.originRegEx_ = this.parseOriginsRegEx(originRegEx);
  }

  /**
   * Check whether origin is an allowed CORS origin
   * @param origin Origin header value from HTTP request
   */
  private isCorsOrigin(origin: string): boolean {
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
  public getCorsHeaders(origin?: string): {[header: string]: string} | null {
    return origin && this.isCorsOrigin(origin)
      ? {
          'Access-Control-Allow-Origin': origin,
        }
      : null;
  }
}

export {GwaCors, CorsOptions};
