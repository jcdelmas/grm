import _ from 'lodash';
import IncludesResolver from '../includes-resolver';

export default (next) => (query) => {
  const scalarResult = query.select && !_.isPlainObject(query.select) && !_.isArray(query.select);
  const select = IncludesResolver.of(query.model).resolve(
    !scalarResult ? (query.select || query.includes || true) : { value: query.select },
    !query.select
  );

  const resultP = next({ ...query, select });
  if (scalarResult) {
    return resultP.then(rows => rows.map(r => r.value));
  } else {
    return resultP;
  }
};