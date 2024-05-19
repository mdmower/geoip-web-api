import {AppOptions, overlayOptions} from './options.js';
import {GwaServer} from './server.js';

export default class GeoIpWebApi {
  private _gwaServer: GwaServer;

  /**
   * @param options User options
   */
  constructor(options?: AppOptions) {
    const appOptions = overlayOptions(options);
    this._gwaServer = new GwaServer(appOptions);
  }

  /**
   * Initialize GeoIp Web API and start Express server listeners
   */
  public start(): Promise<void> {
    return this._gwaServer.start();
  }

  /**
   * Stop Express server listeners
   */
  public stop(): Promise<void> {
    return this._gwaServer.stop();
  }

  /**
   * Determine whether Express server is listening for requests
   */
  public isRunning(): boolean {
    return this._gwaServer.isRunning();
  }
}

export {GeoIpWebApi, AppOptions};
