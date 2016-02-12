'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var IncludesResolver = (function () {
  _createClass(IncludesResolver, null, [{
    key: 'of',

    /**
     * @param {Model} model
     */
    value: function of(model) {
      return new IncludesResolver(model);
    }

    /**
     * @param {Model} model
     */
  }]);

  function IncludesResolver(model) {
    _classCallCheck(this, IncludesResolver);

    this.grm = model.orm;
    this.model = model;
  }

  /**
   * @param {array|object|boolean} userIncludes
   * @param {boolean} includeDefaults
   */

  _createClass(IncludesResolver, [{
    key: 'resolve',
    value: function resolve(userIncludes) {
      var _this = this;

      var includeDefaults = arguments.length <= 1 || arguments[1] === undefined ? true : arguments[1];

      if (_lodash2['default'].isPlainObject(userIncludes)) {
        var relationsIncludes = (0, _lodash2['default'])(userIncludes).pick(function (cfg, fieldName) {
          return (cfg === true || _lodash2['default'].isPlainObject(cfg)) && _this.model.relations[fieldName];
        }).mapValues(function (cfg, fieldName) {
          var relationModel = _this.grm.registry.get(_this.model.relations[fieldName].model);
          return IncludesResolver.of(relationModel).resolve(cfg, includeDefaults);
        }).value();
        var newIncludes = _extends({}, _lodash2['default'].omit(userIncludes, '$defaults'), relationsIncludes);
        if (!userIncludes.hasOwnProperty('$defaults') && includeDefaults || userIncludes.$defaults) {
          return this._mergeIncludes(this.model.defaultIncludes, newIncludes);
        } else {
          return newIncludes;
        }
      } else if (userIncludes === true) {
        return this.model.defaultIncludes;
      } else if (_lodash2['default'].isArray(userIncludes)) {
        var objectUserIncludes = userIncludes.reduce(function (acc, field) {
          var fieldObject = field.split('.').reduceRight(function (acc2, token) {
            return _defineProperty({}, token, acc2);
          }, true);
          return _lodash2['default'].merge(acc, fieldObject);
        }, {});
        return this.resolve(objectUserIncludes, includeDefaults);
      } else {
        return {};
      }
    }
  }, {
    key: 'mergeDependencies',
    value: function mergeDependencies(includes) {
      return this._addMissingIds(this._mergeVirtualFieldsDependencies(includes));
    }

    /**
     * @param {Model} model
     * @param {object} includes
     * @return {object}
     */
  }, {
    key: '_mergeVirtualFieldsDependencies',
    value: function _mergeVirtualFieldsDependencies(includes) {
      var _this2 = this;

      return (0, _lodash2['default'])(this.model.virtualFields).filter(function (cfg, field) {
        return includes[field];
      }).map('dependsOn').reduce(function (target, source) {
        return _this2._mergeIncludes(target, _this2._fullResolve(source));
      }, includes);
    }
  }, {
    key: '_addMissingIds',
    value: function _addMissingIds(includes) {
      return _extends({}, includes, {
        id: true
      }, (0, _lodash2['default'])(this.model.relations).pick(function (cfg, field) {
        return includes[field];
      }).mapValues(function (cfg, field) {
        return IncludesResolver.of(cfg.model)._addMissingIds(includes[field]);
      }).value());
    }
  }, {
    key: '_fullResolve',
    value: function _fullResolve(includes) {
      return this._mergeVirtualFieldsDependencies(this.resolve(includes, false));
    }
  }, {
    key: '_mergeIncludes',
    value: function _mergeIncludes(target, source) {
      var _this3 = this;

      return _lodash2['default'].pick(_extends({}, target, _lodash2['default'].mapValues(source, function (value, key) {
        if (_lodash2['default'].isObject(target[key]) && _lodash2['default'].isObject(source[key])) {
          return _this3._mergeIncludes(target[key], source[key]);
        } else {
          return source[key];
        }
      })), _lodash2['default'].identity);
    }
  }]);

  return IncludesResolver;
})();

exports['default'] = IncludesResolver;
module.exports = exports['default'];