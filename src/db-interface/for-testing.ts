import {DbInterface} from './dbi';
import {GwaLog} from '../log';

const LOG_TAG = 'GwaDbiForTesting';

interface ForTestingData {
  country: string;
  subdivision?: string;
}

const SampleResults: {[key: string]: ForTestingData | undefined} = {
  '8.8.8.8': {country: 'us', subdivision: 'ca'},
  '2001:4860:4860::8888': {country: 'us', subdivision: 'ca'},
  '127.0.0.1': {country: '', subdivision: ''},
  '::1': {country: '', subdivision: ''},
};

class GwaDbiForTesting implements DbInterface {
  private isInitialized_: boolean;

  constructor(private log_: GwaLog) {
    this.isInitialized_ = false;
  }

  /**
   * Get database result for IP
   * @param ip IPv4 or IPv6 address to lookup
   */
  public async get(ip: string): Promise<ForTestingData> {
    // Simulate database reader initialization time
    if (!this.isInitialized_) {
      this.log_.debug(`[${LOG_TAG}] Database loading...`);
      await new Promise((resolve) => {
        setTimeout(() => {
          this.isInitialized_ = true;
          resolve(undefined);
        }, 100);
      });
      this.log_.debug(`[${LOG_TAG}] Database loaded`);
    }

    return SampleResults[ip] || {country: '', subdivision: ''};
  }

  /**
   * Get a specific string value from the result of a database search
   * @param forTestingResult Result of database search
   * @param output Output value to fetch from database
   */
  public getStringValue(forTestingResult: ForTestingData | null, output: string): string | null {
    if (!forTestingResult) {
      return null;
    }

    if (output === 'country') {
      if (!('country' in forTestingResult)) {
        return null;
      }
      return forTestingResult.country || '';
    }

    if (output === 'subdivision') {
      if (!('subdivision' in forTestingResult)) {
        return null;
      }
      return forTestingResult.subdivision || '';
    }

    return null;
  }
}

export {GwaDbiForTesting, SampleResults, ForTestingData};
