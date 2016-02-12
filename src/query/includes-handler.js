import _ from 'lodash';
import IncludesResolver from '../includes-resolver';

import mapRows from './map-rows';

export default (next) => (query) => {
  const scalarResult = query.select && !_.isPlainObject(query.select) && !_.isArray(query.select);
  const select = IncludesResolver.of(query.model).resolve(
    !scalarResult ? (query.select || query.includes || true) : { value: query.select },
    !query.select
  );

  const result = next({ ...query, select });
  if (scalarResult) {
    return mapRows(result, row => row.value);
  } else {
    return result;
  }
};