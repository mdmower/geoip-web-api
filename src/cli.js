#!/usr/bin/env node

const minimist = require('minimist');
const readline = require('readline');
const {GwaServer} = require('./server');
const {assertPath, expandTildePath} = require('./utils');
const {getDefaultOptions, getJsonOptions} = require('./options');

/** @constant */
const LOG_TAG = 'GwaCli';

// Import custom config options
let options;
const argv = minimist(process.argv.slice(2));
if (argv.config) {
  const configPath = argv.config.replace(/^['"\s]|['"\s]$/g, '');
  try {
    options = getJsonOptions(expandTildePath(configPath));
  } catch (ex) {
    console.error(`[${LOG_TAG}] Failed to read custom config at ${configPath}`);
    process.exit(1);
  }
}

// Verify database available and exit early if not
const dbPath =
  (options &&
    ((options.maxmind && options.maxmind.dbPath && expandTildePath(options.maxmind.dbPath)) ||
      (options.ip2location &&
        options.ip2location.dbPath &&
        expandTildePath(options.ip2location.dbPath)))) ||
  getDefaultOptions().maxmind.dbPath;
try {
  assertPath(dbPath);
} catch (ex) {
  console.error(`[${LOG_TAG}] Could not read database at ${dbPath}`);
  process.exit(1);
}

process.on('SIGINT', () => {
  process.exit(0);
});

if (process.platform === 'win32') {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.on('SIGINT', function () {
    process.exit(0);
  });
}

const gwaServer = new GwaServer(options);
gwaServer.start().then(() => {
  console.log(`[${LOG_TAG}] Type CTRL+C to exit`);
});
