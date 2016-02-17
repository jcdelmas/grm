'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _queryExecutor = require('./query-executor');

var _queryExecutor2 = _interopRequireDefault(_queryExecutor);

var _ast = require('./ast');

var _ast2 = _interopRequireDefault(_ast);

var _relationResolvers = require('./relation-resolvers');

var _relationResolvers2 = _interopRequireDefault(_relationResolvers);

var _promises = require('./utils/promises');

var _promises2 = _interopRequireDefault(_promises);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Model = function () {
  function Model(orm, name, cfg) {
    _classCallCheck(this, Model);

    this.orm = orm;
    this.name = name;

    this.tableName = cfg.tableName;
    this.fields = cfg.fields;
    this.virtualFields = cfg.virtualFields;
    this.relations = cfg.relations;
    this.defaultIncludes = cfg.defaultIncludes;

    this._resolvers = {};
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
    key: '_setDefaultIncludes',
    value: function _setDefaultIncludes(defaultIncludes) {
      this.defaultIncludes = defaultIncludes;
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
  }]);

  return Model;
}();

exports.default = Model;