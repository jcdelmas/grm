'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _through2Map = require('through2-map');

var _through2Map2 = _interopRequireDefault(_through2Map);

var _stream = require('stream');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (result, mapper) {
  if (result instanceof Promise) {
    return result.then(function (rows) {
      return rows.map(mapper);
    });
  }
  if (result instanceof _stream.Readable) {
    return result.pipe(_through2Map2.default.obj(mapper));
  }
  throw new Error('Unexpected query result type');
};