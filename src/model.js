
import _ from 'lodash';
import decamelize from 'decamelize';

import { Relations } from './constants';
import createResolver from './relation-resolvers';
import Promises from './utils/promises';

export default class Model {
  constructor(orm, name, cfg) {
    this.orm = orm;
    this.name = name;
    this.cfg = cfg;

    this.tableName = this.cfg.tableName || underscore(this.name);

    this.fields = this.cfg.fields ? _.mapValues(cfg.fields, this._computeFieldCfg) : {};
    this.relations = this.cfg.relations ? _.mapValues(this.cfg.relations, this._computeRelationCfg) : {};
    this.virtualFields = this.cfg.virtualFields ? _.mapValues(this.cfg.virtualFields, this._computeVirtualFieldCfg) : {};

    this.defaultIncludes = this._resolveDefaultIncludes();

    this._resolvers = {};
  }

  findById(id, includes = true) {
    return this.orm.query(this, {
      where: { id },
      includes: includes,
    }).then(rows => {
      if (rows.length === 0) {
        throw new Error(`No ${this.name} found with id [${id}]`);
      }
      return rows[0];
    });
  }

  findOne(q) {
    return this.orm.query(this, q).then(rows => {
      if (rows.length > 1) {
        throw new Error(`More than 1 row returned`);
      }
      return rows[0];
    });
  }

  findAll(q) {
    return this.orm.query(this, q);
  }

  count(where) {
    return this.orm.query(this, { count: true, where }).then((rows) => rows[0]);
  }

  countAndFindAll(q) {
    return Promises.props({
      count: this.count(q.where),
      rows: this.findAll(q),
    });
  }

  _computeFieldCfg = (baseCfg, fieldName) => {
    const cfg = _.clone(baseCfg);
    if (!cfg.column) {
      cfg.column = underscore(fieldName);
    }
    return cfg;
  };

  _computeRelationCfg = (baseCfg, fieldName) => {
    const cfg = _.clone(baseCfg);

    if (cfg.through) {
      if (!cfg.type) {
        cfg.type = Relations.MANY_TO_MANY;
      }
      if (!cfg.sourceLink) {
        cfg.sourceLink = this.name.charAt(0).toLowerCase() + this.name.slice(1);
      }

      if (!cfg.targetLink) {
        cfg.targetLink = cfg.model.charAt(0).toLowerCase() + cfg.model.slice(1);
      }
    } else if (cfg.mappedBy) {
      if (!cfg.type) {
        cfg.type = Relations.ONE_TO_MANY;
      }
    } else {
      if (!cfg.type) {
        cfg.type = Relations.MANY_TO_ONE;
      }

      if (!cfg.foreignKey) {
        cfg.foreignKey = underscore(fieldName) + '_id';
      }
    }

    cfg.isCollection = cfg.type === Relations.MANY_TO_MANY || cfg.type === Relations.ONE_TO_MANY;

    if (!cfg.hasOwnProperty('required')) {
      cfg.required = false;
    }

    return cfg;
  };

  _computeVirtualFieldCfg = (baseCfg, fieldName) => {
    if (!baseCfg.hasOwnProperty('getter')) {
      throw new Error(`Virtual field [${fieldName}] of model [${this.name}] has no 'getter' property`);
    }
    if (typeof baseCfg.getter !== 'function') {
      throw new Error(`Getter property of virtual field [${fieldName}] in model [${this.name}] is not a function`);
    }
    const cfg = _.clone(baseCfg);
    if (!cfg.hasOwnProperty('include')) {
      cfg.include = !cfg.dependsOn || Object.keys(cfg.dependsOn).every(f => this.fields[f]);
    }
    return cfg;
  };

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

  _resolveDefaultIncludes() {
    return {
      ..._.mapValues(this.fields, () => true),
      ..._(this.relations).pick(r => r.foreignKey).mapValues(() => ({id: true})).value(),
      ..._(this.virtualFields).pick(cfg => cfg.include).mapValues(() => true).value(),
    };
  }
}

function underscore(s) {
  return decamelize(s, '_');
}
