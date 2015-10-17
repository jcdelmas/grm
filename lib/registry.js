"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Registry = (function () {
  function Registry() {
    _classCallCheck(this, Registry);

    this.models = {};
    this.listeners = {};
  }

  _createClass(Registry, [{
    key: "get",
    value: function get(name) {
      if (!this.models[name]) {
        throw new Error("Unknown model [" + name + "]");
      }
      return this.models[name];
    }
  }, {
    key: "getAsync",
    value: function getAsync(name) {
      var _this = this;

      return this.models[name] ? Promise.resolve(this.models[name]) : new Promise(function (resolve) {
        return _this._addListener(name, resolve);
      });
    }
  }, {
    key: "contains",
    value: function contains(name) {
      return !!this.models[name];
    }
  }, {
    key: "register",
    value: function register(name, model) {
      if (this.models[name]) {
        throw new Error("Model [" + name + "] already defined");
      }
      this.models[name] = model;

      this.listeners[name] && this.listeners[name].forEach(function (cb) {
        return cb(model);
      });
      delete this.listeners[name];
    }
  }, {
    key: "_addListener",
    value: function _addListener(name, cb) {
      if (!this.listeners[name]) {
        this.listeners[name] = [];
      }
      this.listeners.push(cb);
    }
  }]);

  return Registry;
})();

exports["default"] = Registry;
module.exports = exports["default"];