import {GwaLog, LogLevel} from './log';

describe('Log', () => {
  let gwaLog: GwaLog;
  let debugMock: jest.SpyInstance;
  let infoMock: jest.SpyInstance;
  let warnMock: jest.SpyInstance;
  let errorMock: jest.SpyInstance;

  beforeEach(() => {
    debugMock = jest.spyOn(global.console, 'debug').mockImplementation();
    infoMock = jest.spyOn(global.console, 'log').mockImplementation();
    warnMock = jest.spyOn(global.console, 'warn').mockImplementation();
    errorMock = jest.spyOn(global.console, 'error').mockImplementation();
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
    expect(debugMock).toBeCalledWith(...consoleArgs);
    gwaLog.info(...consoleArgs);
    expect(infoMock).toBeCalledWith(...consoleArgs);
    gwaLog.warn(...consoleArgs);
    expect(warnMock).toBeCalledWith(...consoleArgs);
    gwaLog.error(...consoleArgs);
    expect(errorMock).toBeCalledWith(...consoleArgs);
    expect(debugMock).toBeCalledTimes(1);
    expect(infoMock).toBeCalledTimes(1);
    expect(warnMock).toBeCalledTimes(1);
    expect(errorMock).toBeCalledTimes(1);
  });

  it('supports changing log level', () => {
    const consoleArgs = ['message', new Error('error')];
    gwaLog.debug(...consoleArgs);
    gwaLog.error(...consoleArgs);
    gwaLog.setLevel(LogLevel.ERROR);
    gwaLog.debug(...consoleArgs);
    gwaLog.error(...consoleArgs);
    expect(debugMock).toBeCalledTimes(1);
    expect(errorMock).toBeCalledTimes(2);
  });
});
