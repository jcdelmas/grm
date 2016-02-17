'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _constants = require('./constants.js');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var BATCH_SIZE = 20;

exports.default = function (model, fieldName) {
  var relation = model.relations[fieldName];
  switch (relation.type) {
    case _constants.Relations.MANY_TO_MANY:
      return new ManyToManyResolver(model, fieldName, relation);
    case _constants.Relations.ONE_TO_MANY:
      return new OneToManyResolver(model, fieldName, relation);
    default:
      throw new Error('Not supported');
  }
};

var ManyToManyResolver = function () {
  function ManyToManyResolver(model, fieldName, relation) {
    _classCallCheck(this, ManyToManyResolver);

    this.orm = model.orm;
    this.model = model;
    this.fieldName = fieldName;
    this.relation = relation;
    this.throughModel = this.orm.registry.get(this.relation.through);
  }

  _createClass(ManyToManyResolver, [{
    key: 'resolve',
    value: function resolve(rows, select) {
      var _this = this;

      rows.forEach(function (p) {
        return p[_this.fieldName] = [];
      });
      var groupedRows = _lodash2.default.groupBy(rows, 'id');

      var promises = (0, _lodash2.default)(groupedRows).keys().chunk(BATCH_SIZE).map(function (ids) {
        var params = _this.getParams({ $in: ids }, select);
        return _this.throughModel.findAll(params).then(function (links) {
          var targetRows = (0, _lodash2.default)(links).map(_this.relation.targetLink).uniq('id').value();
          var indexedTargetRows = _lodash2.default.indexBy(targetRows, 'id');
          links.forEach(function (link) {
            groupedRows[link[_this.relation.sourceLink].id].forEach(function (row) {
              row[_this.fieldName].push(indexedTargetRows[link[_this.relation.targetLink].id]);
            });
          });
        });
      }).value();
      return Promise.all(promises);
    }
  }, {
    key: 'getParams',
    value: function getParams(filter, select) {
      var params = {
        where: {},
        select: {}
      };
      params.select[this.relation.sourceLink] = { id: true };
      params.select[this.relation.targetLink] = select;
      if (this.relation.order) {
        params.order = this.relation.order;
      }
      var baseWhere = _defineProperty({}, this.relation.sourceLink + '.id', filter);
      params.where = this.relation.where ? [baseWhere, this.relation.where] : baseWhere;
      return params;
    }
  }]);

  return ManyToManyResolver;
}();

var OneToManyResolver = function () {
  function OneToManyResolver(model, fieldName, relation) {
    _classCallCheck(this, OneToManyResolver);

    this.orm = model.orm;
    this.model = model;
    this.fieldName = fieldName;
    this.relation = relation;
    this.targetModel = this.orm.registry.get(relation.model);
  }

  _createClass(OneToManyResolver, [{
    key: 'resolve',
    value: function resolve(rows, select) {
      var _this2 = this;

      var fullSelect = this._checkSelect(select);
      rows.forEach(function (p) {
        return p[_this2.fieldName] = [];
      });
      var groupedRows = _lodash2.default.groupBy(rows, 'id');
      var promises = (0, _lodash2.default)(groupedRows).keys().chunk(BATCH_SIZE).map(function (ids) {
        var params = _this2.getParams({ $in: ids }, fullSelect);
        return _this2.targetModel.findAll(params).then(function (targetRows) {
          targetRows.forEach(function (targetRow) {
            groupedRows[targetRow[_this2.relation.mappedBy].id].forEach(function (row) {
              row[_this2.fieldName].push(targetRow);
            });
          });
        });
      }).value();
      return Promise.all(promises);
    }
  }, {
    key: '_checkSelect',
    value: function _checkSelect(select) {
      var link = this.relation.mappedBy;
      if (!select[link]) {
        return _extends({}, select, _defineProperty({}, link, { id: true }));
      }
      if (!select[link].id) {
        return _extends({}, select, _defineProperty({}, link, _extends({}, select[link], {
          id: true
        })));
      }
      return select;
    }
  }, {
    key: 'getParams',
    value: function getParams(filter, select) {
      var params = {
        where: {},
        select: select
      };
      if (this.relation.order) {
        params.order = this.relation.order;
      }
      var baseWhere = _defineProperty({}, this.relation.mappedBy + '.id', filter);
      params.where = this.relation.where ? [baseWhere, this.relation.where] : baseWhere;
      return params;
    }
  }]);

  return OneToManyResolver;
}();