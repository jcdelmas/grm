import includesHandler from './query/includes-handler';
import queryHandler from './query/query-handler';

export default (query) => {
  return includesHandler(queryHandler)(query);
};
