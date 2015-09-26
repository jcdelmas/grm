
import _ from 'lodash';
import { escape } from './client.js';
import {
  Op,
  Predicate,
  Composition,
  Negation,
  Comparison,
  Expression,
  Field,
  Aggregate,
  FuncCall,
  InfixOp,
  Ordering,
} from './ast.js';

export default (orm) => (model, query) => {
  return new QueryHandler(orm, model, query).execute();
};

/**
 * @typedef {(Composition|Negation|Comparison)} Predicate
 */

class QueryHandler {
  /**
   * @param {Orm} orm
   * @param {Model} model
   * @param {object} query
   */
  constructor(orm, model, query = {}) {
    this.orm = orm;
    this.model = model;
    this.query = query;

    this.fields = {};
    this.aliasCounter = 0;

    this.rootScope = new Scope(this, model, query.includes || true);

    this.parser = new Parser(this);

    this.distinctRows = false;
  }

  execute() {
    const wherePart = this.query.where ? this.parser.parseFilter(this.query.where) : null;

    const orderPart = this.query.order ? this.parser.parseOrder(this.query.order) : null;

    const groupPart = this.query.group ? this.parser.parsegroup(this.query.group) : null;

    const havingPart = this.query.having ? this.parser.parseFilter(this.query.having) : null;

    const qb = [];
    qb.push('SELECT ');
    qb.push(this.resolveSelect());
    qb.push(' FROM ');
    qb.push(this.rootScope.tableReference);
    this.rootScope.resolveJoins().forEach(join => qb.push(join));

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

    const query = qb.join('');
    if (this.orm.config.logging) {
      console.log(query);
    }
    const rowParser = this.rowParser();
    return this.orm.client.query(query).then(rawResults => {
      const rows = rawResults.map(rowParser);
      if (this.hasModelResult()) {
        return this.rootScope.resolveSubsequentFetches(rows).then(() => {
          rows.forEach(row => this.rootScope.resolveVirtualFields(row));
          return rows;
        });
      } else {
        return rows;
      }
    });
  }

  nextAlias() {
    const alias = '_' + this.aliasCounter;
    this.aliasCounter++;
    return alias;
  }

  rowParser() {
    if (this.query.count || this.query.select) {
      return this.hasScalarResult() ? row => row.value : _.identity;
    } else {
      return row => this.rootScope.parseRow(row);
    }
  }

  resolveSelect() {
    if (this.query.count) {
      const distinct = this.distinctRows ? 'DISTINCT ' : '';
      return `COUNT(${distinct}${this.resolveField('id')}) AS value`;
    } else if (this.query.select) {
      return this.parseSelect(this.query.select).join(', ');
    } else {
      return (this.distinctRows ? 'DISTINCT ' : '') + this.rootScope.resolveSelect().join(', ');
    }
  }

  resolveField(fieldName) {
    return this.rootScope.resolveField(fieldName);
  }

  parseSelect(select) {
    if (_.isPlainObject(select)) {
      return _.map(select, (value, key) => this.parser.parseSelect(value) + ` AS "${key}"`);
    } else if (_.isArray(select)) {
      return select.map(value => this.parser.parseSelect(value) + ` AS "${value}"`);
    } else if (_.isString(select)) {
      return [ this.parser.parseSelect(select) + ' AS value' ];
    } else {
      throw new Error(`Invalid select value [${select}]`);
    }
  }

  hasScalarResult() {
    return this.query.count || (this.query.select && _.isString(this.query.select));
  }

  hasModelResult() {
    return !this.query.count && !this.query.select;
  }
}

class Scope {
  /**
   * @param {QueryHandler} queryHandler
   * @param {Model} model
   * @param {object} includes
   * @param {Scope|null} parent
   * @param {string|null} fieldName
   */
  constructor(queryHandler, model, includes, parent = null, fieldName = '') {
    this.orm = queryHandler.orm;
    this.queryHandler = queryHandler;
    this.model = model;
    this.alias = queryHandler.nextAlias();
    this.children = {};
    this.subsequentFetches = {};
    this.fullFieldName = parent ? parent.fullFieldName + '.' + fieldName : '';
    this.fetchedFields = {};
    this.linkFields = {};
    this.virtualFields = _(this.model.virtualFields).pick(cfg => cfg.include).keys().value();
    this.tableReference = `${this.model.escapedTableName} AS ${this.alias}`;

    this.readIncludes(includes);
  }

  readIncludes(includes) {
    if (_.isPlainObject(includes)) {
      const fullIncludes = _(this.model.virtualFields)
        .filter((cfg, field) => includes[field])
        .map('dependsOn')
        .reduce(this.mergeIncludes, _.cloneDeep(includes));

      _.forEach(fullIncludes, (fieldIncludes, fieldName) => {
        if (fieldIncludes) {
          if (this.model.relations[fieldName]) {
            const relation = this.model.relations[fieldName];
            if (!relation.isCollection) {
              this.resolveScope(fieldName, true, fieldIncludes);
            } else {
              this.subsequentFetches[fieldName] = fieldIncludes;
            }
          } else if (this.model.virtualFields[fieldName]) {
            this.virtualFields.push(fieldName);
          } else {
            throw new Error(`Unknown field [${fieldName}] for model [${this.model.name}]`);
          }
        }
      });
    }
  }

  mergeIncludes(target, source) {
    _.forEach(source, (value, key) => {
      if (!target[key] || target[key] === true) {
        target[key] = source[key];
      } else if (_.isObject(source[key])) {
        target[key] = this.mergeIncludes(target[key], source[key]);
      }
    });
    return target;
  }

  resolveJoins() {
    return _(this.children).map(child => {
      return [
        ...child.joins,
        ...child.scope.resolveJoins(),
      ];
    }).flatten().value();
  }

  resolveSelect() {
    return [
      ..._.map(this.model.fields, (fieldCfg, fieldName) => {
        const fieldAlias = this.queryHandler.nextAlias();
        this.fetchedFields[fieldName] = fieldAlias;
        return `${this.alias}.${fieldCfg.escapedColumn} AS ${fieldAlias}`;
      }),
      ..._(this.model.relations)
        .pick((relation, fieldName) => {
          return (!this.children[fieldName] || !this.children[fieldName].fetched) && relation.foreignKey;
        })
        .map((relation, fieldName) => {
          const fieldAlias = this.queryHandler.nextAlias();
          this.linkFields[fieldName] = fieldAlias;
          return `${this.alias}.${relation.escapedForeignKey} AS ${fieldAlias}`;
        }).value(),
      ..._(this.getFetchedChildren()).map(child => child.resolveSelect()).flatten().value(),
    ];
  }

  resolveField(fieldName) {
    const index = fieldName.indexOf('.');
    if (index !== -1) {
      const baseFieldName = fieldName.slice(0, index);
      const childFieldName = fieldName.slice(index + 1);
      if (childFieldName === 'id'
          && this.model.relations[baseFieldName]
          && this.model.relations[baseFieldName].foreignKey) {
        // avoid useless joins when possible
        const column = this.model.relations[baseFieldName].foreignKey;
        return `${this.alias}.${column}`;
      } else {
        return this.resolveScope(baseFieldName).resolveField(childFieldName);
      }
    } else if (this.model.fields[fieldName]) {
      const column = this.model.fields[fieldName].column;
      return `${this.alias}.${column}`;
    } else {
      throw new Error(`Unknown field [${fieldName}] in model [${this.model.name}]`);
    }
  }

  /**
   * @param {string} fieldName
   * @param {boolean} fetched
   * @param {object|boolean} includes
   * @return {Scope}
   */
  resolveScope(fieldName, fetched = false, includes = true) {
    if (!this.children[fieldName]) {
      if (this.model.relations[fieldName]) {
        const relation = this.model.relations[fieldName];
        const relationModel = this.orm.registry.get(relation.model);
        const scope = new Scope(this.queryHandler, relationModel, includes, this, fieldName);

        if (relation.isCollection) {
          this.queryHandler.distinctRows = true;
        }

        this.children[fieldName] = {
          scope: scope,
          fetched: fetched,
          joins: this.resolveRelationJoins(relation, scope),
        };
      } else {
        throw new Error(`Unknown relation [${fieldName}] for model [${this.model.name}]`);
      }
    }
    return this.children[fieldName].scope;
  }

  /**
   * @param relation
   * @param {Scope} scope
   */
  resolveRelationJoins(relation, scope) {
    const joinType = (relation.required ? 'INNER' : 'LEFT OUTER') + ' JOIN';
    if (relation.foreignKey) {
      return [
        ` ${relation.required ? 'INNER' : 'LEFT OUTER'} JOIN ${scope.tableReference}` +
        ` ON ${this.alias}.${relation.escapedForeignKey} = ${scope.alias}.id`,
      ];
    } else if (relation.through) {
      const linkModel = this.orm.registry.get(relation.through);
      const linkAlias = this.queryHandler.nextAlias();
      const sourceForeignKey = linkModel.relations[relation.sourceLink].escapedForeignKey;
      const targetForeignKey = linkModel.relations[relation.targetLink].escapedForeignKey;

      return [
        ` ${joinType} ${linkModel.escapedTableName} AS ${linkAlias}` +
        ` ON ${this.alias}.id = ${linkAlias}.${sourceForeignKey}`,
        ` ${joinType} ${scope.tableReference}` +
        ` ON ${linkAlias}.${targetForeignKey} = ${scope.alias}.id`,
      ];
    } else if (relation.mappedBy) {
      const targetModel = this.orm.registry.get(relation.model);
      const sourceForeignKey = targetModel.relations[relation.mappedBy].escapedForeignKey;
      return [
        ` ${joinType} ${scope.tableReference}` +
        ` ON ${this.alias}.id = ${scope.alias}.${sourceForeignKey}`,
      ];
    } else {
      throw new Error('Unexpected relation');
    }
  }

  parseRow(row) {
    const result = _.mapValues(this.fetchedFields, (alias, fieldName) => {
      const rawValue = row[alias];
      const fieldCfg = this.model.fields[fieldName];
      return fieldCfg.getter ? fieldCfg.getter(rawValue) : rawValue;
    });
    _.forEach(this.linkFields, (alias, fieldName) => {
      result[fieldName] = { id: row[alias] };
    });
    const relations = _.mapValues(this.getFetchedChildren(), child => child.parseRow(row));
    return Object.assign(result, relations);
  }

  resolveSubsequentFetches(rows) {
    const promises = [
      ..._.map(this.subsequentFetches, (cfg, fieldName) => this.model._resolver(fieldName).resolve(rows, cfg)),
      ..._.map(this.getFetchedChildren(), (child, fieldName) => {
        return child.resolveSubsequentFetches(rows.map(row => row[fieldName]));
      }),
    ];
    return Promise.all(promises);
  }

  resolveVirtualFields(row) {
    this.virtualFields.forEach(fieldName => {
      row[fieldName] = this.model.virtualFields[fieldName].getter.call(row);
    });
    _.forEach(this.getFetchedChildren(), (child, fieldName) => {
      return child.resolveVirtualFields(row[fieldName]);
    });
  }

  getFetchedChildren() {
    return _(this.children).pick(c => c.fetched).mapValues(c => c.scope).value();
  }
}

const LOGICAL_OPERATORS = {
  $and: 'AND',
  $or: 'OR',
  $xor: 'XOR',
  $not: 'NOT',
};

const COMPARISON_OPERATORS = {
  $eq: '=',
  $ne: '!=',
  $gt: '>',
  $ge: '>=',
  $lt: '<',
  $le: '<=',
  $like: 'LIKE',
  $nlike: 'NOT LIKE',
  $in: 'IN',
  $nin: 'NOT IN',
};

class Parser {

  /**
   * @param {QueryHandler} queryHandler
   */
  constructor(queryHandler) {
    this.queryHandler = queryHandler;
  }

  parseFilter(where) {
    const normalized = Normalizer.predicate(where, {});
    return this.predicate(normalized, true);
  }

  parseSelect(select) {
    const expression = _.isString(select) ? new Field(select) : select;
    return this.expression(expression);
  }

  parseOrder(input) {
    return Normalizer.order(input).map(ordering => {
      return `${this.expression(ordering.expr)} ${ordering.asc ? 'ASC' : 'DESC'}`;
    }).join(', ');
  }

  parsegroup(input) {
    return Normalizer.group(input).map(expr => this.expression(expr)).join(', ');
  }

  /**
   * @param {Predicate} expr
   * @param {boolean} root
   * @return {string}
   */
  predicate(expr, root = false) {
    if (expr instanceof Composition) {
      const composition = this.composition(expr);
      return root ? composition : '(' + composition + ')';
    } else if (expr instanceof Negation) {
      return this.negation(expr);
    } else if (expr instanceof Comparison) {
      return this.comparison(expr);
    } else {
      throw new Error('Unexpected token: ' + expr);
    }
  }

  /**
   * @param {Composition} composition
   * @return {string}
   */
  composition(composition) {
    return composition.predicates
      .map(term => this.predicate(term))
      .join(' ' + LOGICAL_OPERATORS[composition.op] + ' ');
  }

  /**
   * @param {Negation} negation
   * @return {string}
   */
  negation(negation) {
    return 'NOT ' + this.predicate(negation.predicate);
  }

  /**
   * @param {Comparison} comparison
   * @return {string}
   */
  comparison(comparison) {
    if (comparison.term2 !== null) {
      const operator = COMPARISON_OPERATORS[comparison.operator];
      return `${this.expression(comparison.term1)} ${operator} ${this.expression(comparison.term2)}`;
    } else if (comparison.operator === Op.EQ || comparison.operator === Op.NE) {
      return `${this.expression(comparison.term1)} IS ${comparison.operator === Op.NE ? 'NOT ' : ''}NULL`;
    } else {
      throw new Error(`Invalid comparion [${comparison}]`);
    }
  }

  expression(expr) {
    if (expr instanceof Field) {
      return this.queryHandler.resolveField(expr.fieldName);
    } else if (expr instanceof Aggregate) {
      const distinct = expr.distinct ? 'DISTINCT ' : '';
      return expr.fn + '(' + distinct + this.expression(expr.expr) + ')';
    } else if (expr instanceof FuncCall) {
      return expr.name + '(' + expr.args.map(arg => this.expression(arg)).join(', ')  + ')';
    } else if (expr instanceof InfixOp) {
      return '(' + expr.operands.map(e => this.expression(e)).join(' ' + expr.op + ' ') + ')';
    } else if (expr instanceof Predicate) {
      return this.predicate(expr);
    } else if (_.isArray(expr)) {
      return '(' + escape(expr) + ')';
    } else {
      return escape(expr);
    }
  }
}

const Normalizer = {

  /**
   * @param predicates
   * @param {string} operator
   * @param {object} context
   * @return {Predicate}
   */
  composition(predicates, operator, context) {
    const normalizedPredicates = this.predicates(predicates, context);
    if (normalizedPredicates.length > 1) {
      const flattenedPredicates = _(normalizedPredicates).map(predicate => {
        if (predicate instanceof Composition && predicate.op === operator) {
          return predicate.predicates;
        } else {
          return predicate;
        }
      }).flatten().value();
      return new Composition(
        operator,
        flattenedPredicates
      );
    } else if (normalizedPredicates.length === 1) {
      return normalizedPredicates[0];
    } else {
      throw new Error('Empty composition');
    }
  },

  /**
   * @param predicate
   * @param {object} context
   * @return {Predicate}
   */
  negation(predicate, context) {
    const normalizedPredicate = this.predicate(predicate, context);
    if (normalizedPredicate instanceof Negation) {
      return normalizedPredicate.predicate;
    } else {
      return new Negation(normalizedPredicate);
    }
  },

  /**
   * @param predicates
   * @param {object} context
   * @return {Predicate[]}
   */
  predicates(predicates, context) {
    if (_.isArray(predicates)) {
      return predicates.map(predicate => this.predicate(predicate, context));
    } else if (_.isPlainObject(predicates)) {
      return _.map(predicates, (value, key) => this.predicateWithKey(value, key, context));
    } else {
      throw new Error('Invalid predicates format: ' + predicates);
    }
  },

  /**
   * @param value
   * @param {string} key
   * @param {object} context
   * @return {Predicate}
   */
  predicateWithKey(value, key, context) {
    if (LOGICAL_OPERATORS[key]) {
      if (key === Op.NOT) {
        return this.negation(value, context);
      } else {
        return this.composition(value, key, context);
      }
    } else if (COMPARISON_OPERATORS[key]) {
      if (context.comparisonOp || !context.fieldName) {
        throw new Error('Unexpected comparison operator: ' + key);
      }
      const newContext = Object.assign({}, context, { comparisonOp: key });
      return this.predicate(value, newContext);
    } else {
      const fieldName = context.fieldName ? context.fieldName + '.' + key : key;
      const newContext = Object.assign({}, context, { fieldName });
      return this.predicate(value, newContext);
    }
  },

  /**
   * @param value
   * @param {object} context
   * @return {Predicate}
   */
  predicate(value, context) {
    if (_.isArray(value)) {
      if (context.comparisonOp && _.includes([Op.IN, Op.NOT_IN], context.comparisonOp)) {
        return new Comparison(context.comparisonOp, new Field(context.fieldName), value);
      } else {
        return this.composition(value, Op.AND, context);
      }
    } else if (_.isPlainObject(value)) {
      return this.composition(value, Op.AND, context);
    } else if (value instanceof Composition) {
      return this.composition(value.predicates, value.op, context);
    } else if (value instanceof Negation) {
      return this.negation(value.predicate, context);
    } else if (value instanceof Comparison) {
      if (context.fieldName || context.comparisonOp) {
        throw new Error('Unexpected comparison object');
      }
      return value;
    } else {
      if (!context.fieldName) {
        throw new Error('Unexpected token: ' + value);
      }
      const op = context.comparisonOp || Op.EQ;
      return new Comparison(op, new Field(context.fieldName), value);
    }
  },

  /**
   * @param input
   * @return {Ordering[]}
   */
  order(input) {
    const orderings = _.isArray(input) ? input : [ input ];

    return orderings.map(ordering => {
      if (_.isString(ordering)) {
        const field = ordering[0] === '-' ? ordering.slice(1) : ordering;
        return new Ordering(new Field(field), ordering[0] !== '-');
      } else if (ordering instanceof Ordering) {
        if (_.isString(ordering.expr)) {
          return new Ordering(new Field(ordering.expr), ordering.asc);
        } else {
          return ordering;
        }
      } else if (ordering instanceof Expression) {
        return new Ordering(ordering);
      } else {
        throw new Error('Invalid order input: ' + ordering);
      }
    });
  },

  group(input) {
    const expressions = _.isArray(input) ? input : [ input ];

    return expressions.map(expr => {
      if (_.isString(expr)) {
        return new Field(expr);
      } else if (expr instanceof Expression) {
        return expr;
      } else {
        throw new Error('Invalid group by input: ' + expr);
      }
    });
  },
};
