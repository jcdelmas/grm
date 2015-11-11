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
  /**
   * @param {Grm} grm
   */

  function IncludesResolver(grm) {
    _classCallCheck(this, IncludesResolver);

    this.grm = grm;
  }

  /**
   * @param {Model} model
   * @param {object|boolean} userIncludes
   * @param {boolean} includeDefaults
   */

  _createClass(IncludesResolver, [{
    key: 'resolve',
    value: function resolve(model, userIncludes) {
      var _this = this;

      var includeDefaults = arguments.length <= 2 || arguments[2] === undefined ? true : arguments[2];

      if (_lodash2['default'].isPlainObject(userIncludes)) {
        var relationsIncludes = (0, _lodash2['default'])(userIncludes).pick(function (cfg, fieldName) {
          return (cfg === true || _lodash2['default'].isPlainObject(cfg)) && model.relations[fieldName];
        }).mapValues(function (cfg, fieldName) {
          var relationModel = _this.grm.registry.get(model.relations[fieldName].model);
          return _this.resolve(relationModel, cfg, includeDefaults);
        }).value();
        var newIncludes = _extends({}, _lodash2['default'].omit(userIncludes, '$defaults'), relationsIncludes);
        if (!userIncludes.hasOwnProperty('$defaults') && includeDefaults || userIncludes.$defaults) {
          return this._mergeIncludes(model.defaultIncludes, newIncludes);
        } else {
          return newIncludes;
        }
      } else if (userIncludes === true) {
        return model.defaultIncludes;
      } else if (_lodash2['default'].isArray(userIncludes)) {
        var objectUserIncludes = userIncludes.reduce(function (acc, field) {
          var fieldObject = field.split('.').reduceRight(function (acc2, token) {
            return _defineProperty({}, token, acc2);
          }, true);
          return _lodash2['default'].merge(acc, fieldObject);
        }, {});
        return this.resolve(model, objectUserIncludes, includeDefaults);
      } else {
        return {};
      }
    }
  }, {
    key: 'mergeDependencies',
    value: function mergeDependencies(model, includes) {
      return this._addMissingIds(model, this._mergeVirtualFieldsDependencies(model, includes));
    }

    /**
     * @param {Model} model
     * @param {object} includes
     * @return {object}
     */
  }, {
    key: '_mergeVirtualFieldsDependencies',
    value: function _mergeVirtualFieldsDependencies(model, includes) {
      var _this2 = this;

      return (0, _lodash2['default'])(model.virtualFields).filter(function (cfg, field) {
        return includes[field];
      }).map('dependsOn').reduce(function (target, source) {
        return _this2._mergeIncludes(target, _this2._fullResolve(model, source));
      }, includes);
    }
  }, {
    key: '_addMissingIds',
    value: function _addMissingIds(model, includes) {
      var _this3 = this;

      return _extends({}, includes, {
        id: true
      }, (0, _lodash2['default'])(model.relations).pick(function (cfg, field) {
        return includes[field];
      }).mapValues(function (cfg, field) {
        return _this3._addMissingIds(cfg.model, includes[field]);
      }).value());
    }
  }, {
    key: '_fullResolve',
    value: function _fullResolve(model, includes) {
      return this._mergeVirtualFieldsDependencies(model, this.resolve(model, includes, false));
    }
  }, {
    key: '_mergeIncludes',
    value: function _mergeIncludes(target, source) {
      var _this4 = this;

      return _lodash2['default'].pick(_extends({}, target, _lodash2['default'].mapValues(source, function (value, key) {
        if (_lodash2['default'].isObject(target[key]) && _lodash2['default'].isObject(source[key])) {
          return _this4._mergeIncludes(target[key], source[key]);
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