
export default class Registry {
  constructor() {
    this.models = {};
    this.listeners = {};
  }

  get(name) {
    if (!this.models[name]) {
      throw new Error(`Unknown model [${name}]`);
    }
    return this.models[name];
  }

  getAsync(name) {
    return this.models[name] ?
      Promise.resolve(this.models[name]) :
      new Promise(resolve => this._addListener(name, resolve));
  }

  contains(name) {
    return !!this.models[name];
  }

  register(name, model) {
    if (this.models[name]) {
      throw new Error(`Model [${name}] already defined`);
    }
    this.models[name] = model;

    this.listeners[name] && this.listeners[name].forEach(cb => cb(model));
    delete this.listeners[name];
  }

  _addListener(name, cb) {
    if (!this.listeners[name]) {
      this.listeners[name] = [];
    }
    this.listeners.push(cb);
  }
}
