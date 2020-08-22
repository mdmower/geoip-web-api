const express = require('express');
const {GwaCors} = require('./cors');
const {GwaLog} = require('./log');
const {GwaMaxMind} = require('./maxmind');
const {getDefaultOptions, overlayOptions} = require('./options');

/** @constant */
const LOG_TAG = 'GwaServer';

class GwaServer {
  /**
   * @param {Object.<string, any> | undefined} options User options that should overlay default options
   */
  constructor(options) {
    const appOptions = overlayOptions(options, getDefaultOptions());

    /**
     * @private
     */
    this.log_ = new GwaLog(appOptions.logLevel);
    this.log_.debug(`[${LOG_TAG}] Application options applied:\n`, appOptions);

    /**
     * @private
     */
    this.cors_ = new GwaCors(appOptions.cors || {}, this.log_);

    /**
     * @private
     */
    this.maxmind_ = new GwaMaxMind(appOptions.maxmind || {}, this.log_);

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
    res.set(this.cors_.getCorsHeaders(req.get('origin') || ''));

    res.json(geoApiResponse);
  }

  /**
   * Initialize Express server and start listeners
   * @returns {Promise<void>} Resolves when server listeners have started
   */
  async start() {
    if (this.server_) {
      this.log_.debug(`[${LOG_TAG}] Server appears to be running already`);
      return;
    }

    return new Promise((resolve) => {
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
    if (!this.server_) {
      this.log_.debug(`[${LOG_TAG}] Server does not appear to be running`);
      return;
    }

    const thisServer_ = this.server_;
    return new Promise((resolve) => {
      thisServer_.close(() => {
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
