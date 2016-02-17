import _ from 'lodash';
import decamelize from 'decamelize';

import { Relations } from './constants';

import Model from './model';

export default class ModelFactory {
  constructor(orm, name, cfg) {
    this.orm = orm;
    this.name = name;
    this.cfg = cfg;
  }

  resolve() {
    this.tableName = this.cfg.tableName || underscore(this.name);
    this.fields = this.cfg.fields ? _.mapValues(this.cfg.fields, this._computeFieldCfg) : {};
    this.virtualFields = this.cfg.virtualFields ? _.mapValues(this.cfg.virtualFields, this._computeVirtualFieldCfg) : {};
    this._computeVirtualFieldsLevel();
    this.relations = {};

    const model = new Model(this.orm, this.name, {
      tableName: this.tableName,
      fields: this.fields,
      virtualFields: this.virtualFields,
      relations: this.relations,
    });

    this._resolveRelationCfgs().then(() => {
      model._setDefaultIncludes(this._resolveDefaultIncludes());
    });

    return model;
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
            this.relations[fieldName] = this._resolveMappedRelationCfg(userCfg, reverseRelation);
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

  _resolveMappedRelationCfg(userCfg, reverseRelation) {
    const cfg = _.clone(userCfg);

    cfg.type = ModelFactory._relationTypeMapping[reverseRelation.type];

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

  _resolveDefaultIncludes() {
    return {
      ..._.mapValues(this.fields, () => true),
      ..._(this.relations).pick(r => r.foreignKey).mapValues(() => ({ id: true })).value(),
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
