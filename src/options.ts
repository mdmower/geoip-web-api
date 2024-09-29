import {join as pathJoin} from 'node:path';
import {CorsOptions} from './cors.js';
import {DbProvider, DbOptions} from './db.js';
import {IP2LocationOptions} from './db-interface/ip2location.js';
import {LogLevel} from './log.js';
import {MaxMindOptions} from './db-interface/maxmind.js';
import {expandTildePath, typedKeys, isRecord, isLogLevel, isPort} from './utils.js';

// const LOG_TAG = 'GwaOptions';

/** Application initialization options */
interface AppOptions {
  /** Loging level */
  logLevel?: LogLevel;

  /** Port where HTTP server should listen */
  port?: number;

  /** Individual outputs that should be included in the response */
  enabledOutputs?: EnabledOutputs;

  /** Pretty JSON output */
  prettyOutput?: boolean;

  /** Dictionary of HTTP response headers for GET requests */
  getHeaders?: Record<string, string | null | undefined>;

  /** Array of paths to match for GET requests */
  getPaths?: string[];

  /** Allowed CORS origin tests */
  cors?: CorsOptions;

  /** MaxMind database and reader options */
  maxmind?: MaxMindOptions;

  /** IP2Location database and reader options */
  ip2location?: IP2LocationOptions;
}

/** Individual outputs that should be included in the response */
interface EnabledOutputs {
  /** Enable country code output */
  country?: boolean;

  /** Enable subdivision code output */
  subdivision?: boolean;

  /** Enable IP output */
  ip?: boolean;

  /** Enable IP number output */
  ip_version?: boolean;

  /** Enable raw data output from DB lookup */
  data?: boolean;
}

/** Sanitized application initialization options */
type SanitizedOptions = Required<Omit<AppOptions, 'maxmind' | 'ip2location'>> & {
  /** Database and reader options */
  dbOptions: DbOptions;
};

/** Individual default options */
class DefaultOptions {
  /** Loging level */
  public static get logLevel(): LogLevel {
    return LogLevel.INFO;
  }

  /** Port where HTTP server should listen */
  public static readonly port = 3000;

  /** Individual outputs that should be included in the response */
  public static get enabledOutputs(): EnabledOutputs {
    return {
      country: true,
      subdivision: true,
      ip: false,
      ip_version: false,
      data: false,
    };
  }

  /** Pretty JSON output */
  public static readonly prettyOutput = false;

  // Suggested headers for AMP-GEO fallback API:
  // https://github.com/ampproject/amphtml/blob/master/spec/amp-framework-hosting.md#amp-geo-fallback-api
  /** Dictionary of HTTP response headers for GET requests */
  public static get getHeaders(): Record<string, string | null | undefined> {
    return {};
  }

  /** Array of paths to match for GET requests */
  public static get getPaths(): string[] {
    return ['/', '/*'];
  }

  /** Allowed CORS origin tests */
  public static get cors(): CorsOptions {
    return {
      origins: undefined,
      originRegEx: undefined,
    };
  }

  /** Database and reader options */
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
 * @param src Source options
 */
function overlayOptions(src: unknown): SanitizedOptions {
  const target = getDefaultAppOptions();
  if (!isRecord(src)) {
    return target;
  }

  // Log level
  if (isLogLevel(src.logLevel)) {
    target.logLevel = src.logLevel;
  }

  // Only set HTTP server port if a valid value is available
  if (isPort(src.port)) {
    target.port = src.port;
  }

  // Enabled outputs
  if (isRecord(src.enabledOutputs)) {
    for (const key of typedKeys(target.enabledOutputs)) {
      const value = src.enabledOutputs[key];
      if (typeof value === 'boolean') {
        target.enabledOutputs[key] = value;
      }
    }
  }

  // Pretty JSON output
  if (typeof src.prettyOutput === 'boolean') {
    target.prettyOutput = src.prettyOutput;
  }

  // GET headers
  if (isRecord(src.getHeaders)) {
    for (const key of Object.keys(src.getHeaders)) {
      // Only allow string header keys and string or null values which indicate that a header should
      // be removed (if possible). Retain only the last definition of a header if multiple exist
      // with distinct cases, all the while retaining the user's original casing of the header name.
      const value = src.getHeaders[key];
      if (typeof value !== 'string' && value !== null) {
        continue;
      }

      const duplicateKey = Object.keys(target.getHeaders).find(
        (targetKey) => targetKey.toLowerCase() === key.toLowerCase()
      );
      if (duplicateKey) {
        delete target.getHeaders[duplicateKey];
      }
      target.getHeaders[key] = value;
    }
  }

  // Validation of GET routes via path-to-regexp package doesn't look reliable:
  // https://github.com/pillarjs/path-to-regexp#compatibility-with-express--4x
  // Express seems to tolerate some very invalid path definitions. There's not
  // much to do here other than verify strings.
  if (Array.isArray(src.getPaths)) {
    const filteredPaths = (src.getPaths as unknown[])
      .map((p) => (typeof p === 'string' ? p.trim() : ''))
      .filter(Boolean);
    if (filteredPaths.length) {
      target.getPaths = filteredPaths;
    }
  }

  // CORS properties are undefined by default, so only modify if good values are found
  if (isRecord(src.cors)) {
    if (Array.isArray(src.cors.origins)) {
      // Filter out non-string and empty values. URL validity will be checked in Cors class.
      target.cors.origins = (src.cors.origins as unknown[])
        .map((o) => (typeof o === 'string' ? o.trim() : ''))
        .filter(Boolean);
    }

    if (typeof src.cors.originRegEx === 'string' || src.cors.originRegEx instanceof RegExp) {
      target.cors.originRegEx = src.cors.originRegEx;
    }
  }

  let dbDefined = false;

  // MaxMind properties
  if (isRecord(src.maxmind)) {
    const dbPath =
      typeof src.maxmind.dbPath === 'string'
        ? expandTildePath(src.maxmind.dbPath.trim())
        : undefined;
    if (dbPath) {
      target.dbOptions = {
        dbProvider: DbProvider.MAXMIND,
        maxMindOptions: {dbPath},
      };
      dbDefined = true;
    }
  }

  // IP2Location properties
  if (!dbDefined && isRecord(src.ip2location)) {
    const dbPath =
      typeof src.ip2location.dbPath === 'string'
        ? expandTildePath(src.ip2location.dbPath.trim())
        : undefined;
    if (dbPath) {
      // Subdivision support is optional and requires a separate CSV database
      const subdivisionCsvPath =
        typeof src.ip2location.subdivisionCsvPath === 'string'
          ? expandTildePath(src.ip2location.subdivisionCsvPath.trim())
          : undefined;
      target.dbOptions = {
        dbProvider: DbProvider.IP2LOCATION,
        ip2LocationOptions: {dbPath, subdivisionCsvPath},
      };
    }
  }

  return target;
}

export {overlayOptions, DefaultOptions, SanitizedOptions, AppOptions};
