'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

/*
 * Implement Promise utilities
 */
exports['default'] = {
  props: function props(promises) {
    return new Promise(function (resolve, reject) {
      var counter = 0;
      var isClosed = false;
      var output = {};

      _lodash2['default'].forEach(promises, function (promise, field) {
        if (promise && _lodash2['default'].isFunction(promise.then)) {
          counter++;
          promise.then(function (result) {
            counter--;
            output[field] = result;
            check();
          })['catch'](function (error) {
            if (!isClosed) {
              reject(error);
              isClosed = true;
            }
          });
        } else {
          output[field] = promise;
        }
      });
      check();

      function check() {
        if (!isClosed && counter === 0) {
          resolve(output);
        }
      }
    });
  },

  join: function join() {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    var promises = args.slice(0, args.length - 1);
    var handler = args[args.length - 1];
    return Promise.all(promises).then(function (results) {
      return handler.apply(undefined, _toConsumableArray(results));
    });
  }
};
module.exports = exports['default'];