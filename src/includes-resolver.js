
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
        .pick((cfg, fieldName) => model.relations[fieldName])
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
    } else {
      return {};
    }
  }

  /**
   * @param {Model} model
   * @param {object} includes
   * @return {object}
   */
  mergeVirtualFieldsDependencies(model, includes) {
    return _(model.virtualFields)
        .filter((cfg, field) => includes[field])
        .map('dependsOn')
        .reduce((target, source) => {
          return this._mergeIncludes(target, this._fullResolve(model, source));
        }, includes);
  }

  _fullResolve(model, includes) {
    return this.mergeVirtualFieldsDependencies(model, this.resolve(model, includes, false));
  }

  _mergeIncludes(target, source) {
    return {
      ...target,
      ..._.mapValues(source, (value, key) => {
        if (!target[key] || target[key] === true) {
          return source[key];
        } else if (_.isObject(source[key])) {
          return this._mergeIncludes(target[key], source[key]);
        } else {
          return target[key];
        }
      })
    }
  }
}