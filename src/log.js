/**
 * @enum {number}
 */
export const LogLevel = {
  OFF: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
};

export default class GwaLog {
  /**
   * @param {LogLevel | undefined} level Log level
   */
  constructor(level) {
    /**
     * @private
     */
    this.level_ =
      level !== undefined && Object.values(LogLevel).includes(level) ? level : LogLevel.INFO;
  }

  /**
   * Log debug message
   * @param {...*} args Arguments for console.debug
   */
  debug(...args) {
    if (this.level_ >= LogLevel.DEBUG) {
      console.debug(...args);
    }
  }

  /**
   * Log info message
   * @param {...*} args Arguments for console.info
   */
  info(...args) {
    if (this.level_ >= LogLevel.INFO) {
      console.log(...args);
    }
  }

  /**
   * Log warning message
   * @param {...*} args Arguments for console.warn
   */
  warn(...args) {
    if (this.level_ >= LogLevel.WARN) {
      console.warn(...args);
    }
  }

  /**
   * Log error message
   * @param {...*} args Arguments for console.error
   */
  error(...args) {
    if (this.level_ >= LogLevel.ERROR) {
      console.error(...args);
    }
  }

  /**
   * Set log level
   * @param {LogLevel} level Log level
   */
  setLevel(level) {
    if (Object.values(LogLevel).includes(level)) {
      this.level_ = level;
    }
  }
}

export {GwaLog};
