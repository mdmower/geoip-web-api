import {DbProvider} from './db';
import {overlayOptions, AppOptions} from './options';
import {LogLevel} from './log';
import {typedKeys} from './utils';

describe('Parse options', () => {
  it('parses valid options', () => {
    const userOptions: AppOptions = {
      logLevel: LogLevel.OFF,
      port: 5000,
      enabledOutputs: {
        country: false,
        subdivision: false,
        ip: true,
        ip_version: true,
        data: true,
      },
      prettyOutput: true,
      getHeaders: {
        'X-Test': 'X-Result',
        server: null,
      },
      getPaths: ['/getip'],
      cors: {
        origins: ['http://example.com'],
        originRegEx: /https?:\/\/test\.example\.com/,
      },
      ip2location: {
        dbPath: '/path/to/file.bin',
        subdivisionCsvPath: '/path/to/file.csv',
      },
    };

    const parsedOptions = overlayOptions(userOptions);
    expect(parsedOptions.logLevel).toEqual(userOptions.logLevel);
    expect(parsedOptions.port).toEqual(userOptions.port);
    expect(parsedOptions.enabledOutputs).toEqual(userOptions.enabledOutputs);
    expect(parsedOptions.prettyOutput).toEqual(userOptions.prettyOutput);
    expect(parsedOptions.getHeaders).toEqual(userOptions.getHeaders);
    expect(parsedOptions.getPaths).toEqual(userOptions.getPaths);
    expect(parsedOptions.cors).toEqual(userOptions.cors);
    expect(parsedOptions.dbOptions).toEqual({
      dbProvider: DbProvider.IP2LOCATION,
      ip2LocationOptions: userOptions.ip2location,
    });
  });

  it('ignores invalid options', () => {
    const userOptions = {
      logLevel: 10,
      port: 1000000,
      enabledOutputs: 'none',
      prettyOutput: 'true',
      getHeaders: [{'X-Test': 'X-Result'}, {server: null}],
      getPaths: {path: '/geoip'},
      cors: true,
      maxmind: '/path/to/file.mmdb',
    };

    const parsedOptions = overlayOptions(userOptions);
    const defaultOptions = overlayOptions({});
    for (const key of typedKeys(parsedOptions)) {
      expect(parsedOptions[key]).toEqual(defaultOptions[key]);
    }
  });

  it('chooses one database', () => {
    const userOptions = {
      ip2location: {
        dbPath: '/path/to/file.bin',
        subdivisionCsvPath: '/path/to/file.csv',
      },
      maxmind: {
        dbPath: '/path/to/file.mmdb',
      },
    };

    expect(overlayOptions(userOptions).dbOptions).toEqual({
      dbProvider: DbProvider.MAXMIND,
      maxMindOptions: userOptions.maxmind,
    });
  });
});
