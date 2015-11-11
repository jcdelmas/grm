
export default function withLogger(client) {
  return new ClientLogger(client);
}

class ClientLogger {
  constructor(client) {
    this.client = client;
  }

  query(query) {
    const startAt = process.hrtime();
    return this.client.query(query).then(result => {
      const endAt = process.hrtime();
      const ms = (endAt[0] - startAt[0]) * 1e3 + (endAt[1] - startAt[1]) * 1e-6;
      const time = ms.toFixed(3);
      console.log(`${time}ms - ${query}`);
      return result;
    }).catch(e => {
      console.log(`Failed - ${query}`);
      throw e;
    });
  }
}
