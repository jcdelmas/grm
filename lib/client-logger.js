"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.default = withLogger;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function withLogger(client) {
  return new ClientLogger(client);
}

var ClientLogger = function () {
  function ClientLogger(client) {
    _classCallCheck(this, ClientLogger);

    this.client = client;
  }

  _createClass(ClientLogger, [{
    key: "query",
    value: function query(_query) {
      var startAt = process.hrtime();
      return this.client.query(_query).then(function (result) {
        var endAt = process.hrtime();
        var ms = (endAt[0] - startAt[0]) * 1e3 + (endAt[1] - startAt[1]) * 1e-6;
        var time = ms.toFixed(3);
        console.log(time + "ms - " + _query);
        return result;
      }).catch(function (e) {
        console.log("Failed - " + _query);
        throw e;
      });
    }
  }]);

  return ClientLogger;
}();