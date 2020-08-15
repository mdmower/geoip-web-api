const fs = require('fs');
const {homedir} = require('os');
const {sep} = require('path');

/**
 * Convert *nix shell ~ path to absolute path
 * @param {string} path Filesystem path
 * @returns {string}
 */
function expandTildePath(path) {
  if (typeof path !== 'string' || path[0] !== '~' || sep !== '/') {
    return path;
  }

  // /home/user
  if (path.length === 1) {
    return homedir;
  }

  // /home/user/...
  if (path[1] === '/') {
    return homedir + path.slice(1);
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
 * @param {string} user Username to check
 * @returns {boolean}
 * @private
 */
function isPosixUsername(user) {
  return /^[\w.][\w.\-]*$/.test(user);
}

/**
 * Assert path exists and is readable
 * @param {string} path Filesystem path to file or directory
 * @param {number} mode Accessibility check to perform
 */
function assertPath(path, mode = fs.constants.F_OK) {
  if (typeof path !== 'string' || !path) {
    throw new Error('Path not defined');
  }
  fs.accessSync(path, mode);
}

module.exports = {expandTildePath, assertPath};
