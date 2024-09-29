#!/usr/bin/env node

import minimist from 'minimist';
import {createInterface} from 'node:readline';
import {readFileSync} from 'node:fs';
import {SanitizedOptions, overlayOptions} from './options.js';
import {GwaServer} from './server.js';
import {assertPath, expandTildePath} from './utils.js';

const LOG_TAG = 'GwaCli';

class GwaCli {
  /**
   * Run the CLI application
   */
  public async run(): Promise<void> {
    // Import custom config options
    let options: SanitizedOptions;
    const argv = minimist(process.argv.slice(2));
    if (argv.config) {
      const config = typeof argv.config === 'string' ? argv.config.trim() : undefined;
      if (!config) {
        throw new Error('Invalid custom config path');
      }

      const configPath = config.replace(/^['"\s]|['"\s]$/g, '');
      try {
        options = this.getUserOptions(expandTildePath(configPath));
      } catch {
        throw new Error(`Failed to read custom config at ${configPath}`);
      }
    } else {
      options = this.getUserOptions();
    }

    // Verify database available and exit early if not
    const {maxMindOptions, ip2LocationOptions} = options.dbOptions;
    const dbPath = maxMindOptions?.dbPath ?? ip2LocationOptions?.dbPath ?? '';
    try {
      assertPath(dbPath);
    } catch {
      throw new Error(`Could not read database at ${dbPath}`);
    }

    const gwaServer = new GwaServer(options);
    await gwaServer.start();
    console.log(`[${LOG_TAG}] Type CTRL+C to exit`);
  }

  /**
   * Import custom configuration
   * @param path Path to custom configuration file
   */
  private getUserOptions(path?: string): SanitizedOptions {
    let appOptions: unknown = {};
    if (path) {
      const customConfigText = readFileSync(path, {encoding: 'utf8'});
      appOptions = JSON.parse(customConfigText);
    }

    return overlayOptions(appOptions);
  }
}

try {
  process.on('SIGINT', () => {
    process.exit(0);
  });

  if (process.platform === 'win32') {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.on('SIGINT', () => {
      process.exit(0);
    });
  }

  new GwaCli().run().catch((err) => {
    console.error(
      `[${LOG_TAG}] ${err instanceof Error ? err.message : 'Unknown server startup failure'}`
    );
    process.exitCode = 1;
  });
} catch (ex) {
  console.error(`[${LOG_TAG}] ${ex instanceof Error ? ex.message : 'Unknown application failure'}`);
  process.exitCode = 1;
}
