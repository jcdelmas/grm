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

var _registry = require('./registry');

var _registry2 = _interopRequireDefault(_registry);

var _queryHandler = require('./query-handler');

var _queryHandler2 = _interopRequireDefault(_queryHandler);

var _includesResolver = require('./includes-resolver');

var _includesResolver2 = _interopRequireDefault(_includesResolver);

var DEFAULT_CONFIG = {
  host: 'localhost',
  logging: false
};

var Grm = (function () {
  function Grm(config) {
    _classCallCheck(this, Grm);

    this.config = _lodash2['default'].defaults(config, DEFAULT_CONFIG);
    this.registry = new _registry2['default']();
    this.client = new _client2['default'](config);
    this.query = (0, _queryHandler2['default'])(this);
    this.includesResolver = new _includesResolver2['default'](this);
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
  }]);

  return Grm;
})();

exports['default'] = Grm;
module.exports = exports['default'];