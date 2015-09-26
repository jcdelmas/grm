
import should from 'should';

import Groom from '../index.js';

const groom = new Groom({
  user: 'root',
  password: 'root',
  database: 'groom',
  logging: false,
});

const client = groom.client;

const Person = groom.define('Person', {
  fields: {
    id: {},
    firstname: {},
    lastname: {},
  },
});

const data = {
  persons: [
      ['John', 'Doe'],
      ['Brad', 'Smith'],
  ],
};

before(async () => {
  await client.query(`DROP TABLE IF EXISTS person`);
  await client.query(`
    CREATE TABLE person (
      id int(11) NOT NULL AUTO_INCREMENT,
      firstname varchar(45) NOT NULL,
      lastname varchar(45) NOT NULL,
      PRIMARY KEY (id)
    )
  `);
  await client.query(`
    INSERT INTO person (firstname, lastname)
    VALUES ${data.persons.map(person => '(' + person.map(client.escape).join(', ') + ')').join(', ')}
  `);
});

describe('Model', () => {
  describe('#findAll', () => {
    it('should return all rows from table', async () => {
      const rows = await Person.findAll();
      const persons = rows.map(({ firstname, lastname }) => [firstname, lastname]);
      should(persons).deepEqual(data.persons);
    });
  });
});
