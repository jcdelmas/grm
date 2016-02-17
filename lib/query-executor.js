'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _includesHandler = require('./query/includes-handler');

var _includesHandler2 = _interopRequireDefault(_includesHandler);

var _streamHandler = require('./query/stream-handler');

var _streamHandler2 = _interopRequireDefault(_streamHandler);

var _queryHandler = require('./query/query-handler');

var _queryHandler2 = _interopRequireDefault(_queryHandler);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = (0, _includesHandler2.default)((0, _streamHandler2.default)(_queryHandler2.default));