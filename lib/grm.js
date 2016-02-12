'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _model = require('./model');

var _model2 = _interopRequireDefault(_model);

var _client = require('./client');

var _client2 = _interopRequireDefault(_client);

var _clientLogger = require('./client-logger');

var _clientLogger2 = _interopRequireDefault(_clientLogger);

var _registry = require('./registry');

var _registry2 = _interopRequireDefault(_registry);

var DEFAULT_CONFIG = {
  host: 'localhost',
  logging: false
};

var Grm = (function () {
  function Grm(config) {
    _classCallCheck(this, Grm);

    this.config = _lodash2['default'].defaults(config, DEFAULT_CONFIG);
    this.registry = new _registry2['default']();
    this.client = this._createClient();
  }

  _createClass(Grm, [{
    key: 'define',
    value: function define(name, config) {
      if (this.registry.contains(name)) {
        throw new Error('Model [' + name + '] already defined');
      }
      var model = new _model2['default'](this, name, config);
      this.registry.register(name, model);
      return model;
    }
  }, {
    key: 'importFile',
    value: function importFile(filePath) {
      return require(filePath)(this);
    }
  }, {
    key: '_createClient',
    value: function _createClient() {
      var client = new _client2['default'](this.config);
      return this.config.logging ? (0, _clientLogger2['default'])(client) : client;
    }
  }]);

  return Grm;
})();

exports['default'] = Grm;
module.exports = exports['default'];