'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _queryIncludesHandler = require('./query/includes-handler');

var _queryIncludesHandler2 = _interopRequireDefault(_queryIncludesHandler);

var _queryStreamHandler = require('./query/stream-handler');

var _queryStreamHandler2 = _interopRequireDefault(_queryStreamHandler);

var _queryQueryHandler = require('./query/query-handler');

var _queryQueryHandler2 = _interopRequireDefault(_queryQueryHandler);

exports['default'] = (0, _queryIncludesHandler2['default'])((0, _queryStreamHandler2['default'])(_queryQueryHandler2['default']));
module.exports = exports['default'];