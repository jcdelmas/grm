
export default class Registry {
  constructor() {
    this.models = {};
  }

  get(name) {
    if (!this.models[name]) {
      throw new Error(`Unknown model [${name}]`);
    }
    return this.models[name];
  }

  contains(name) {
    return !!this.models[name];
  }

  register(name, model) {
    if (this.models[name]) {
      throw new Error(`Model [${name}] already defined`);
    }
    this.models[name] = model;
  }
}
