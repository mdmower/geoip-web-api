/**
 * @enum {number}
 */
const LogLevel = {
  OFF: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
};

class GwaLog {
  /**
   * @param {LogLevel} level Log level
   */
  constructor(level) {
    /** @type {LogLevel} */
    this.level_ = Object.values(LogLevel).includes(level) ? level : LogLevel.INFO;
  }

  /**
   * Log debug message
   */
  debug() {
    if (this.level_ >= LogLevel.DEBUG) {
      console.debug.apply(console, arguments);
    }
  }

  /**
   * Log info message
   */
  info() {
    if (this.level_ >= LogLevel.INFO) {
      console.log.apply(console, arguments);
    }
  }

  /**
   * Log warning message
   */
  warn() {
    if (this.level_ >= LogLevel.WARN) {
      console.warn.apply(console, arguments);
    }
  }

  /**
   * Log error message
   */
  error() {
    if (this.level_ >= LogLevel.ERROR) {
      console.error.apply(console, arguments);
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

module.exports = {GwaLog, LogLevel};
