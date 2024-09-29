enum LogLevel {
  OFF,
  ERROR,
  WARN,
  INFO,
  DEBUG,
}

class GwaLog {
  private level_: LogLevel;

  /**
   * @param level Log level
   */
  constructor(level?: LogLevel) {
    this.level_ = level ?? LogLevel.INFO;
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  /* eslint-disable prefer-spread */

  /**
   * Log debug message
   * @param args Arguments for console.debug
   */
  public debug(...args: any[]): void {
    if (this.level_ >= LogLevel.DEBUG) {
      console.debug.apply(console, args);
    }
  }

  /**
   * Log info message
   * @param args Arguments for console.info
   */
  public info(...args: any[]): void {
    if (this.level_ >= LogLevel.INFO) {
      console.log.apply(console, args);
    }
  }

  /**
   * Log warning message
   * @param args Arguments for console.warn
   */
  public warn(...args: any[]): void {
    if (this.level_ >= LogLevel.WARN) {
      console.warn.apply(console, args);
    }
  }

  /**
   * Log error message
   * @param args Arguments for console.error
   */
  public error(...args: any[]): void {
    if (this.level_ >= LogLevel.ERROR) {
      console.error.apply(console, args);
    }
  }

  /* eslint-enable @typescript-eslint/no-explicit-any */
  /* eslint-enable prefer-spread */

  /**
   * Set log level
   * @param level Log level
   */
  public setLevel(level: LogLevel): void {
    this.level_ = level;
  }
}

export {GwaLog, LogLevel};
