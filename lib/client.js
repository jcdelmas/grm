
import mysql from 'mysql';

export function escape(value) {
  return mysql.escape(value);
}

export function escapeId(value) {
  return mysql.escapeId(value);
}

export default class Client {
  constructor(config) {
    this.pool = mysql.createPool(config);
  }

  query(query) {
    return new Promise((resolve, reject) => {
      this.pool.query(query, (err, rows) => {
        if (err) {
          reject(err);
        }

        resolve(rows);
      });
    });
  }

  escape = escape;
  escapeId = escapeId;
}
