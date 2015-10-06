
import _ from 'lodash';

/*
 * Implement Promise utilities
 */
export default {
  props(promises) {
    return new Promise((resolve, reject) => {
      let counter = 0;
      let isClosed = false;
      const output = {};

      _.forEach(promises, (promise, field) => {
        if (promise && _.isFunction(promise.then)) {
          counter++;
          promise.then(result => {
            counter--;
            output[field] = result;
            check();
          }).catch(error => {
            if (!isClosed) {
              reject(error);
              isClosed = true;
            }
          });
        } else {
          output[field] = promise;
        }
      });
      check();

      function check() {
        if (!isClosed && counter === 0) {
          resolve(output);
        }
      }
    });
  },

  join(...args) {
    const promises = args.slice(0, args.length - 1);
    const handler = args[args.length - 1];
    return Promise.all(promises).then(results => handler(...results));
  },
};
