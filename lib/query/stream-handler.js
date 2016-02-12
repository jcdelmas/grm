'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _stream = require('stream');

exports['default'] = function (next) {
  return function (query) {
    if (query.stream) {
      return new QueryStream(next, query);
    } else {
      return next(query);
    }
  };
};

var QueryStream = (function (_Readable) {
  _inherits(QueryStream, _Readable);

  function QueryStream(queryHandler, baseQuery) {
    var _this = this;

    _classCallCheck(this, QueryStream);

    _get(Object.getPrototypeOf(QueryStream.prototype), 'constructor', this).call(this, { objectMode: true });
    this.minId = 0;
    this.rows = [];
    this.rowsSize = 0;
    this.index = 0;
    this.hasMoreData = true;

    this._readNextRow = function () {
      if (_this.index < _this.rowsSize) {
        var row = _this.rows[_this.index++];
        if (_this.addId) {
          delete row.id;
        }
        _this.push(row);
      } else {
        _this.push(null);
      }
    };

    this.queryHandler = queryHandler;
    this.addId = !baseQuery.select.id;

    this.baseQuery = !this.addId ? _extends({}, baseQuery, { order: 'id' }) : _extends({}, baseQuery, { order: 'id', select: _extends({}, baseQuery.select, { id: true }) });

    this.batchSize = baseQuery.batchSize || 50;
  }

  _createClass(QueryStream, [{
    key: '_read',
    value: function _read() {
      var _this2 = this;

      this._fetchRowsIfRequired().then(this._readNextRow)['catch'](function (e) {
        return _this2.emit('error', e);
      });
    }
  }, {
    key: '_fetchRowsIfRequired',
    value: function _fetchRowsIfRequired() {
      if (this.index >= this.rowsSize && this.hasMoreData) {
        return this._fetchRows();
      } else {
        return Promise.resolve();
      }
    }
  }, {
    key: '_fetchRows',
    value: function _fetchRows() {
      var _this3 = this;

      var newWhere = this.baseQuery.where ? [this.baseQuery.where, { id: { $gt: this.minId } }] : { id: { $gt: this.minId } };
      return this.queryHandler(_extends({}, this.baseQuery, {
        where: newWhere,
        limit: this.batchSize
      })).then(function (rows) {
        _this3.rows = rows;
        _this3.rowsSize = rows.length;
        _this3.index = 0;
        _this3.hasMoreData = _this3.rowsSize === _this3.batchSize;
        if (_this3.rows.length) {
          _this3.minId = _this3.rows[_this3.rowsSize - 1].id;
        }
      });
    }
  }]);

  return QueryStream;
})(_stream.Readable);

module.exports = exports['default'];