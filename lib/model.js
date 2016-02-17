'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _Model$_relationTypeM;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _decamelize = require('decamelize');

var _decamelize2 = _interopRequireDefault(_decamelize);

var _queryExecutor = require('./query-executor');

var _queryExecutor2 = _interopRequireDefault(_queryExecutor);

var _constants = require('./constants');

var _ast = require('./ast');

var _ast2 = _interopRequireDefault(_ast);

var _relationResolvers = require('./relation-resolvers');

var _relationResolvers2 = _interopRequireDefault(_relationResolvers);

var _promises = require('./utils/promises');

var _promises2 = _interopRequireDefault(_promises);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Model = function () {
  function Model(orm, name, cfg) {
    var _this = this;

    _classCallCheck(this, Model);

    _initialiseProps.call(this);

    this.orm = orm;
    this.name = name;
    this.cfg = cfg;

    this.tableName = this.cfg.tableName || underscore(this.name);

    this.fields = this.cfg.fields ? _lodash2.default.mapValues(cfg.fields, this._computeFieldCfg) : {};
    this.virtualFields = this.cfg.virtualFields ? _lodash2.default.mapValues(this.cfg.virtualFields, this._computeVirtualFieldCfg) : {};

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
      var includes = arguments.length <= 1 || arguments[1] === undefined ? true : arguments[1];

      return this.findOne({
        where: { id: id },
        includes: includes
      });
    }
  }, {
    key: 'findOne',
    value: function findOne(q) {
      return this._query(q).then(function (rows) {
        if (rows.length > 1) {
          throw new Error('More than 1 row returned');
        }
        return rows.length === 1 ? rows[0] : null;
      });
    }
  }, {
    key: 'findAll',
    value: function findAll(q) {
      return this._query(q);
    }
  }, {
    key: 'stream',
    value: function stream(q) {
      var batchSize = arguments.length <= 1 || arguments[1] === undefined ? 50 : arguments[1];

      return this._query(_extends({}, q, {
        stream: true,
        batchSize: batchSize
      }));
    }
  }, {
    key: 'count',
    value: function count(where) {
      return this._query({ select: _ast2.default.count(_ast2.default.field('id')), where: where }).then(function (rows) {
        return rows[0];
      });
    }
  }, {
    key: 'countAndFindAll',
    value: function countAndFindAll(q) {
      return _promises2.default.props({
        count: this.count(q.where),
        rows: this.findAll(q)
      });
    }
  }, {
    key: '_query',
    value: function _query(q) {
      return (0, _queryExecutor2.default)(_extends({}, q, {
        model: this
      }));
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
              _this2.relations[fieldName] = _this2._resolveMappedRelationCfg(userCfg, fieldName, reverseRelation);
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
    value: function _resolveMappedRelationCfg(userCfg, fieldName, reverseRelation) {
      var cfg = _lodash2.default.clone(userCfg);

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
    key: '_resolver',
    value: function _resolver(fieldName) {
      if (!this._resolvers[fieldName]) {
        var relation = this.relations[fieldName];
        if (!relation) {
          throw new Error('Model [' + this.name + '] has no relation named [' + fieldName + ']');
        }
        this._resolvers[fieldName] = (0, _relationResolvers2.default)(this, fieldName, relation);
      }
      return this._resolvers[fieldName];
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

  return Model;
}();

Model._relationTypeMapping = (_Model$_relationTypeM = {}, _defineProperty(_Model$_relationTypeM, _constants.Relations.MANY_TO_ONE, _constants.Relations.ONE_TO_MANY), _defineProperty(_Model$_relationTypeM, _constants.Relations.ONE_TO_MANY, _constants.Relations.MANY_TO_ONE), _defineProperty(_Model$_relationTypeM, _constants.Relations.MANY_TO_MANY, _constants.Relations.MANY_TO_MANY), _defineProperty(_Model$_relationTypeM, _constants.Relations.ONE_TO_ONE, _constants.Relations.ONE_TO_ONE), _Model$_relationTypeM);

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

exports.default = Model;


function underscore(s) {
  return (0, _decamelize2.default)(s, '_');
}