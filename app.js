if (!module.parent) {
  require('./src/cmd');
} else {
  const {GwaServer} = require('./src/server');
  module.exports = GwaServer;
}
