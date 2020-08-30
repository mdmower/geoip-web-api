import {GwaServer} from './server';

export default class GeoIpWebApi {
  /**
   * @param {Object.<string, any> | undefined} options User options
   */
  constructor(options) {
    const gwaServer = new GwaServer(options);

    /**
     * Initialize GeoIp Web API and start Express server listeners
     * @returns {Promise<void>} Resolves when server listeners are ready
     */
    this.start = gwaServer.start.bind(gwaServer);

    /**
     * Stop Express server listeners
     * @returns {Promise<void>} Resolves when server listeners have stopped
     */
    this.stop = gwaServer.stop.bind(gwaServer);

    /**
     * Determine whether Express server is listening for requests
     */
    this.isRunning = gwaServer.isRunning.bind(gwaServer);
  }
}

export {GeoIpWebApi};
