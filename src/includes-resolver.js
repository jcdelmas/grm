
import _ from 'lodash';

export default class IncludesResolver {

  /**
   * @param {Model} model
   */
  static of(model) {
    return new IncludesResolver(model);
  }

  /**
   * @param {Model} model
   */
  constructor(model) {
    this.grm = model.orm;
    this.model = model;
  }

  /**
   * @param {array|object|boolean} userIncludes
   * @param {boolean} includeDefaults
   */
  resolve(userIncludes, includeDefaults = true) {
    if (_.isPlainObject(userIncludes)) {
      const relationsIncludes = _(userIncludes)
        .pick((cfg, fieldName) => (cfg === true || _.isPlainObject(cfg)) && this.model.relations[fieldName])
        .mapValues((cfg, fieldName) => {
          const relationModel = this.grm.registry.get(this.model.relations[fieldName].model);
          return IncludesResolver.of(relationModel).resolve(cfg, includeDefaults);
        }).value();
      const newIncludes = {
        ..._.omit(userIncludes, '$defaults'),
        ...relationsIncludes,
      };
      if ((!userIncludes.hasOwnProperty('$defaults') && includeDefaults) || userIncludes.$defaults) {
        return this._mergeIncludes(this.model.defaultIncludes, newIncludes);
      } else {
        return newIncludes;
      }
    } else if (userIncludes === true) {
      return this.model.defaultIncludes;
    } else if (_.isArray(userIncludes)) {
      const objectUserIncludes = userIncludes.reduce((acc, field) => {
        const fieldObject = field.split('.').reduceRight((acc2, token) => ({ [token]: acc2 }), true);
        return _.merge(acc, fieldObject);
      }, {});
      return this.resolve(objectUserIncludes, includeDefaults);
    } else {
      return {};
    }
  }

  mergeDependencies(includes) {
    return this._addMissingIds(this._mergeVirtualFieldsDependencies(includes));
  }

  /**
   * @param {Model} model
   * @param {object} includes
   * @return {object}
   */
  _mergeVirtualFieldsDependencies(includes) {
    return _(this.model.virtualFields)
        .filter((cfg, field) => includes[field])
        .map('dependsOn')
        .reduce((target, source) => {
          return this._mergeIncludes(target, this._fullResolve(source));
        }, includes);
  }

  _addMissingIds(includes) {
    return {
      ...includes,
      id: true,
      ..._(this.model.relations)
        .pick((cfg, field) => includes[field])
        .mapValues((cfg, field) => IncludesResolver.of(cfg.model)._addMissingIds(includes[field]))
        .value(),
    };
  }

  _fullResolve(includes) {
    return this._mergeVirtualFieldsDependencies(this.resolve(includes, false));
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
