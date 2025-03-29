import {GwaDb, DbProvider} from '../src/db.js';
import {SampleResults} from '../src/db-interface/for-testing.js';
import {GwaLog, LogLevel} from '../src/log.js';
import {DefaultOptions} from '../src/options.js';

describe('Database', () => {
  let gwaLog: GwaLog;
  let sampleIps: string[];

  beforeAll(() => {
    vitest.useFakeTimers();
    gwaLog = new GwaLog(LogLevel.OFF);
    sampleIps = Object.keys(SampleResults);
  });

  it('finds geo data for a known IP', async () => {
    const sampleIp = sampleIps[0];
    const enabledOutputs = Object.keys(DefaultOptions.enabledOutputs);
    const gwaDb = new GwaDb(gwaLog, {dbProvider: DbProvider.FORTESTING}, enabledOutputs);
    const lookupResultPromise = gwaDb.lookup(sampleIp);
    vitest.runOnlyPendingTimers();
    const lookupResult = await lookupResultPromise;
    expect(lookupResult).toEqual({
      error: null,
      geoIpApiResponse: {
        country: SampleResults[sampleIp]?.country,
        data: SampleResults[sampleIp],
        ip: sampleIp,
        ip_version: sampleIp.includes(':') ? 6 : 4,
        subdivision: SampleResults[sampleIp]?.subdivision,
      },
    });
  });

  it('finds no geo data for an unknown IP', async () => {
    const sampleIp = '255.255.255.255';
    const enabledOutputs = Object.keys(DefaultOptions.enabledOutputs);
    const gwaDb = new GwaDb(gwaLog, {dbProvider: DbProvider.FORTESTING}, enabledOutputs);
    const lookupResultPromise = gwaDb.lookup(sampleIp);
    vitest.runOnlyPendingTimers();
    const lookupResult = await lookupResultPromise;
    expect(lookupResult).toEqual({
      error: null,
      geoIpApiResponse: {
        country: '',
        data: {country: '', subdivision: ''},
        ip: sampleIp,
        ip_version: sampleIp.includes(':') ? 6 : 4,
        subdivision: '',
      },
    });
  });

  it('respects enabled outputs', async () => {
    const sampleIp = sampleIps[0];
    let enabledOutputs = ['country', 'subdivision'];
    let gwaDb = new GwaDb(gwaLog, {dbProvider: DbProvider.FORTESTING}, enabledOutputs);
    let lookupResultPromise = gwaDb.lookup(sampleIp);
    vitest.runOnlyPendingTimers();
    let lookupResult = await lookupResultPromise;
    expect(lookupResult).toEqual({
      error: null,
      geoIpApiResponse: {
        country: SampleResults[sampleIp]?.country,
        subdivision: SampleResults[sampleIp]?.subdivision,
      },
    });
    enabledOutputs = ['data', 'ip', 'ip_version'];
    gwaDb = new GwaDb(gwaLog, {dbProvider: DbProvider.FORTESTING}, enabledOutputs);
    lookupResultPromise = gwaDb.lookup(sampleIp);
    vitest.runOnlyPendingTimers();
    lookupResult = await lookupResultPromise;
    expect(lookupResult).toEqual({
      error: null,
      geoIpApiResponse: {
        data: SampleResults[sampleIp],
        ip: sampleIp,
        ip_version: sampleIp.includes(':') ? 6 : 4,
      },
    });
  });
});
