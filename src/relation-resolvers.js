

import _ from 'lodash';
import { Relations } from './constants.js';

const BATCH_SIZE = 20;

export default (model, fieldName) => {
  const relation = model.relations[fieldName];
  switch (relation.type) {
    case Relations.MANY_TO_MANY:
      return new ManyToManyResolver(model, fieldName, relation);
    case Relations.ONE_TO_MANY:
      return new OneToManyResolver(model, fieldName, relation);
    default:
      throw new Error('Not supported');
  }
};

class ManyToManyResolver {
  constructor(model, fieldName, relation) {
    this.orm = model.orm;
    this.model = model;
    this.fieldName = fieldName;
    this.relation = relation;
    this.throughModel = this.orm.registry.get(this.relation.through);
  }

  resolve(rows, select) {
    rows.forEach(p => p[this.fieldName] = []);
    const groupedRows = _.groupBy(rows, 'id');

    const promises = _(groupedRows).keys().chunk(BATCH_SIZE).map(ids => {
      const params = this.getParams({ $in: ids }, select);
      return this.throughModel.findAll(params).then(links => {
        const targetRows = _(links).map(this.relation.targetLink).uniq('id').value();
        const indexedTargetRows = _.indexBy(targetRows, 'id');
        links.forEach(link => {
          groupedRows[link[this.relation.sourceLink].id].forEach(row => {
            row[this.fieldName].push(indexedTargetRows[link[this.relation.targetLink].id]);
          });
        });
      });
    }).value();
    return Promise.all(promises);
  }

  getParams(filter, select) {
    const params = {
      where: {},
      select: {},
    };
    params.select[this.relation.sourceLink] = { id: true };
    params.select[this.relation.targetLink] = select;
    if (this.relation.order) {
      params.order = this.relation.order;
    }
    params.where[this.relation.sourceLink + '.id'] = filter;
    return params;
  }
}

class OneToManyResolver {
  constructor(model, fieldName, relation) {
    this.orm = model.orm;
    this.model = model;
    this.fieldName = fieldName;
    this.relation = relation;
    this.targetModel = this.orm.registry.get(relation.model);
  }

  resolve(rows, select) {
    rows.forEach(p => p[this.fieldName] = []);
    const groupedRows = _.groupBy(rows, 'id');
    const promises = _(groupedRows).keys().chunk(BATCH_SIZE).map(ids => {
      const params = this.getParams({ $in: ids }, select);
      return this.targetModel.findAll(params).then(targetRows => {
        targetRows.forEach(targetRow => {
          groupedRows[targetRow[this.relation.mappedBy].id].forEach(row => {
            row[this.fieldName].push(targetRow);
          });
        });
      });
    }).value();
    return Promise.all(promises);
  }

  getParams(filter, select) {
    const params = {
      where: {},
      select,
    };
    if (this.relation.order) {
      params.order = this.relation.order;
    }
    params.where[this.relation.mappedBy + '.id'] = filter;
    return params;
  }
}
