'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Op = exports.Op = {
  // Logical
  AND: '$and',
  OR: '$or',
  XOR: '$xor',
  NOT: '$not',

  // Comparison
  EQ: '$eq',
  NE: '$ne',
  GT: '$gt',
  GE: '$ge',
  LT: '$lt',
  LE: '$le',
  IN: '$in',
  NOT_IN: '$nin',
  LIKE: '$like',
  NOT_LIKE: '$nlike',

  // Operators
  PLUS: '+',
  MINUS: '-',
  TIME: '*',
  DIV: '/',
  INT_DIV: 'DIV',
  MOD: '%'
};

var Expression = exports.Expression = function Expression() {
  _classCallCheck(this, Expression);
};

var Field = exports.Field = function (_Expression) {
  _inherits(Field, _Expression);

  function Field(fieldName) {
    _classCallCheck(this, Field);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Field).call(this));

    _this.fieldName = fieldName;
    return _this;
  }

  return Field;
}(Expression);

var Aggregate = exports.Aggregate = function (_Expression2) {
  _inherits(Aggregate, _Expression2);

  /**
   * @param {string} fn
   * @param {Expression} expr
   * @param {boolean} distinct
   */

  function Aggregate(fn, expr) {
    var distinct = arguments.length <= 2 || arguments[2] === undefined ? false : arguments[2];

    _classCallCheck(this, Aggregate);

    var _this2 = _possibleConstructorReturn(this, Object.getPrototypeOf(Aggregate).call(this));

    _this2.fn = fn;
    _this2.expr = expr;
    _this2.distinct = distinct;
    return _this2;
  }

  return Aggregate;
}(Expression);

var InfixOp = exports.InfixOp = function (_Expression3) {
  _inherits(InfixOp, _Expression3);

  /**
   * @param {string} op
   * @param {Expression[]} operands
   */

  function InfixOp(op, operands) {
    _classCallCheck(this, InfixOp);

    var _this3 = _possibleConstructorReturn(this, Object.getPrototypeOf(InfixOp).call(this));

    _this3.op = op;
    _this3.operands = operands;
    return _this3;
  }

  return InfixOp;
}(Expression);

var FuncCall = exports.FuncCall = function (_Expression4) {
  _inherits(FuncCall, _Expression4);

  /**
   * @param {string} name
   * @param {Expression[]} args
   */

  function FuncCall(name, args) {
    _classCallCheck(this, FuncCall);

    var _this4 = _possibleConstructorReturn(this, Object.getPrototypeOf(FuncCall).call(this));

    _this4.name = name;
    _this4.args = args;
    return _this4;
  }

  return FuncCall;
}(Expression);

var Predicate = exports.Predicate = function (_Expression5) {
  _inherits(Predicate, _Expression5);

  function Predicate() {
    _classCallCheck(this, Predicate);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(Predicate).apply(this, arguments));
  }

  return Predicate;
}(Expression);

var Composition = exports.Composition = function (_Predicate) {
  _inherits(Composition, _Predicate);

  /**
   * @param {string} op
   * @param {Predicate[]} predicates
   */

  function Composition(op, predicates) {
    _classCallCheck(this, Composition);

    var _this6 = _possibleConstructorReturn(this, Object.getPrototypeOf(Composition).call(this));

    _this6.op = op;
    _this6.predicates = predicates;
    return _this6;
  }

  return Composition;
}(Predicate);

var Negation = exports.Negation = function (_Predicate2) {
  _inherits(Negation, _Predicate2);

  /**
   * @param {Predicate} predicate
   */

  function Negation(predicate) {
    _classCallCheck(this, Negation);

    var _this7 = _possibleConstructorReturn(this, Object.getPrototypeOf(Negation).call(this));

    _this7.predicate = predicate;
    return _this7;
  }

  return Negation;
}(Predicate);

var Comparison = exports.Comparison = function (_Predicate3) {
  _inherits(Comparison, _Predicate3);

  /**
   * @param {string} operator
   * @param term1
   * @param term2
   */

  function Comparison(operator, term1, term2) {
    _classCallCheck(this, Comparison);

    var _this8 = _possibleConstructorReturn(this, Object.getPrototypeOf(Comparison).call(this));

    _this8.operator = operator;
    _this8.term1 = term1;
    _this8.term2 = term2;
    return _this8;
  }

  return Comparison;
}(Predicate);

var Ordering =
/**
 * @param {Expression} expr
 * @param {boolean} asc
 */
exports.Ordering = function Ordering(expr) {
  var asc = arguments.length <= 1 || arguments[1] === undefined ? true : arguments[1];

  _classCallCheck(this, Ordering);

  this.expr = expr;
  this.asc = asc;
};

exports.default = {
  and: function and() {
    for (var _len = arguments.length, predicates = Array(_len), _key = 0; _key < _len; _key++) {
      predicates[_key] = arguments[_key];
    }

    return new Composition(Op.AND, predicates);
  },
  or: function or() {
    for (var _len2 = arguments.length, predicates = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      predicates[_key2] = arguments[_key2];
    }

    return new Composition(Op.OR, predicates);
  },
  xor: function xor() {
    for (var _len3 = arguments.length, predicates = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
      predicates[_key3] = arguments[_key3];
    }

    return new Composition(Op.XOR, predicates);
  },
  not: function not(predicate) {
    return new Negation(predicate);
  },
  eq: function eq(term1, term2) {
    return new Comparison(Op.EQ, term1, term2);
  },
  ne: function ne(term1, term2) {
    return new Comparison(Op.NE, term1, term2);
  },
  gt: function gt(term1, term2) {
    return new Comparison(Op.GT, term1, term2);
  },
  ge: function ge(term1, term2) {
    return new Comparison(Op.GE, term1, term2);
  },
  lt: function lt(term1, term2) {
    return new Comparison(Op.LT, term1, term2);
  },
  le: function le(term1, term2) {
    return new Comparison(Op.LE, term1, term2);
  },
  in: function _in(term1, term2) {
    return new Comparison(Op.IN, term1, term2);
  },
  notIn: function notIn(term1, term2) {
    return new Comparison(Op.NOT_IN, term1, term2);
  },
  like: function like(term1, term2) {
    return new Comparison(Op.LIKE, term1, term2);
  },
  notLike: function notLike(term1, term2) {
    return new Comparison(Op.NOT_LIKE, term1, term2);
  },


  // expression function
  aggregate: function aggregate(name, expr) {
    var distinct = arguments.length <= 2 || arguments[2] === undefined ? false : arguments[2];

    return new Aggregate(name, expr, distinct);
  },
  count: function count(expr) {
    var distinct = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

    return this.aggregate('COUNT', expr, distinct);
  },
  avg: function avg(expr) {
    var distinct = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

    return this.aggregate('AVG', expr, distinct);
  },
  sum: function sum(expr) {
    var distinct = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

    return this.aggregate('SUM', expr, distinct);
  },
  min: function min(expr) {
    return this.aggregate('MIN', expr);
  },
  max: function max(expr) {
    return this.aggregate('MAX', expr);
  },


  // infix operators
  infix: function infix(op) {
    for (var _len4 = arguments.length, args = Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
      args[_key4 - 1] = arguments[_key4];
    }

    return new InfixOp(op, args);
  },
  plus: function plus() {
    for (var _len5 = arguments.length, args = Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
      args[_key5] = arguments[_key5];
    }

    return this.infix.apply(this, [Op.PLUS].concat(args));
  },
  minus: function minus() {
    for (var _len6 = arguments.length, args = Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
      args[_key6] = arguments[_key6];
    }

    return this.infix.apply(this, [Op.MINUS].concat(args));
  },
  time: function time() {
    for (var _len7 = arguments.length, args = Array(_len7), _key7 = 0; _key7 < _len7; _key7++) {
      args[_key7] = arguments[_key7];
    }

    return this.infix.apply(this, [Op.TIME].concat(args));
  },
  div: function div() {
    for (var _len8 = arguments.length, args = Array(_len8), _key8 = 0; _key8 < _len8; _key8++) {
      args[_key8] = arguments[_key8];
    }

    return this.infix.apply(this, [Op.DIV].concat(args));
  },
  intDiv: function intDiv() {
    for (var _len9 = arguments.length, args = Array(_len9), _key9 = 0; _key9 < _len9; _key9++) {
      args[_key9] = arguments[_key9];
    }

    return this.infix.apply(this, [Op.INT_DIV].concat(args));
  },
  mod: function mod() {
    for (var _len10 = arguments.length, args = Array(_len10), _key10 = 0; _key10 < _len10; _key10++) {
      args[_key10] = arguments[_key10];
    }

    return this.infix.apply(this, [Op.MOD].concat(args));
  },


  // functions
  fn: function fn(name) {
    for (var _len11 = arguments.length, args = Array(_len11 > 1 ? _len11 - 1 : 0), _key11 = 1; _key11 < _len11; _key11++) {
      args[_key11 - 1] = arguments[_key11];
    }

    return new FuncCall(name, args);
  },
  abs: function abs(arg) {
    return this.fn('ABS', arg);
  },
  round: function round(args) {
    return this.fn.apply(this, ['ROUND'].concat(_toConsumableArray(args)));
  },
  floor: function floor(arg) {
    return this.fn('FLOOR', arg);
  },
  ceil: function ceil(arg) {
    return this.fn('CEIL', arg);
  },
  sqrt: function sqrt(arg) {
    return this.fn('SQRT', arg);
  },
  rand: function rand(arg) {
    return this.fn('RAND', arg);
  },
  field: function field(name) {
    return new Field(name);
  },


  // ordering function
  asc: function asc(expr) {
    return new Ordering(expr);
  },
  desc: function desc(expr) {
    return new Ordering(expr, false);
  }
};