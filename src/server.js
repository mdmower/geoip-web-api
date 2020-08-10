const express = require('express');
const {GwaCors} = require('./cors');
const {GwaLog} = require('./log');
const {GwaMaxMind} = require('./maxmind');
const {getDefaultOptions, overlayOptions} = require('./options');

/** @constant */
const LOG_TAG = 'GwaServer';

class GwaServer {
  /**
   * @param {object} options Application options that should overlay default options
   */
  constructor(options) {
    options = options ? overlayOptions(options, getDefaultOptions()) : getDefaultOptions();

    /**
     * @type {GwaLog}
     * @private
     */
    this.log_ = new GwaLog(options.logLevel);

    // Set log level now that options are available
    this.log_.debug(`[${LOG_TAG}] Application options applied:\n`, options);

    /**
     * @type {GwaCors}
     * @private
     */
    this.cors_ = new GwaCors(options.cors || {}, this.log_);

    /**
     * @type {GwaMaxMind}
     * @private
     */
    this.maxmind_ = new GwaMaxMind(options.maxmind || {}, this.log_);

    /**
     * @type {number}
     * @private
     */
    this.port_ = options.port || 3000;

    /**
     * @type {Object<string, string>}
     * @private
     */
    this.getHeaders_ = options.getHeaders || {};

    /**
     * @private
     */
    this.server_ = undefined;

    /**
     * @private
     */
    this.express_ = express();

    // Trust leftmost IP in X-Forwarded-For request header
    // https://expressjs.com/en/guide/behind-proxies.html
    this.express_.set('trust proxy', true);
  }

  /**
   * Handle Express GET event
   * @param {express.Request} req Express Request object
   * @param {express.Response} res Express Response object
   * @private
   */
  async handleGet(req, res) {
    this.log_.debug(`[${LOG_TAG}] Looking up IP: ${req.ip}`);
    let geoApiResponse;

    try {
      const ipLookup = await this.maxmind_.lookup(req.ip);
      if (!ipLookup.error) {
        geoApiResponse = ipLookup.geoApiResponse;
      } else {
        this.log_.error(`[${LOG_TAG}] Failed to lookup IP\n`, ipLookup.error);
      }
    } catch (ex) {
      this.log_.error(`[${LOG_TAG}] GET handler encountered an exception\n`, ex);
    }

    // Make sure a response body is available
    if (!geoApiResponse) {
      geoApiResponse = this.maxmind_.geoApiResponse(null, null);
    }

    // Set optional GET headers
    res.set(this.getHeaders_);

    // Set CORS headers
    res.set(this.cors_.getCorsHeaders(req.get('origin')));

    res.json(geoApiResponse);
  }

  /**
   * Initialize Express server and start listeners
   * @returns {Promise} Resolves when server listeners have started
   */
  async start() {
    if (this.server_) {
      this.log_.debug(`[${LOG_TAG}] Server appears to be running already`);
      return;
    }

    return new Promise((resolve) => {
      // Allow any path, proxy should forward only relevant requests
      this.express_.get(['/', '/*'], this.handleGet.bind(this));
      this.server_ = this.express_.listen(this.port_, () => {
        this.log_.info(`[${LOG_TAG}] Listening at http://localhost:${this.port_}`);

        resolve();
      });
    });
  }

  /**
   * Stop Express server
   * @returns {Promise} Resolves when server listeners have stopped
   */
  async stop() {
    if (!this.server_) {
      this.log_.debug(`[${LOG_TAG}] Server does not appear to be running`);
      return;
    }

    return new Promise((resolve) => {
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

module.exports = {GwaServer};
