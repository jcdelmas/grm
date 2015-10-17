'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports['default'] = lazy;

function lazy(fn) {
  var value = undefined;
  var resolved = false;
  var resolving = false;
  return function () {
    if (resolving) {
      throw new Error('Recursive lazy value');
    }
    if (!resolved) {
      resolving = true;
      value = fn();
      resolving = false;
      resolved = true;
    }
    return value;
  };
}

module.exports = exports['default'];