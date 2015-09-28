
import _ from 'lodash';

import Model from './model';
import Client from './client';
import Registry from './registry';
import queryHandlerFactory from './query-handler';

const DEFAULT_CONFIG = {
  host: 'localhost',
  logging: false,
};

export default class Grm {
  constructor(config) {
    this.config = _.defaults(config, DEFAULT_CONFIG);
    this.registry = new Registry();
    this.client = new Client(config);
    this.query = queryHandlerFactory(this);
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
    return require(filePath)(this);
  }
}
