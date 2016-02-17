
import _ from 'lodash';

import Model from './model';
import Client from './client';
import withLogger from './client-logger';
import Registry from './registry';

const DEFAULT_CONFIG = {
  host: 'localhost',
  logging: false,
};

export default class Grm {
  constructor(config) {
    this.config = _.defaults(config, DEFAULT_CONFIG);
    this.registry = new Registry();
    this.client = this._createClient();
  }

  define(name, config) {
    if (this.registry.contains(name)) {
      throw new Error(`Model [${name}] already defined`);
    }
    const model = new Model(this, name, config);
    this.registry.register(name, model);
    return model;
  }

  importFile(filePath) {
    const module = require(filePath);
    if (_.isFunction(module)) {
      return module(this);
    } else if (_.isFunction(module.default)) {
      return module.default(this);
    } else {
      throw new Error(`Invalid model file [${filePath}]. Function expected as default export.`);
    }
  }

  _createClient() {
    const client = new Client(this.config);
    return this.config.logging ? withLogger(client) : client;
  }
}
