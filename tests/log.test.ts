import {MockInstance} from 'vitest';
import {GwaLog, LogLevel} from '../src/log.js';

describe('Log', () => {
  let gwaLog: GwaLog;
  let debugMock: MockInstance;
  let infoMock: MockInstance;
  let warnMock: MockInstance;
  let errorMock: MockInstance;

  beforeEach(() => {
    debugMock = vitest.spyOn(global.console, 'debug').mockImplementation(() => undefined);
    infoMock = vitest.spyOn(global.console, 'log').mockImplementation(() => undefined);
    warnMock = vitest.spyOn(global.console, 'warn').mockImplementation(() => undefined);
    errorMock = vitest.spyOn(global.console, 'error').mockImplementation(() => undefined);
    gwaLog = new GwaLog(LogLevel.DEBUG);
  });

  afterEach(() => {
    debugMock.mockRestore();
    infoMock.mockRestore();
    warnMock.mockRestore();
    errorMock.mockRestore();
  });

  it('logs to console', () => {
    const consoleArgs = ['message', new Error('error')];
    gwaLog.debug(...consoleArgs);
    expect(debugMock).toHaveBeenCalledWith(...consoleArgs);
    gwaLog.info(...consoleArgs);
    expect(infoMock).toHaveBeenCalledWith(...consoleArgs);
    gwaLog.warn(...consoleArgs);
    expect(warnMock).toHaveBeenCalledWith(...consoleArgs);
    gwaLog.error(...consoleArgs);
    expect(errorMock).toHaveBeenCalledWith(...consoleArgs);
    expect(debugMock).toHaveBeenCalledTimes(1);
    expect(infoMock).toHaveBeenCalledTimes(1);
    expect(warnMock).toHaveBeenCalledTimes(1);
    expect(errorMock).toHaveBeenCalledTimes(1);
  });

  it('supports changing log level', () => {
    const consoleArgs = ['message', new Error('error')];
    gwaLog.debug(...consoleArgs);
    gwaLog.error(...consoleArgs);
    gwaLog.setLevel(LogLevel.ERROR);
    gwaLog.debug(...consoleArgs);
    gwaLog.error(...consoleArgs);
    expect(debugMock).toHaveBeenCalledTimes(1);
    expect(errorMock).toHaveBeenCalledTimes(2);
  });
});
