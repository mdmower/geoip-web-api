import {DbInterface} from './db-interface/dbi';
import {GeoIpApiResponse} from './server';
import {GwaIP2Location} from './db-interface/ip2location';
import {GwaLog} from './log';
import {GwaMaxMind} from './db-interface/maxmind';
import {IP2LocationOptions} from './db-interface/ip2location';
import {MaxMindOptions} from './db-interface/maxmind';
import {isIP} from 'net';
import {GwaDbiForTesting} from './db-interface/for-testing';

const LOG_TAG = 'GwaDb';

export enum DbProvider {
  UNKNOWN,
  FORTESTING,
  MAXMIND,
  IP2LOCATION,
}

/**
 * Options for GwaDb initialization
 */
interface DbOptions {
  /**
   * Database provider
   */
  dbProvider: DbProvider;

  /**
   * MaxMind database and reader options
   */
  maxMindOptions?: MaxMindOptions;

  /**
   * IP2Location database and reader options
   */
  ip2LocationOptions?: IP2LocationOptions;
}

/**
 * Location lookup response
 */
interface LookupResponse {
  /**
   * Error (if any) encountered during IP lookup
   */
  error: string | null;

  /**
   * GeoIP API response
   */
  geoIpApiResponse: GeoIpApiResponse | null;
}

export default class GwaDb {
  private dbInterface_: DbInterface;
  private enabledOutputs_: string[];

  /**
   * @param log_ Log instance
   * @param dbOptions Database and reader options
   * @param enabledOutputs Values to be included in response
   */
  constructor(private log_: GwaLog, dbOptions: DbOptions, enabledOutputs: string[]) {
    this.dbInterface_ = this.getDbInterface(dbOptions);
    this.enabledOutputs_ = enabledOutputs;
  }

  /**
   * Identify and construct relevant DB interface
   * @param {DbOptions} gwaDbOptions Database and reader options
   */
  private getDbInterface(gwaDbOptions: DbOptions): DbInterface {
    if (gwaDbOptions.dbProvider === DbProvider.MAXMIND) {
      if (!gwaDbOptions.maxMindOptions) {
        throw new Error(`[${LOG_TAG}] MaxMind database indicated but options not available`);
      }
      return new GwaMaxMind(gwaDbOptions.maxMindOptions, this.log_);
    } else if (gwaDbOptions.dbProvider === DbProvider.IP2LOCATION) {
      if (!gwaDbOptions.ip2LocationOptions) {
        throw new Error(`[${LOG_TAG}] IP2Location database indicated but options not available`);
      }
      return new GwaIP2Location(gwaDbOptions.ip2LocationOptions, this.log_);
    } else if (gwaDbOptions.dbProvider === DbProvider.FORTESTING) {
      return new GwaDbiForTesting(this.log_);
    }

    throw new Error(`[${LOG_TAG}] Could not identify a database to load`);
  }

  /**
   * Get database result for ip
   * @param {string} ip IPv4 or IPv6 address to lookup
   */
  public async lookup(ip: string): Promise<LookupResponse> {
    const ipVersion = isIP(ip);

    const ret: LookupResponse = {
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

    const dbResult = await this.dbInterface_.get(ip);
    if (!dbResult) {
      ret.error = `Failed to search database for IP: ${ip}`;
      return ret;
    }

    ret.geoIpApiResponse = this.geoIpApiResponse(dbResult, ip, ipVersion);

    return ret;
  }

  /**
   * Build a GeoApiResponse object
   * @param dbResult Result of database search
   * @param ip Request IP
   * @param ipVersion Request IP version
   */
  public geoIpApiResponse(
    dbResult: unknown | null,
    ip: string | null,
    ipVersion: number | null
  ): GeoIpApiResponse {
    const ret: GeoIpApiResponse = {};

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

export {GwaDb, DbOptions, LookupResponse};
