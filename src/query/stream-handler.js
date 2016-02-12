import { Readable } from 'stream';

export default (next) => (query) => {
  if (query.stream) {
    return new QueryStream(next, query);
  } else {
    return next(query);
  }
};

class QueryStream extends Readable {

  constructor(queryHandler, baseQuery) {
    super({ objectMode: true });
    this.queryHandler = queryHandler;
    this.addId = !baseQuery.select.id;

    this.baseQuery = !this.addId
      ? { ...baseQuery, order: 'id' }
      : { ...baseQuery, order: 'id', select: { ...baseQuery.select, id: true } };

    this.batchSize = baseQuery.batchSize || 50;
  }

  minId = 0;

  rows = [];
  rowsSize = 0;
  index = 0;
  hasMoreData = true;

  _read() {
    this._fetchRowsIfRequired()
      .then(this._readNextRow)
      .catch(e => this.emit('error', e));
  }

  _fetchRowsIfRequired() {
    if (this.index >= this.rowsSize && this.hasMoreData) {
      return this._fetchRows();
    } else {
      return Promise.resolve();
    }
  }

  _fetchRows() {
    const newWhere = this.baseQuery.where
      ? [this.baseQuery.where, { id: { $gt: this.minId } }]
      : { id: { $gt: this.minId } };
    return this.queryHandler({
      ...this.baseQuery,
      where: newWhere,
      limit: this.batchSize,
    }).then(rows => {
      this.rows = rows;
      this.rowsSize = rows.length;
      this.index = 0;
      this.hasMoreData = this.rowsSize === this.batchSize;
      if (this.rows.length) {
        this.minId = this.rows[this.rowsSize - 1].id;
      }
    });
  }

  _readNextRow = () => {
    if (this.index < this.rowsSize) {
      const row = this.rows[this.index++];
      if (this.addId) {
        delete row.id;
      }
      this.push(row);
    } else {
      this.push(null);
    }
  }
}
