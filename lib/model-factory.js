'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _ModelFactory$_relati;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _decamelize = require('decamelize');

var _decamelize2 = _interopRequireDefault(_decamelize);

var _constants = require('./constants');

var _model = require('./model');

var _model2 = _interopRequireDefault(_model);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ModelFactory = function () {
  function ModelFactory(orm, name, cfg) {
    _classCallCheck(this, ModelFactory);

    _initialiseProps.call(this);

    this.orm = orm;
    this.name = name;
    this.cfg = cfg;
  }

  _createClass(ModelFactory, [{
    key: 'resolve',
    value: function resolve() {
      var _this = this;

      this.tableName = this.cfg.tableName || underscore(this.name);
      this.fields = this.cfg.fields ? _lodash2.default.mapValues(this.cfg.fields, this._computeFieldCfg) : {};
      this.virtualFields = this.cfg.virtualFields ? _lodash2.default.mapValues(this.cfg.virtualFields, this._computeVirtualFieldCfg) : {};
      this._computeVirtualFieldsLevel();
      this.relations = {};

      var model = new _model2.default(this.orm, this.name, {
        tableName: this.tableName,
        fields: this.fields,
        virtualFields: this.virtualFields,
        relations: this.relations
      });

      this._resolveRelationCfgs().then(function () {
        model._setDefaultIncludes(_this._resolveDefaultIncludes());
      });

      return model;
    }
  }, {
    key: '_resolveRelationCfgs',
    value: function _resolveRelationCfgs() {
      var _this2 = this;

      if (this.cfg.relations) {
        return Promise.all((0, _lodash2.default)(this.cfg.relations).map(function (userCfg, fieldName) {
          if (userCfg.mappedBy) {
            return _this2.orm.registry.getAsync(userCfg.model).then(function (targetModel) {
              var reverseRelation = targetModel.relations[userCfg.mappedBy];
              _this2.relations[fieldName] = _this2._resolveMappedRelationCfg(userCfg, reverseRelation);
            });
          } else {
            _this2.relations[fieldName] = _this2._resolveSimpleRelationCfg(userCfg, fieldName);
          }
        }).compact().value());
      } else {
        return Promise.resolve();
      }
    }
  }, {
    key: '_resolveMappedRelationCfg',
    value: function _resolveMappedRelationCfg(userCfg, reverseRelation) {
      var cfg = _lodash2.default.clone(userCfg);

      cfg.type = ModelFactory._relationTypeMapping[reverseRelation.type];

      if (reverseRelation.through) {
        cfg.through = reverseRelation.through;
        cfg.sourceLink = reverseRelation.targetLink;
        cfg.targetLink = reverseRelation.sourceLink;
      }

      return this._commonRelationResolving(cfg);
    }
  }, {
    key: '_resolveSimpleRelationCfg',
    value: function _resolveSimpleRelationCfg(userCfg, fieldName) {
      var cfg = _lodash2.default.clone(userCfg);

      if (cfg.through) {
        cfg.type = cfg.type || _constants.Relations.MANY_TO_MANY;
        cfg.sourceLink = cfg.sourceLink || this.name.charAt(0).toLowerCase() + this.name.slice(1);
        cfg.targetLink = cfg.targetLink || cfg.model.charAt(0).toLowerCase() + cfg.model.slice(1);
      } else {
        cfg.type = cfg.type || _constants.Relations.MANY_TO_ONE;
        cfg.foreignKey = cfg.foreignKey || underscore(fieldName) + '_id';
      }

      return this._commonRelationResolving(cfg);
    }
  }, {
    key: '_commonRelationResolving',
    value: function _commonRelationResolving(cfg) {
      cfg.isCollection = cfg.type === _constants.Relations.MANY_TO_MANY || cfg.type === _constants.Relations.ONE_TO_MANY;

      if (!cfg.hasOwnProperty('required')) {
        cfg.required = false;
      }

      return cfg;
    }
  }, {
    key: '_resolveDefaultIncludes',
    value: function _resolveDefaultIncludes() {
      return _extends({}, _lodash2.default.mapValues(this.fields, function () {
        return true;
      }), (0, _lodash2.default)(this.relations).pick(function (r) {
        return r.foreignKey;
      }).mapValues(function () {
        return { id: true };
      }).value(), (0, _lodash2.default)(this.virtualFields).pick(function (cfg) {
        return cfg.include;
      }).mapValues(function () {
        return true;
      }).value());
    }
  }, {
    key: '_computeVirtualFieldsLevel',
    value: function _computeVirtualFieldsLevel() {
      var _this3 = this;

      Object.keys(this.virtualFields).forEach(function (fieldName) {
        return _this3._computeVirtualFieldLevel(fieldName);
      });
    }
  }, {
    key: '_computeVirtualFieldLevel',
    value: function _computeVirtualFieldLevel(name) {
      var _this4 = this;

      var virtualField = this.virtualFields[name];
      if (!virtualField.hasOwnProperty('level')) {
        if (virtualField.dependsOn) {
          var fields = _lodash2.default.isArray(virtualField.dependsOn) ? virtualField.dependsOn : Object.keys(virtualField.dependsOn);
          virtualField.level = (0, _lodash2.default)(fields).filter(function (field) {
            return _this4.virtualFields[field];
          }).map(function (field) {
            return _this4._computeVirtualFieldLevel(field);
          }).reduce(function (a, b) {
            return Math.max(a, b);
          }, -1) + 1;
        } else {
          virtualField.level = 0;
        }
      }
      return virtualField.level;
    }
  }]);

  return ModelFactory;
}();

ModelFactory._relationTypeMapping = (_ModelFactory$_relati = {}, _defineProperty(_ModelFactory$_relati, _constants.Relations.MANY_TO_ONE, _constants.Relations.ONE_TO_MANY), _defineProperty(_ModelFactory$_relati, _constants.Relations.ONE_TO_MANY, _constants.Relations.MANY_TO_ONE), _defineProperty(_ModelFactory$_relati, _constants.Relations.MANY_TO_MANY, _constants.Relations.MANY_TO_MANY), _defineProperty(_ModelFactory$_relati, _constants.Relations.ONE_TO_ONE, _constants.Relations.ONE_TO_ONE), _ModelFactory$_relati);

var _initialiseProps = function _initialiseProps() {
  var _this5 = this;

  this._computeFieldCfg = function (baseCfg, fieldName) {
    var cfg = _lodash2.default.clone(baseCfg);
    if (!cfg.column) {
      cfg.column = underscore(fieldName);
    }
    return cfg;
  };

  this._computeVirtualFieldCfg = function (baseCfg, fieldName) {
    if (!baseCfg.hasOwnProperty('getter')) {
      throw new Error('Virtual field [' + fieldName + '] of model [' + _this5.name + '] has no \'getter\' property');
    }
    if (typeof baseCfg.getter !== 'function') {
      throw new Error('Getter property of virtual field [' + fieldName + '] in model [' + _this5.name + '] is not a function');
    }
    var cfg = _lodash2.default.clone(baseCfg);
    if (!cfg.hasOwnProperty('include')) {
      cfg.include = !cfg.dependsOn || Object.keys(cfg.dependsOn).every(function (f) {
        return _this5.fields[f];
      });
    }
    return cfg;
  };
};

exports.default = ModelFactory;


function underscore(s) {
  return (0, _decamelize2.default)(s, '_');
}