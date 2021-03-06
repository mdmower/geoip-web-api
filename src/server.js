import express from 'express';
import {GwaCors} from './cors';
import {GwaLog} from './log';
import {GwaDb} from './db';
import {overlayOptions, getDbOptions} from './options';

/**
 * GeoIP API response; conforms to AMP-GEO fallback API response JSON schema version 0.2
 * @typedef GeoIpApiResponse
 * @property {string} [country] ISO 3166-1 alpha-2 country code
 * @property {string} [subdivision] Subdivision part of ISO 3166-2 country-subdivision code
 * @property {string} [ip] Request IP
 * @property {number} [ip_version] Request IP version
 * @property {Object} [data] Complete database result
 */

/**
 * Location lookup response
 * @typedef LookupResponse
 * @property {?string} error Error (if any) encountered during IP lookup
 * @property {?GeoIpApiResponse} geoIpApiResponse GeoIP API response
 */

/** @constant */
const LOG_TAG = 'GwaServer';

export default class GwaServer {
  /**
   * @param {Object.<string, any> | undefined} options User options that should overlay default options
   */
  constructor(options) {
    const appOptions = overlayOptions(options);

    /**
     * @private
     */
    this.log_ = new GwaLog(appOptions.logLevel);
    this.log_.debug(`[${LOG_TAG}] Application options applied:\n`, appOptions);

    /**
     * @private
     */
    this.cors_ = new GwaCors(appOptions.cors, this.log_);

    /**
     * @private
     */
    this.enabledOutputs_ = Object.keys(appOptions.enabledOutputs).filter(
      (output) => appOptions.enabledOutputs[output]
    );

    /**
     * @private
     */
    this.prettyOutput_ = appOptions.prettyOutput;

    /**
     * @private
     */
    this.db_ = new GwaDb(getDbOptions(appOptions), this.enabledOutputs_, this.log_);

    /**
     * @private
     */
    this.port_ = appOptions.port || 3000;

    /**
     * @private
     */
    this.getHeaders_ = appOptions.getHeaders || {};

    /**
     * @private
     */
    this.getPaths_ = appOptions.getPaths;

    /**
     * @private
     */
    this.server_ = undefined;

    /**
     * @private
     */
    this.express_ = express();
    this.beforeListen();
  }

  /**
   * Apply custom Epxress settings and middleware before starting listeners
   * @private
   */
  beforeListen() {
    // Trust leftmost IP in X-Forwarded-For request header
    // https://expressjs.com/en/guide/behind-proxies.html
    this.express_.set('trust proxy', true);

    if (this.prettyOutput_) {
      this.express_.set('json spaces', 2);
    }

    let getHeadersKeys = Object.keys(this.getHeaders_);

    const xPoweredBy = getHeadersKeys.find((h) => /^x-powered-by$/i.test(h));
    if (xPoweredBy) {
      if (this.getHeaders_[xPoweredBy] === null) {
        this.express_.disable('x-powered-by');
        delete this.getHeaders_[xPoweredBy];
      }
    }

    const etag = getHeadersKeys.find((h) => /^etag$/i.test(h));
    if (etag) {
      const etagValue = this.getHeaders_[etag];
      if (etagValue === null) {
        this.express_.disable('etag');
      } else if (/^strong|weak$/i.test(etagValue)) {
        this.express_.set(etag, etagValue.toLowerCase());
      }
      delete this.getHeaders_[etag];
    }

    // Do not add middleware if not necessary
    if (!Object.keys(this.getHeaders_).length) {
      return;
    }

    const removeHeaders = Object.keys(this.getHeaders_).filter((h) => this.getHeaders_[h] === null);
    removeHeaders.forEach((h) => {
      delete this.getHeaders_[h];
    });

    this.express_.use((req, res, next) => {
      removeHeaders.forEach((h) => {
        res.removeHeader(h);
      });
      res.set(this.getHeaders_);
      next();
    });
  }

  /**
   * Handle Express GET event
   * @param {express.Request} req Express Request object
   * @param {express.Response} res Express Response object
   * @private
   */
  async handleGet(req, res) {
    this.log_.debug(`[${LOG_TAG}] Looking up IP: ${req.ip}`);
    let geoIpApiResponse;

    try {
      const ipLookup = await this.db_.lookup(req.ip);
      if (!ipLookup.error) {
        geoIpApiResponse = ipLookup.geoIpApiResponse;
      } else {
        this.log_.error(`[${LOG_TAG}] Failed to lookup IP\n`, ipLookup.error);
      }
    } catch (ex) {
      this.log_.error(`[${LOG_TAG}] GET handler encountered an exception\n`, ex);
    }

    // Make sure a response body is available
    if (!geoIpApiResponse) {
      geoIpApiResponse = this.db_.geoIpApiResponse(null, null, null);
    }

    // Set CORS headers
    const corsHeaders = this.cors_.getCorsHeaders(req.get('origin'));
    if (corsHeaders) {
      res.set(corsHeaders);
    }

    res.json(geoIpApiResponse);
  }

  /**
   * Initialize Express server and start listeners
   * @returns {Promise<void>} Resolves when server listeners have started
   */
  async start() {
    return new Promise((resolve) => {
      if (this.server_) {
        this.log_.debug(`[${LOG_TAG}] Server appears to be running already`);
        return resolve();
      }

      // Allow any path, proxy should forward only relevant requests
      this.express_.get(this.getPaths_, this.handleGet.bind(this));
      this.server_ = this.express_.listen(this.port_, () => {
        this.log_.info(`[${LOG_TAG}] Listening at http://localhost:${this.port_}`);

        resolve();
      });
    });
  }

  /**
   * Stop Express server
   * @returns {Promise<void>} Resolves when server listeners have stopped
   */
  async stop() {
    return new Promise((resolve) => {
      if (!this.server_) {
        this.log_.debug(`[${LOG_TAG}] Server does not appear to be running`);
        return resolve();
      }

      this.server_.close(() => {
        this.log_.info(`[${LOG_TAG}] Stopped listening at http://localhost:${this.port_}`);

        this.server_ = undefined;

        resolve();
      });
    });
  }

  /**
   * Check whether Express server is running
   * @returns {boolean}
   */
  isRunning() {
    return this.server_ !== undefined;
  }
}

export {GwaServer};
