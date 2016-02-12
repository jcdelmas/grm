import streamMap from 'through2-map';
import { Readable } from 'stream';

export default (result, mapper) => {
  if (result instanceof Promise) {
    return result.then(rows => rows.map(mapper));
  }
  if (result instanceof Readable) {
    return result.pipe(streamMap(mapper));
  }
  throw new Error('Unexpected query result type');
}