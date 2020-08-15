#!/usr/bin/env node

const fs = require('fs');
const minimist = require('minimist');
const {GwaServer} = require('./src/server');
const {assertDbPath} = require('./src/maxmind');
const {getDefaultOptions, getJsonOptions} = require('./src/options');

/** @constant */
const LOG_TAG = 'GwaCmd';

// Import custom config options
let options;
const argv = minimist(process.argv.slice(2));
if (argv.config) {
  const configPath = argv.config.replace(/^['"\s]|['"\s]$/g, '');
  try {
    options = getJsonOptions(configPath);
  } catch (ex) {
    console.error(`[${LOG_TAG}] Failed to read custom config at ${configPath}`);
    process.exit(1);
  }
}

// Verify database available and exit early if not
const dbPath =
  (options && options.maxmind && options.maxmind.dbPath) || getDefaultOptions().maxmind.dbPath;
try {
  assertDbPath(dbPath);
} catch (ex) {
  console.error(`[${LOG_TAG}] Could not read database at ${dbPath}`);
  process.exit(1);
}

const gwaServer = new GwaServer(options);
gwaServer.start();
