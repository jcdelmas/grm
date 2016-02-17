
import query from './query-executor';
import sql from './ast';
import createResolver from './relation-resolvers';
import Promises from './utils/promises';

export default class Model {
  constructor(orm, name, cfg) {
    this.orm = orm;
    this.name = name;

    this.tableName = cfg.tableName;
    this.fields = cfg.fields;
    this.virtualFields = cfg.virtualFields;
    this.relations = cfg.relations;
    this.defaultIncludes = cfg.defaultIncludes;

    this._resolvers = {};
  }

  findById(id, includes = true) {
    return this.findOne({
      where: { id },
      includes: includes,
    });
  }

  findOne(q) {
    return this._query(q).then(rows => {
      if (rows.length > 1) {
        throw new Error(`More than 1 row returned`);
      }
      return rows.length === 1 ? rows[0] : null;
    });
  }

  findAll(q) {
    return this._query(q);
  }

  stream(q, batchSize = 50) {
    return this._query({
      ...q,
      stream: true,
      batchSize,
    });
  }

  count(where) {
    return this._query({ select: sql.count(sql.field('id')), where }).then((rows) => rows[0]);
  }

  countAndFindAll(q) {
    return Promises.props({
      count: this.count(q.where),
      rows: this.findAll(q),
    });
  }

  _query(q) {
    return query({
      ...q,
      model: this,
    });
  }

  _setDefaultIncludes(defaultIncludes) {
    this.defaultIncludes = defaultIncludes;
  }

  _resolver(fieldName) {
    if (!this._resolvers[fieldName]) {
      const relation = this.relations[fieldName];
      if (!relation) {
        throw new Error(`Model [${this.name}] has no relation named [${fieldName}]`);
      }
      this._resolvers[fieldName] = createResolver(this, fieldName, relation);
    }
    return this._resolvers[fieldName];
  }
}
