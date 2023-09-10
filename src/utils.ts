import {constants, accessSync} from 'fs';
import {homedir} from 'os';
import {sep} from 'path';
import {LogLevel} from './log';

/**
 * Convert *nix shell ~ path to absolute path
 * @param path Filesystem path
 */
function expandTildePath(path: string): string {
  if (!path || path[0] !== '~' || sep !== '/') {
    return path;
  }

  // /home/user
  if (path.length === 1) {
    return homedir();
  }

  // /home/user/...
  if (path[1] === '/') {
    return homedir() + path.slice(1);
  }

  // You don't seriously expect applications to support
  // ~user/path, do you? Sigh...
  // /home/<user>/...
  const sepIndex = path.indexOf('/');
  const user = path.substring(1, sepIndex > 1 ? sepIndex : undefined);
  if (isPosixUsername(user)) {
    return `/home/${user}${path.slice(1 + user.length)}`;
  }

  return path;
}

/**
 * Whether user name conforms to POSIX spec
 * 3.437 User Name
 * 3.282 Portable Filename Character Set
 * https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/V1_chap03.html
 * @param user Username to check
 */
function isPosixUsername(user: string): boolean {
  return /^[\w.][\w.\-]*$/.test(user);
}

/**
 * Assert path exists and is readable
 * @param path Filesystem path to file or directory
 * @param mode FS accessibility check to perform
 */
function assertPath(path: string, mode: number = constants.F_OK): void {
  if (!path.trim()) {
    throw new Error('Path not defined');
  }
  accessSync(path, mode);
}

/**
 * Get the keys of an interface (object) with their types intact
 * @param obj Object with typed keys
 */
function typedKeys<T extends object>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

/**
 * Determine whether a variable is an object (excluding functions, arrays, and null)
 * @param obj Candidate object
 */
function isRecord(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === 'object' && !!obj && !Array.isArray(obj);
}

/**
 * Determine whether a variable is a valid LogLevel
 * @param value Candidate value
 */
function isLogLevel(value: unknown): value is LogLevel {
  return (
    typeof value === 'number' &&
    Math.floor(value) === value &&
    value >= (LogLevel.OFF as number) &&
    value <= (LogLevel.DEBUG as number)
  );
}

/**
 * Determine whether a variable is a valid port
 * @param value Candidate value
 */
function isPort(value: unknown): value is number {
  return typeof value === 'number' && Math.floor(value) === value && value >= 0 && value <= 65535;
}

export {expandTildePath, assertPath, typedKeys, isRecord, isLogLevel, isPort};
export default {expandTildePath, assertPath, typedKeys, isRecord, isLogLevel, isPort};
