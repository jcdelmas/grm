
import _ from 'lodash';

export default class IncludesResolver {
  /**
   * @param {Grm} grm
   */
  constructor(grm) {
    this.grm = grm;
  }

  /**
   * @param {Model} model
   * @param {object|boolean} userIncludes
   * @param {boolean} includeDefaults
   */
  resolve(model, userIncludes, includeDefaults = true) {
    if (_.isPlainObject(userIncludes)) {
      const relationsIncludes = _(userIncludes)
        .pick((cfg, fieldName) => (cfg === true || _.isPlainObject(cfg)) && model.relations[fieldName])
        .mapValues((cfg, fieldName) => {
          const relationModel = this.grm.registry.get(model.relations[fieldName].model);
          return this.resolve(relationModel, cfg, includeDefaults);
        }).value();
      const newIncludes = {
        ..._.omit(userIncludes, '$defaults'),
        ...relationsIncludes,
      };
      if ((!userIncludes.hasOwnProperty('$defaults') && includeDefaults) || userIncludes.$defaults) {
        return this._mergeIncludes(model.defaultIncludes, newIncludes);
      } else {
        return newIncludes;
      }
    } else if (userIncludes === true) {
      return model.defaultIncludes;
    } else if (_.isArray(userIncludes)) {
      const objectUserIncludes = userIncludes.reduce((acc, field) => {
        const fieldObject = field.split('.').reduceRight((acc2, token) => ({ [token]: acc2 }), true);
        return _.merge(acc, fieldObject);
      }, {});
      return this.resolve(model, objectUserIncludes, includeDefaults);
    } else {
      return {};
    }
  }

  mergeDependencies(model, includes) {
    return this._addMissingIds(model, this._mergeVirtualFieldsDependencies(model, includes));
  }

  /**
   * @param {Model} model
   * @param {object} includes
   * @return {object}
   */
  _mergeVirtualFieldsDependencies(model, includes) {
    return _(model.virtualFields)
        .filter((cfg, field) => includes[field])
        .map('dependsOn')
        .reduce((target, source) => {
          return this._mergeIncludes(target, this._fullResolve(model, source));
        }, includes);
  }

  _addMissingIds(model, includes) {
    return {
      ...includes,
      id: true,
      ..._(model.relations)
        .pick((cfg, field) => includes[field])
        .mapValues((cfg, field) => this._addMissingIds(cfg.model, includes[field]))
        .value(),
    };
  }

  _fullResolve(model, includes) {
    return this._mergeVirtualFieldsDependencies(model, this.resolve(model, includes, false));
  }

  _mergeIncludes(target, source) {
    return _.pick({
      ...target,
      ..._.mapValues(source, (value, key) => {
        if (_.isObject(target[key]) && _.isObject(source[key])) {
          return this._mergeIncludes(target[key], source[key]);
        } else {
          return source[key];
        }
      }),
    }, _.identity);
  }
}
