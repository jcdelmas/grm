
/**
 * @typedef {(Composition|Negation|Comparison)} Predicate
 */

export const Op = {
  AND: '$and',
  OR: '$or',
  XOR: '$xor',
  NOT: '$not',

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
};

export class Composition {
  /**
   * @param {string} op
   * @param {Predicate[]} predicates
   */
  constructor(op, predicates) {
    this.op = op;
    this.predicates = predicates;
  }
}

export class Negation {
  /**
   * @param {Predicate} predicate
   */
  constructor(predicate) {
    this.predicate = predicate;
  }
}

export class Comparison {
  /**
   * @param {string} operator
   * @param term1
   * @param term2
   */
  constructor(operator, term1, term2) {
    this.operator = operator;
    this.term1 = term1;
    this.term2 = term2;
  }
}

export class Expression {}

export class Field extends Expression {
  constructor(fieldName) {
    super();
    this.fieldName = fieldName;
  }
}

export class FuncCall extends Expression {
  /**
   * @param {string} fn
   * @param {Expression[]} args
   * @param {boolean} distinct
   */
  constructor(fn, args, distinct = false) {
    super();
    this.fn = fn;
    this.args = args;
    this.distinct = distinct;
  }
}

export class Ordering {
  /**
   * @param {Expression} expr
   * @param {boolean} asc
   */
  constructor(expr, asc = true) {
    this.expr = expr;
    this.asc = asc;
  }
}

export default {
  and(...predicates) {
    return new Composition(Op.AND, predicates);
  },
  or(...predicates) {
    return new Composition(Op.OR, predicates);
  },
  xor(...predicates) {
    return new Composition(Op.XOR, predicates);
  },
  not(predicate) {
    return new Negation(predicate);
  },

  eq(term1, term2) {
    return new Comparison(Op.EQ, term1, term2);
  },
  ne(term1, term2) {
    return new Comparison(Op.NE, term1, term2);
  },
  gt(term1, term2) {
    return new Comparison(Op.GT, term1, term2);
  },
  ge(term1, term2) {
    return new Comparison(Op.GE, term1, term2);
  },
  lt(term1, term2) {
    return new Comparison(Op.LT, term1, term2);
  },
  le(term1, term2) {
    return new Comparison(Op.LE, term1, term2);
  },
  in(term1, term2) {
    return new Comparison(Op.IN, term1, term2);
  },
  notIn(term1, term2) {
    return new Comparison(Op.NOT_IN, term1, term2);
  },
  like(term1, term2) {
    return new Comparison(Op.LIKE, term1, term2);
  },
  notLike(term1, term2) {
    return new Comparison(Op.NOT_LIKE, term1, term2);
  },

  // expression function
  fn(name, ...args) {
    return new FuncCall(name, args);
  },
  fnDistinct(name, arg) {
    return new FuncCall(name, [arg], true);
  },
  count(arg) {
    return new FuncCall('COUNT', [arg]);
  },
  countDistinct(arg) {
    return new FuncCall('COUNT', [arg], true);
  },
  field(name) {
    return new Field(name);
  },

  // ordering function
  asc(expr) {
    return new Ordering(expr);
  },
  desc(expr) {
    return new Ordering(expr, false);
  },
};
