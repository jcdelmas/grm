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

var _decamelize = require('decamelize');

var _decamelize2 = _interopRequireDefault(_decamelize);

var _constants = require('./constants');

var _relationResolvers = require('./relation-resolvers');

var _relationResolvers2 = _interopRequireDefault(_relationResolvers);

var _utilsPromises = require('./utils/promises');

var _utilsPromises2 = _interopRequireDefault(_utilsPromises);

var Model = (function () {
  var _value;

  function Model(orm, name, cfg) {
    var _this = this;

    _classCallCheck(this, Model);

    this._computeFieldCfg = function (baseCfg, fieldName) {
      var cfg = _lodash2['default'].clone(baseCfg);
      if (!cfg.column) {
        cfg.column = underscore(fieldName);
      }
      return cfg;
    };

    this._computeVirtualFieldCfg = function (baseCfg, fieldName) {
      if (!baseCfg.hasOwnProperty('getter')) {
        throw new Error('Virtual field [' + fieldName + '] of model [' + _this.name + '] has no \'getter\' property');
      }
      if (typeof baseCfg.getter !== 'function') {
        throw new Error('Getter property of virtual field [' + fieldName + '] in model [' + _this.name + '] is not a function');
      }
      var cfg = _lodash2['default'].clone(baseCfg);
      if (!cfg.hasOwnProperty('include')) {
        cfg.include = !cfg.dependsOn || Object.keys(cfg.dependsOn).every(function (f) {
          return _this.fields[f];
        });
      }
      return cfg;
    };

    this.orm = orm;
    this.name = name;
    this.cfg = cfg;

    this.tableName = this.cfg.tableName || underscore(this.name);

    this.fields = this.cfg.fields ? _lodash2['default'].mapValues(cfg.fields, this._computeFieldCfg) : {};
    this.virtualFields = this.cfg.virtualFields ? _lodash2['default'].mapValues(this.cfg.virtualFields, this._computeVirtualFieldCfg) : {};

    this._computeVirtualFieldsLevel();

    this.relations = {};

    this._resolvers = {};

    this._resolveRelationCfgs().then(function () {
      _this.defaultIncludes = _this._resolveDefaultIncludes();
    });
  }

  _createClass(Model, [{
    key: 'findById',
    value: function findById(id) {
      var _this2 = this;

      var includes = arguments.length <= 1 || arguments[1] === undefined ? true : arguments[1];

      return this.orm.query(this, {
        where: { id: id },
        includes: includes
      }).then(function (rows) {
        if (rows.length === 0) {
          throw new Error('No ' + _this2.name + ' found with id [' + id + ']');
        }
        return rows[0];
      });
    }
  }, {
    key: 'findOne',
    value: function findOne(q) {
      return this.orm.query(this, q).then(function (rows) {
        if (rows.length > 1) {
          throw new Error('More than 1 row returned');
        }
        return rows[0];
      });
    }
  }, {
    key: 'findAll',
    value: function findAll(q) {
      return this.orm.query(this, q);
    }
  }, {
    key: 'count',
    value: function count(where) {
      return this.orm.query(this, { count: true, where: where }).then(function (rows) {
        return rows[0];
      });
    }
  }, {
    key: 'countAndFindAll',
    value: function countAndFindAll(q) {
      return _utilsPromises2['default'].props({
        count: this.count(q.where),
        rows: this.findAll(q)
      });
    }
  }, {
    key: '_resolveRelationCfgs',
    value: function _resolveRelationCfgs() {
      var _this3 = this;

      if (this.cfg.relations) {
        return Promise.all((0, _lodash2['default'])(this.cfg.relations).map(function (userCfg, fieldName) {
          if (userCfg.mappedBy) {
            return _this3.orm.registry.getAsync(userCfg.model).then(function (targetModel) {
              var reverseRelation = targetModel.relations[userCfg.mappedBy];
              _this3.relations[fieldName] = _this3._resolveMappedRelationCfg(userCfg, fieldName, reverseRelation);
            });
          } else {
            _this3.relations[fieldName] = _this3._resolveSimpleRelationCfg(userCfg, fieldName);
          }
        }).compact().value());
      } else {
        return Promise.resolve();
      }
    }
  }, {
    key: '_resolveMappedRelationCfg',
    value: function _resolveMappedRelationCfg(userCfg, fieldName, reverseRelation) {
      var cfg = _lodash2['default'].clone(userCfg);

      cfg.type = Model._relationTypeMapping[reverseRelation.type];

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
      var cfg = _lodash2['default'].clone(userCfg);

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
    key: '_resolver',
    value: function _resolver(fieldName) {
      if (!this._resolvers[fieldName]) {
        var relation = this.relations[fieldName];
        if (!relation) {
          throw new Error('Model [' + this.name + '] has no relation named [' + fieldName + ']');
        }
        this._resolvers[fieldName] = (0, _relationResolvers2['default'])(this, fieldName, relation);
      }
      return this._resolvers[fieldName];
    }
  }, {
    key: '_resolveDefaultIncludes',
    value: function _resolveDefaultIncludes() {
      return _extends({}, _lodash2['default'].mapValues(this.fields, function () {
        return true;
      }), (0, _lodash2['default'])(this.relations).pick(function (r) {
        return r.foreignKey;
      }).mapValues(function () {
        return { id: true };
      }).value(), (0, _lodash2['default'])(this.virtualFields).pick(function (cfg) {
        return cfg.include;
      }).mapValues(function () {
        return true;
      }).value());
    }
  }, {
    key: '_computeVirtualFieldsLevel',
    value: function _computeVirtualFieldsLevel() {
      var _this4 = this;

      Object.keys(this.virtualFields).forEach(function (fieldName) {
        return _this4._computeVirtualFieldLevel(fieldName);
      });
    }
  }, {
    key: '_computeVirtualFieldLevel',
    value: function _computeVirtualFieldLevel(name) {
      var _this5 = this;

      var virtualField = this.virtualFields[name];
      if (!virtualField.hasOwnProperty('level')) {
        if (virtualField.dependsOn) {
          var fields = _lodash2['default'].isArray(virtualField.dependsOn) ? virtualField.dependsOn : Object.keys(virtualField.dependsOn);
          virtualField.level = (0, _lodash2['default'])(fields).filter(function (field) {
            return _this5.virtualFields[field];
          }).map(function (field) {
            return _this5._computeVirtualFieldLevel(field);
          }).reduce(function (a, b) {
            return Math.max(a, b);
          }, -1) + 1;
        } else {
          virtualField.level = 0;
        }
      }
      return virtualField.level;
    }
  }], [{
    key: '_relationTypeMapping',
    value: (_value = {}, _defineProperty(_value, _constants.Relations.MANY_TO_ONE, _constants.Relations.ONE_TO_MANY), _defineProperty(_value, _constants.Relations.ONE_TO_MANY, _constants.Relations.MANY_TO_ONE), _defineProperty(_value, _constants.Relations.MANY_TO_MANY, _constants.Relations.MANY_TO_MANY), _defineProperty(_value, _constants.Relations.ONE_TO_ONE, _constants.Relations.ONE_TO_ONE), _value),
    enumerable: true
  }]);

  return Model;
})();

exports['default'] = Model;

function underscore(s) {
  return (0, _decamelize2['default'])(s, '_');
}
module.exports = exports['default'];