'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

exports.escape = escape;
exports.escapeId = escapeId;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _mysql = require('mysql');

var _mysql2 = _interopRequireDefault(_mysql);

function escape(value) {
  return _mysql2['default'].escape(value);
}

function escapeId(value) {
  return _mysql2['default'].escapeId(value);
}

var Client = (function () {
  function Client(config) {
    _classCallCheck(this, Client);

    this.pool = _mysql2['default'].createPool(config);
  }

  _createClass(Client, [{
    key: 'query',
    value: function query(_query) {
      var _this = this;

      return new Promise(function (resolve, reject) {
        _this.pool.query(_query, function (err, rows) {
          if (err) {
            reject(err);
          }

          resolve(rows);
        });
      });
    }
  }]);

  return Client;
})();

exports['default'] = Client;