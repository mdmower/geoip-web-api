import {CorsOptions} from './cors';
import {DbProvider, DbOptions} from './db';
import {IP2LocationOptions} from './db-interface/ip2location';
import {LogLevel} from './log';
import {MaxMindOptions} from './db-interface/maxmind';
import {expandTildePath, typedKeys, isObject} from './utils';
import {join as pathJoin} from 'path';

// const LOG_TAG = 'GwaOptions';

/**
 * Application initialization options
 */
interface AppOptions {
  /**
   * Loging level
   */
  logLevel?: LogLevel;

  /**
   * Port where HTTP server should listen
   */
  port?: number;

  /**
   * Individual outputs that should be included in the response
   */
  enabledOutputs?: EnabledOutputs;

  /**
   * Pretty JSON output
   */
  prettyOutput?: boolean;

  /**
   * Dictionary of HTTP response headers for GET requests
   */
  getHeaders?: {[header: string]: string | null | undefined};

  /**
   * Array of paths to match for GET requests
   */
  getPaths?: string[];

  /**
   * Allowed CORS origin tests
   */
  cors?: CorsOptions;

  /**
   * MaxMind database and reader options
   */
  maxmind?: MaxMindOptions;

  /**
   * IP2Location database and reader options
   */
  ip2location?: IP2LocationOptions;
}

/**
 * Sanitized application initialization options
 */
interface SanitizedOptions {
  /**
   * Loging level
   */
  logLevel: LogLevel;

  /**
   * Port where HTTP server should listen
   */
  port: number;

  /**
   * Individual outputs that should be included in the response
   */
  enabledOutputs: EnabledOutputs;

  /**
   * Pretty JSON output
   */
  prettyOutput: boolean;

  /**
   * Dictionary of HTTP response headers for GET requests
   */
  getHeaders: {[header: string]: string | null | undefined};

  /**
   * Array of paths to match for GET requests
   */
  getPaths: string[];

  /**
   * Allowed CORS origin tests
   */
  cors: CorsOptions;

  /**
   * Database and reader options
   */
  dbOptions: DbOptions;
}

/**
 * Individual outputs that should be included in the response
 */
interface EnabledOutputs {
  /**
   * Enable country code output
   */
  country?: boolean;

  /**
   * Enable subdivision code output
   */
  subdivision?: boolean;

  /**
   * Enable IP output
   */
  ip?: boolean;

  /**
   * Enable IP number output
   */
  ip_version?: boolean;

  /**
   * Enable raw data output from DB lookup
   */
  data?: boolean;
}

/**
 * Individual default options
 */
class DefaultOptions {
  public static get logLevel(): LogLevel {
    return LogLevel.INFO;
  }

  public static get port(): number {
    return 3000;
  }

  public static get enabledOutputs(): EnabledOutputs {
    return {
      country: true,
      subdivision: true,
      ip: false,
      ip_version: false,
      data: false,
    };
  }

  public static get prettyOutput(): boolean {
    return false;
  }

  // Suggested headers for AMP-GEO fallback API:
  // https://github.com/ampproject/amphtml/blob/master/spec/amp-framework-hosting.md#amp-geo-fallback-api
  public static get getHeaders(): {[header: string]: string | null | undefined} {
    return {};
  }

  public static get getPaths(): string[] {
    return ['/', '/*'];
  }

  public static get cors(): CorsOptions {
    return {
      origins: undefined,
      originRegEx: undefined,
    };
  }

  public static get dbOptions(): DbOptions {
    return {
      dbProvider: DbProvider.MAXMIND,
      maxMindOptions: {
        dbPath: pathJoin(process.cwd(), 'GeoLite2-Country.mmdb'),
      },
    };
  }
}

/**
 * Get all default options
 */
function getDefaultAppOptions(): SanitizedOptions {
  return {
    logLevel: DefaultOptions.logLevel,
    port: DefaultOptions.port,
    enabledOutputs: DefaultOptions.enabledOutputs,
    prettyOutput: DefaultOptions.prettyOutput,
    getHeaders: DefaultOptions.getHeaders,
    getPaths: DefaultOptions.getPaths,
    cors: DefaultOptions.cors,
    dbOptions: DefaultOptions.dbOptions,
  };
}

/**
 * Safely overlay values in default options object with user options object
 * @param unsafeSrc Source options
 */
function overlayOptions(unsafeSrc: any): SanitizedOptions {
  const target = getDefaultAppOptions();
  const src = isObject(unsafeSrc) ? (unsafeSrc as Record<string, any>) : undefined;
  if (!src) {
    return target;
  }

  // Log level
  const logLevel = typeof src.logLevel === 'number' ? src.logLevel : undefined;
  if (logLevel !== undefined && logLevel >= LogLevel.OFF && logLevel <= LogLevel.DEBUG) {
    target.logLevel = Math.floor(logLevel) as LogLevel;
  }

  // Only set HTTP server port if a valid value is available
  const port = typeof src.port === 'number' ? src.port : undefined;
  if (port !== undefined && port >= 0 && port <= 65535) {
    target.port = Math.floor(port);
  }

  // Enabled outputs
  const enabledOutputs = isObject(src.enabledOutputs)
    ? (src.enabledOutputs as Record<string, any>)
    : undefined;
  if (enabledOutputs) {
    typedKeys(target.enabledOutputs).forEach((output) => {
      const outputValue =
        typeof enabledOutputs[output] === 'boolean'
          ? (enabledOutputs[output] as boolean)
          : undefined;
      if (outputValue !== undefined) {
        target.enabledOutputs[output] = outputValue;
      }
    });
  }

  // Pretty JSON output
  if (typeof src.prettyOutput === 'boolean') {
    target.prettyOutput = src.prettyOutput;
  }

  // GET headers
  const getHeaders = isObject(src.getHeaders) ? (src.getHeaders as Record<string, any>) : undefined;
  if (getHeaders) {
    // Only allow string header keys and string or null values
    // which indicate that a header should be removed (if possible).
    // Retain only the last definition of a header if multiple
    // exist with distinct cases, all the while retaining the
    // user's original casing of the header name.
    Object.keys(getHeaders).forEach((key) => {
      const headerValue =
        typeof getHeaders[key] === 'string' || getHeaders[key] === null
          ? (getHeaders[key] as string | null)
          : undefined;
      if (headerValue !== undefined) {
        const duplicateKey = Object.keys(target.getHeaders).find(
          (h) => h.toLowerCase() === key.toLowerCase()
        );
        if (duplicateKey) {
          delete target.getHeaders[duplicateKey];
        }
        target.getHeaders[key] = headerValue;
      }
    });
  }

  // Validation of GET routes via path-to-regexp package doesn't look reliable:
  // https://github.com/pillarjs/path-to-regexp#compatibility-with-express--4x
  // Express seems to tolerate some very invalid path definitions. There's not
  // much to do here other than verify strings.
  const getPaths = Array.isArray(src.getPaths) ? (src.getPaths as unknown[]) : undefined;
  if (getPaths) {
    const filteredPaths = getPaths
      .map((p) => (typeof p === 'string' ? p.trim() : ''))
      .filter(Boolean);
    if (filteredPaths.length) {
      target.getPaths = filteredPaths;
    }
  }

  // CORS properties are undefined by default, so only modify if good values are found
  const cors = isObject(src.cors) ? (src.cors as Record<string, any>) : undefined;
  if (cors) {
    const origins = Array.isArray(cors.origins) ? (cors.origins as unknown[]) : undefined;
    if (origins) {
      // Filter out non-string and empty values.
      // URL validity will be checked in Cors class.
      target.cors.origins = origins
        .map((o) => (typeof o === 'string' ? o.trim() : ''))
        .filter(Boolean);
    }

    const originRegEx =
      typeof cors.originRegEx === 'string' || cors.originRegEx instanceof RegExp
        ? cors.originRegEx
        : undefined;
    if (originRegEx) {
      target.cors.originRegEx = originRegEx;
    }
  }

  let dbDefined = false;

  // MaxMind properties
  const maxmind = isObject(src.maxmind) ? (src.maxmind as Record<string, any>) : undefined;
  if (maxmind) {
    const dbPath =
      typeof maxmind.dbPath === 'string' ? expandTildePath(maxmind.dbPath.trim()) : undefined;
    if (dbPath) {
      target.dbOptions = {
        dbProvider: DbProvider.MAXMIND,
        maxMindOptions: {dbPath},
      };
      dbDefined = true;
    }
  }

  // IP2Location properties
  if (!dbDefined) {
    const ip2location = isObject(src.ip2location)
      ? (src.ip2location as Record<string, any>)
      : undefined;
    if (ip2location) {
      const dbPath =
        typeof ip2location.dbPath === 'string'
          ? expandTildePath(ip2location.dbPath.trim())
          : undefined;
      if (dbPath) {
        // Subdivision support is optional and requires a separate CSV database
        const subdivisionCsvPath =
          typeof ip2location.subdivisionCsvPath === 'string'
            ? expandTildePath(ip2location.subdivisionCsvPath.trim())
            : undefined;
        target.dbOptions = {
          dbProvider: DbProvider.IP2LOCATION,
          ip2LocationOptions: {dbPath, subdivisionCsvPath},
        };
      }
    }
  }

  return target;
}

export {overlayOptions, DefaultOptions, SanitizedOptions, AppOptions};
