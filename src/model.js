
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
    this.virtualFields = this.cfg.virtualFields ? _.mapValues(this.cfg.virtualFields, this._computeVirtualFieldCfg) : {};

    this._computeVirtualFieldsLevel();

    this.relations = {};

    this._resolvers = {};

    this._resolveRelationCfgs().then(() => {
      this.defaultIncludes = this._resolveDefaultIncludes();
    });
  }

  findById(id, includes = true) {
    return this.findOne({
      where: { id },
      includes: includes,
    });
  }

  findOne(q) {
    return this.orm.query(this, q).then(rows => {
      if (rows.length > 1) {
        throw new Error(`More than 1 row returned`);
      }
      return rows.length === 1 ? rows[0] : null;
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

  _resolveRelationCfgs() {
    if (this.cfg.relations) {
      return Promise.all(_(this.cfg.relations).map((userCfg, fieldName) => {
        if (userCfg.mappedBy) {
          return this.orm.registry.getAsync(userCfg.model).then(targetModel => {
            const reverseRelation = targetModel.relations[userCfg.mappedBy];
            this.relations[fieldName] = this._resolveMappedRelationCfg(userCfg, fieldName, reverseRelation);
          });
        } else {
          this.relations[fieldName] = this._resolveSimpleRelationCfg(userCfg, fieldName);
        }
      }).compact().value());
    } else {
      return Promise.resolve();
    }
  }

  static _relationTypeMapping = {
    [Relations.MANY_TO_ONE]: Relations.ONE_TO_MANY,
    [Relations.ONE_TO_MANY]: Relations.MANY_TO_ONE,
    [Relations.MANY_TO_MANY]: Relations.MANY_TO_MANY,
    [Relations.ONE_TO_ONE]: Relations.ONE_TO_ONE,
  };

  _resolveMappedRelationCfg(userCfg, fieldName, reverseRelation) {
    const cfg = _.clone(userCfg);

    cfg.type = Model._relationTypeMapping[reverseRelation.type];

    if (reverseRelation.through) {
      cfg.through = reverseRelation.through;
      cfg.sourceLink = reverseRelation.targetLink;
      cfg.targetLink = reverseRelation.sourceLink;
    }

    return this._commonRelationResolving(cfg);
  }

  _resolveSimpleRelationCfg(userCfg, fieldName) {
    const cfg = _.clone(userCfg);

    if (cfg.through) {
      cfg.type = cfg.type || Relations.MANY_TO_MANY;
      cfg.sourceLink = cfg.sourceLink || this.name.charAt(0).toLowerCase() + this.name.slice(1);
      cfg.targetLink = cfg.targetLink || cfg.model.charAt(0).toLowerCase() + cfg.model.slice(1);
    } else {
      cfg.type = cfg.type || Relations.MANY_TO_ONE;
      cfg.foreignKey = cfg.foreignKey || underscore(fieldName) + '_id';
    }

    return this._commonRelationResolving(cfg);
  }

  _commonRelationResolving(cfg) {
    cfg.isCollection = cfg.type === Relations.MANY_TO_MANY || cfg.type === Relations.ONE_TO_MANY;

    if (!cfg.hasOwnProperty('required')) {
      cfg.required = false;
    }

    return cfg;
  }

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

  _computeVirtualFieldsLevel() {
    Object.keys(this.virtualFields).forEach(fieldName => this._computeVirtualFieldLevel(fieldName));
  }

  _computeVirtualFieldLevel(name) {
    const virtualField = this.virtualFields[name];
    if (!virtualField.hasOwnProperty('level')) {
      if (virtualField.dependsOn) {
        const fields = _.isArray(virtualField.dependsOn) ? virtualField.dependsOn : Object.keys(virtualField.dependsOn);
        virtualField.level = _(fields)
          .filter(field => this.virtualFields[field])
          .map(field => this._computeVirtualFieldLevel(field))
          .reduce((a, b) => Math.max(a, b), -1) + 1;
      } else {
        virtualField.level = 0;
      }
    }
    return virtualField.level;
  }
}

function underscore(s) {
  return decamelize(s, '_');
}
