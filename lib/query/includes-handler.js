'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _includesResolver = require('../includes-resolver');

var _includesResolver2 = _interopRequireDefault(_includesResolver);

var _mapRows = require('./map-rows');

var _mapRows2 = _interopRequireDefault(_mapRows);

exports['default'] = function (next) {
  return function (query) {
    var scalarResult = query.select && !_lodash2['default'].isPlainObject(query.select) && !_lodash2['default'].isArray(query.select);
    var select = _includesResolver2['default'].of(query.model).resolve(!scalarResult ? query.select || query.includes || true : { value: query.select }, !query.select);

    var result = next(_extends({}, query, { select: select }));
    if (scalarResult) {
      return (0, _mapRows2['default'])(result, function (row) {
        return row.value;
      });
    } else {
      return result;
    }
  };
};

module.exports = exports['default'];