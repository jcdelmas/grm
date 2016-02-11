
import _ from 'lodash';

import Model from './model';
import Client from './client';
import withLogger from './client-logger';
import Registry from './registry';
import queryHandlerFactory from './query-handler';
import IncludesResolver from './includes-resolver';

const DEFAULT_CONFIG = {
  host: 'localhost',
  logging: false,
};

export default class Grm {
  constructor(config) {
    this.config = _.defaults(config, DEFAULT_CONFIG);
    this.registry = new Registry();
    this.client = this._createClient();
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

  _createClient() {
    const client = new Client(this.config);
    return this.config.logging ? withLogger(client) : client;
  }
}
