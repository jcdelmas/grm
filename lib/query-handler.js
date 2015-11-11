'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _clientJs = require('./client.js');

var _astJs = require('./ast.js');

exports['default'] = function (orm) {
  return function (model, query) {
    return new QueryHandler(orm, model, query).execute();
  };
};

/**
 * @typedef {(Composition|Negation|Comparison)} Predicate
 */

var QueryHandler = (function () {
  /**
   * @param {Grm} orm
   * @param {Model} model
   * @param {object} query
   */

  function QueryHandler(orm, model) {
    var _this = this;

    var query = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    _classCallCheck(this, QueryHandler);

    this.refineRow = function (row) {
      return _this.refineR(row, _this.includes);
    };

    this.orm = orm;
    this.model = model;
    this.query = query;

    this.fields = {};
    this.aliasCounter = 0;
    this.distinctRows = false;

    this.scalarResult = query.select && !_lodash2['default'].isPlainObject(query.select) && !_lodash2['default'].isArray(query.select);
    this.includes = this.orm.includesResolver.resolve(this.model, !this.scalarResult ? query.select || query.includes || true : { value: query.select }, !query.select);
    this.rootScope = new Scope(this, model);

    this.parser = new Parser(this.rootScope);
  }

  _createClass(QueryHandler, [{
    key: 'execute',
    value: function execute() {
      var _this2 = this;

      this.rootScope.includes(this.includes);

      var wherePart = this.query.where ? this.parser.parseFilter(this.query.where) : null;

      var orderPart = this.query.order ? this.parser.parseOrder(this.query.order) : null;

      var groupPart = this.query.group ? this.parser.parseGroup(this.query.group) : null;

      var havingPart = this.query.having ? this.parser.parseFilter(this.query.having) : null;

      var qb = [];
      qb.push('SELECT ');
      qb.push(this.resolveSelect());
      qb.push(' FROM ');
      qb.push(this.rootScope.tableReference);
      // Resolve joins must be call after
      this.rootScope.resolveJoins().forEach(function (join) {
        return qb.push(join);
      });

      if (wherePart) {
        qb.push(' WHERE ');
        qb.push(wherePart);
      }

      if (groupPart) {
        qb.push(' GROUP BY ');
        qb.push(groupPart);
      }

      if (havingPart) {
        qb.push(' HAVING ');
        qb.push(havingPart);
      }

      if (orderPart) {
        qb.push(' ORDER BY ');
        qb.push(orderPart);
      }

      if (this.query.hasOwnProperty('limit')) {
        qb.push(' LIMIT ');
        qb.push(this.query.limit);
      }

      if (this.query.hasOwnProperty('offset')) {
        qb.push(' OFFSET ');
        qb.push(this.query.offset);
      }

      var query = qb.join('');
      var rowParser = this.rowParser();
      return this.orm.client.query(query).then(function (rawResults) {
        var rows = rawResults.map(rowParser);
        if (_this2.hasModelResult()) {
          return _this2.rootScope.resolveSubsequentFetches(rows).then(function () {
            rows.forEach(function (row) {
              return _this2.rootScope.resolveVirtualFields(row);
            });
            return rows.map(_this2.refineRow);
          });
        } else {
          return rows;
        }
      });
    }
  }, {
    key: 'nextAlias',
    value: function nextAlias() {
      var alias = '_' + this.aliasCounter;
      this.aliasCounter++;
      return alias;
    }
  }, {
    key: 'rowParser',
    value: function rowParser() {
      var _this3 = this;

      if (this.query.count) {
        return function (row) {
          return row.value;
        };
      } else {
        var base = function base(row) {
          return _this3.rootScope.parseRow(row);
        };
        return !this.scalarResult ? base : _lodash2['default'].flow(base, function (row) {
          return row.value;
        });
      }
    }
  }, {
    key: 'resolveSelect',
    value: function resolveSelect() {
      if (this.query.count) {
        var distinct = this.distinctRows ? 'DISTINCT ' : '';
        return 'COUNT(' + distinct + this.resolveField('id') + ') AS value';
      } else {
        return (this.distinctRows ? 'DISTINCT ' : '') + this.rootScope.resolveSelect().join(', ');
      }
    }
  }, {
    key: 'resolveField',
    value: function resolveField(fieldName) {
      return this.rootScope.resolveField(fieldName);
    }
  }, {
    key: 'hasModelResult',
    value: function hasModelResult() {
      return !this.query.count && !this.scalarResult;
    }
  }, {
    key: 'refineR',

    /**
     *
     * @param {object} obj
     * @param {object} includes
     */
    value: function refineR(obj, includes) {
      var _this4 = this;

      if (_lodash2['default'].isPlainObject(obj)) {
        return _lodash2['default'].mapValues(includes, function (fieldInc, fieldName) {
          if (_lodash2['default'].isPlainObject(fieldInc)) {
            return _this4.refineR(obj[fieldName], fieldInc);
          } else {
            return obj[fieldName];
          }
        });
      } else if (_lodash2['default'].isArray(obj)) {
        return obj.map(function (v) {
          return _this4.refineR(v, includes);
        });
      } else {
        return obj;
      }
    }
  }]);

  return QueryHandler;
})();

var Scope = (function () {
  /**
   * @param {QueryHandler} queryHandler
   * @param {Model} model
   */

  function Scope(queryHandler, model) {
    _classCallCheck(this, Scope);

    this.orm = queryHandler.orm;
    this.queryHandler = queryHandler;
    this.model = model;
    this.alias = queryHandler.nextAlias();
    this.children = {};
    this.subsequentFetches = {};
    this.tableReference = (0, _clientJs.escapeId)(this.model.tableName) + ' AS ' + this.alias;

    this.isFetched = false;

    this.fetchedFields = {};
    this.virtualFields = [];
    this.subsequentFetches = {};

    this.resolvingCustomFields = {};
  }

  _createClass(Scope, [{
    key: 'includes',
    value: function includes(baseIncludes) {
      var _this5 = this;

      this.isFetched = true;

      var includes = this.orm.includesResolver.mergeDependencies(this.model, baseIncludes);

      var parser = new Parser(this);

      _lodash2['default'].forEach(includes, function (input, fieldName) {
        if (_this5.model.fields[fieldName] && input === true) {
          var fieldCfg = _this5.model.fields[fieldName];
          _this5.fetchedFields[fieldName] = {
            alias: _this5.queryHandler.nextAlias(),
            transform: fieldCfg.getter,
            expression: _this5.alias + '.' + (0, _clientJs.escapeId)(fieldCfg.column)
          };
        } else if (_this5.model.relations[fieldName] && _lodash2['default'].isPlainObject(input)) {
          var relation = _this5.model.relations[fieldName];
          if (!relation.isCollection) {
            if (relation.foreignKey && _lodash2['default'].isEqual(input, { id: true })) {
              _this5.fetchedFields[fieldName] = {
                alias: _this5.queryHandler.nextAlias(),
                transform: function transform(id) {
                  return { id: id };
                },
                expression: _this5.alias + '.' + (0, _clientJs.escapeId)(relation.foreignKey)
              };
            } else {
              _this5.resolveScope(fieldName).includes(input);
            }
          } else {
            _this5.subsequentFetches[fieldName] = input;
          }
        } else if (_this5.model.virtualFields[fieldName] && input === true) {
          _this5.virtualFields.push(fieldName);
        } else {
          (function () {
            var parent = _this5;
            _this5.fetchedFields[fieldName] = Object.defineProperties({
              alias: _this5.queryHandler.nextAlias()
            }, {
              expression: {
                get: function get() {
                  if (!this.hasOwnProperty('_resolved')) {
                    parent.resolvingCustomFields[fieldName] = true;
                    this._resolved = parser.parseSelect(input);
                    delete parent.resolvingCustomFields[fieldName];
                  }
                  return this._resolved;
                },
                configurable: true,
                enumerable: true
              }
            });
          })();
        }
      });
      this.virtualFields.reverse(); // put dependencies at the beginning
    }
  }, {
    key: 'resolveJoins',
    value: function resolveJoins() {
      return (0, _lodash2['default'])(this.children).map(function (child) {
        return [].concat(_toConsumableArray(child.joins), _toConsumableArray(child.scope.resolveJoins()));
      }).flatten().value();
    }
  }, {
    key: 'resolveSelect',
    value: function resolveSelect() {
      return [].concat(_toConsumableArray(_lodash2['default'].map(this.fetchedFields, function (field) {
        return field.expression + ' AS ' + field.alias;
      })), _toConsumableArray((0, _lodash2['default'])(this.getFetchedChildren()).map(function (child) {
        return child.resolveSelect();
      }).flatten().value()));
    }
  }, {
    key: 'resolveField',
    value: function resolveField(fieldName) {
      var index = fieldName.indexOf('.');
      if (index !== -1) {
        var baseFieldName = fieldName.slice(0, index);
        var childFieldName = fieldName.slice(index + 1);
        if (childFieldName === 'id' && this.model.relations[baseFieldName] && this.model.relations[baseFieldName].foreignKey) {
          // avoid useless joins when possible
          var column = this.model.relations[baseFieldName].foreignKey;
          return this.alias + '.' + (0, _clientJs.escapeId)(column);
        } else {
          return this.resolveScope(baseFieldName).resolveField(childFieldName);
        }
      } else if (this.fetchedFields[fieldName] && !this.resolvingCustomFields[fieldName]) {
        return this.fetchedFields[fieldName].expression;
      } else if (this.model.fields[fieldName]) {
        var column = this.model.fields[fieldName].column;
        return this.alias + '.' + (0, _clientJs.escapeId)(column);
      } else if (this.resolvingCustomFields[fieldName]) {
        throw new Error('Recursive field [' + fieldName + ']');
      } else {
        throw new Error('Unknown field [' + fieldName + '] in model [' + this.model.name + ']');
      }
    }

    /**
     * @param {string} fieldName
     * @return {Scope}
     */
  }, {
    key: 'resolveScope',
    value: function resolveScope(fieldName) {
      if (!this.children[fieldName]) {
        if (this.model.relations[fieldName]) {
          var relation = this.model.relations[fieldName];
          var relationModel = this.orm.registry.get(relation.model);
          var scope = new Scope(this.queryHandler, relationModel);

          if (relation.isCollection) {
            this.queryHandler.distinctRows = true;
          }

          this.children[fieldName] = {
            scope: scope,
            joins: this.resolveRelationJoins(relation, scope)
          };
        } else {
          throw new Error('Unknown relation [' + fieldName + '] for model [' + this.model.name + ']');
        }
      }
      return this.children[fieldName].scope;
    }

    /**
     * @param relation
     * @param {Scope} scope
     */
  }, {
    key: 'resolveRelationJoins',
    value: function resolveRelationJoins(relation, scope) {
      var joinType = (relation.required ? 'INNER' : 'LEFT OUTER') + ' JOIN';
      if (relation.foreignKey) {
        return [' ' + (relation.required ? 'INNER' : 'LEFT OUTER') + ' JOIN ' + scope.tableReference + (' ON ' + this.alias + '.' + (0, _clientJs.escapeId)(relation.foreignKey) + ' = ' + scope.alias + '.id')];
      } else if (relation.through) {
        var linkModel = this.orm.registry.get(relation.through);
        var linkAlias = this.queryHandler.nextAlias();
        var sourceForeignKey = linkModel.relations[relation.sourceLink].foreignKey;
        var targetForeignKey = linkModel.relations[relation.targetLink].foreignKey;

        return [' ' + joinType + ' ' + (0, _clientJs.escapeId)(linkModel.tableName) + ' AS ' + linkAlias + (' ON ' + this.alias + '.id = ' + linkAlias + '.' + (0, _clientJs.escapeId)(sourceForeignKey)), ' ' + joinType + ' ' + scope.tableReference + (' ON ' + linkAlias + '.' + (0, _clientJs.escapeId)(targetForeignKey) + ' = ' + scope.alias + '.id')];
      } else if (relation.mappedBy) {
        var targetModel = this.orm.registry.get(relation.model);
        var sourceForeignKey = targetModel.relations[relation.mappedBy].foreignKey;
        return [' ' + joinType + ' ' + scope.tableReference + (' ON ' + this.alias + '.id = ' + scope.alias + '.' + (0, _clientJs.escapeId)(sourceForeignKey))];
      } else {
        throw new Error('Unexpected relation');
      }
    }
  }, {
    key: 'parseRow',
    value: function parseRow(row) {
      if (row[this.fetchedFields.id.alias] !== null) {
        return _extends({}, _lodash2['default'].mapValues(this.fetchedFields, function (_ref) {
          var alias = _ref.alias;
          var transform = _ref.transform;
          return transform ? transform(row[alias]) : row[alias];
        }), _lodash2['default'].mapValues(this.getFetchedChildren(), function (child) {
          return child.parseRow(row);
        }));
      } else {
        return null;
      }
    }
  }, {
    key: 'resolveSubsequentFetches',
    value: function resolveSubsequentFetches(rows) {
      var _this6 = this;

      var promises = [].concat(_toConsumableArray(_lodash2['default'].map(this.subsequentFetches, function (cfg, fieldName) {
        return _this6.model._resolver(fieldName).resolve(rows, cfg);
      })), _toConsumableArray(_lodash2['default'].map(this.getFetchedChildren(), function (child, fieldName) {
        return child.resolveSubsequentFetches(rows.map(function (row) {
          return row[fieldName];
        }).filter(_lodash2['default'].identity));
      })));
      return Promise.all(promises);
    }
  }, {
    key: 'resolveVirtualFields',
    value: function resolveVirtualFields(row) {
      var _this7 = this;

      if (row !== null) {
        _lodash2['default'].forEach(this.getFetchedChildren(), function (child, fieldName) {
          return child.resolveVirtualFields(row[fieldName]);
        });
        this.virtualFields.forEach(function (fieldName) {
          row[fieldName] = _this7.model.virtualFields[fieldName].getter.call(row);
        });
      }
    }
  }, {
    key: 'getFetchedChildren',
    value: function getFetchedChildren() {
      return (0, _lodash2['default'])(this.children).mapValues(function (c) {
        return c.scope;
      }).pick(function (s) {
        return s.isFetched;
      }).value();
    }
  }]);

  return Scope;
})();

var LOGICAL_OPERATORS = {
  $and: 'AND',
  $or: 'OR',
  $xor: 'XOR',
  $not: 'NOT'
};

var COMPARISON_OPERATORS = {
  $eq: '=',
  $ne: '!=',
  $gt: '>',
  $ge: '>=',
  $lt: '<',
  $le: '<=',
  $like: 'LIKE',
  $nlike: 'NOT LIKE',
  $in: 'IN',
  $nin: 'NOT IN'
};

var Parser = (function () {

  /**
   * @param {Scope} scope
   */

  function Parser(scope) {
    _classCallCheck(this, Parser);

    this.scope = scope;
  }

  _createClass(Parser, [{
    key: 'parseFilter',
    value: function parseFilter(where) {
      var normalized = Normalizer.predicate(where, {});
      return this.predicate(normalized, true);
    }
  }, {
    key: 'parseSelect',
    value: function parseSelect(select) {
      var expression = _lodash2['default'].isString(select) ? new _astJs.Field(select) : select;
      return this.expression(expression);
    }
  }, {
    key: 'parseOrder',
    value: function parseOrder(input) {
      var _this8 = this;

      return Normalizer.order(input).map(function (ordering) {
        return _this8.expression(ordering.expr) + ' ' + (ordering.asc ? 'ASC' : 'DESC');
      }).join(', ');
    }
  }, {
    key: 'parseGroup',
    value: function parseGroup(input) {
      var _this9 = this;

      return Normalizer.group(input).map(function (expr) {
        return _this9.expression(expr);
      }).join(', ');
    }

    /**
     * @param {Predicate} expr
     * @param {boolean} root
     * @return {string}
     */
  }, {
    key: 'predicate',
    value: function predicate(expr) {
      var root = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

      if (expr instanceof _astJs.Composition) {
        var composition = this.composition(expr);
        return root ? composition : '(' + composition + ')';
      } else if (expr instanceof _astJs.Negation) {
        return this.negation(expr);
      } else if (expr instanceof _astJs.Comparison) {
        return this.comparison(expr);
      } else {
        throw new Error('Unexpected token: ' + expr);
      }
    }

    /**
     * @param {Composition} composition
     * @return {string}
     */
  }, {
    key: 'composition',
    value: function composition(_composition) {
      var _this10 = this;

      return _composition.predicates.map(function (term) {
        return _this10.predicate(term);
      }).join(' ' + LOGICAL_OPERATORS[_composition.op] + ' ');
    }

    /**
     * @param {Negation} negation
     * @return {string}
     */
  }, {
    key: 'negation',
    value: function negation(_negation) {
      return 'NOT ' + this.predicate(_negation.predicate);
    }

    /**
     * @param {Comparison} comparison
     * @return {string}
     */
  }, {
    key: 'comparison',
    value: function comparison(_comparison) {
      if (_comparison.term2 !== null) {
        var operator = COMPARISON_OPERATORS[_comparison.operator];
        return this.expression(_comparison.term1) + ' ' + operator + ' ' + this.expression(_comparison.term2);
      } else if (_comparison.operator === _astJs.Op.EQ || _comparison.operator === _astJs.Op.NE) {
        return this.expression(_comparison.term1) + ' IS ' + (_comparison.operator === _astJs.Op.NE ? 'NOT ' : '') + 'NULL';
      } else {
        throw new Error('Invalid comparion [' + _comparison + ']');
      }
    }
  }, {
    key: 'expression',
    value: function expression(expr) {
      var _this11 = this;

      if (expr instanceof _astJs.Field) {
        return this.scope.resolveField(expr.fieldName);
      } else if (expr instanceof _astJs.Aggregate) {
        var distinct = expr.distinct ? 'DISTINCT ' : '';
        return expr.fn + '(' + distinct + this.expression(expr.expr) + ')';
      } else if (expr instanceof _astJs.FuncCall) {
        return expr.name + '(' + expr.args.map(function (arg) {
          return _this11.expression(arg);
        }).join(', ') + ')';
      } else if (expr instanceof _astJs.InfixOp) {
        return '(' + expr.operands.map(function (e) {
          return _this11.expression(e);
        }).join(' ' + expr.op + ' ') + ')';
      } else if (expr instanceof _astJs.Predicate) {
        return this.predicate(expr);
      } else if (_lodash2['default'].isArray(expr)) {
        return '(' + (0, _clientJs.escape)(expr) + ')';
      } else {
        return (0, _clientJs.escape)(expr);
      }
    }
  }]);

  return Parser;
})();

var Normalizer = {

  /**
   * @param predicates
   * @param {string} operator
   * @param {object} context
   * @return {Predicate|null}
   */
  composition: function composition(predicates, operator, context) {
    var normalizedPredicates = this.predicates(predicates, context);
    if (normalizedPredicates.length > 1) {
      var flattenedPredicates = (0, _lodash2['default'])(normalizedPredicates).map(function (predicate) {
        if (predicate instanceof _astJs.Composition && predicate.op === operator) {
          return predicate.predicates;
        } else {
          return predicate;
        }
      }).flatten().value();
      return new _astJs.Composition(operator, flattenedPredicates);
    } else if (normalizedPredicates.length === 1) {
      return normalizedPredicates[0];
    } else {
      return null;
    }
  },

  /**
   * @param predicate
   * @param {object} context
   * @return {Predicate}
   */
  negation: function negation(predicate, context) {
    var normalizedPredicate = this.predicate(predicate, context);
    if (normalizedPredicate instanceof _astJs.Negation) {
      return normalizedPredicate.predicate;
    } else {
      return new _astJs.Negation(normalizedPredicate);
    }
  },

  /**
   * @param predicates
   * @param {object} context
   * @return {Predicate[]}
   */
  predicates: function predicates(_predicates, context) {
    var _this12 = this;

    if (_lodash2['default'].isArray(_predicates)) {
      return _predicates.map(function (predicate) {
        return _this12.predicate(predicate, context);
      }).filter(_lodash2['default'].identity);
    } else if (_lodash2['default'].isPlainObject(_predicates)) {
      return _lodash2['default'].map(_predicates, function (value, key) {
        return _this12.predicateWithKey(value, key, context);
      }).filter(_lodash2['default'].identity);
    } else {
      throw new Error('Invalid predicates format: ' + _predicates);
    }
  },

  /**
   * @param value
   * @param {string} key
   * @param {object} context
   * @return {Predicate|null}
   */
  predicateWithKey: function predicateWithKey(value, key, context) {
    if (LOGICAL_OPERATORS[key]) {
      if (key === _astJs.Op.NOT) {
        return this.negation(value, context);
      } else {
        return this.composition(value, key, context);
      }
    } else if (COMPARISON_OPERATORS[key]) {
      if (context.comparisonOp || !context.fieldName) {
        throw new Error('Unexpected comparison operator: ' + key);
      }
      var newContext = Object.assign({}, context, { comparisonOp: key });
      return this.predicate(value, newContext);
    } else {
      var fieldName = context.fieldName ? context.fieldName + '.' + key : key;
      var newContext = Object.assign({}, context, { fieldName: fieldName });
      return this.predicate(value, newContext);
    }
  },

  /**
   * @param value
   * @param {object} context
   * @return {Predicate|null}
   */
  predicate: function predicate(value, context) {
    if (_lodash2['default'].isArray(value)) {
      if (context.comparisonOp && _lodash2['default'].includes([_astJs.Op.IN, _astJs.Op.NOT_IN], context.comparisonOp)) {
        return new _astJs.Comparison(context.comparisonOp, new _astJs.Field(context.fieldName), value);
      } else {
        return this.composition(value, _astJs.Op.AND, context);
      }
    } else if (_lodash2['default'].isPlainObject(value)) {
      return this.composition(value, _astJs.Op.AND, context);
    } else if (value instanceof _astJs.Composition) {
      return this.composition(value.predicates, value.op, context);
    } else if (value instanceof _astJs.Negation) {
      return this.negation(value.predicate, context);
    } else if (value instanceof _astJs.Comparison) {
      if (context.fieldName || context.comparisonOp) {
        throw new Error('Unexpected comparison object');
      }
      return value;
    } else {
      if (!context.fieldName) {
        throw new Error('Unexpected token: ' + value);
      }
      var op = context.comparisonOp || _astJs.Op.EQ;
      return new _astJs.Comparison(op, new _astJs.Field(context.fieldName), value);
    }
  },

  /**
   * @param input
   * @return {Ordering[]}
   */
  order: function order(input) {
    var orderings = _lodash2['default'].isArray(input) ? input : [input];

    return orderings.map(function (ordering) {
      if (_lodash2['default'].isString(ordering)) {
        var field = ordering[0] === '-' ? ordering.slice(1) : ordering;
        return new _astJs.Ordering(new _astJs.Field(field), ordering[0] !== '-');
      } else if (ordering instanceof _astJs.Ordering) {
        if (_lodash2['default'].isString(ordering.expr)) {
          return new _astJs.Ordering(new _astJs.Field(ordering.expr), ordering.asc);
        } else {
          return ordering;
        }
      } else if (ordering instanceof _astJs.Expression) {
        return new _astJs.Ordering(ordering);
      } else {
        throw new Error('Invalid order input: ' + ordering);
      }
    });
  },

  group: function group(input) {
    var expressions = _lodash2['default'].isArray(input) ? input : [input];

    return expressions.map(function (expr) {
      if (_lodash2['default'].isString(expr)) {
        return new _astJs.Field(expr);
      } else if (expr instanceof _astJs.Expression) {
        return expr;
      } else {
        throw new Error('Invalid group by input: ' + expr);
      }
    });
  }
};
module.exports = exports['default'];