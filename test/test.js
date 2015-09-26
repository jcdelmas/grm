
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
    login: {},
    email: {},
    age: {},
  },
});

const data = {
  persons: [
      ['John',     'Doe',     'jdoe',     'john.doe@msn.com',          20],
      ['Brad',     'Smith',   'bsmith',   'brad.smith@yahoo.com',      64],
      ['Lauren',   'Carter',  'lcarter',  'lauren.carter@hotmail.com', 37],
      ['Robert',   'Johnson', 'rjohnson', 'robert.johnson@gmail.com',  17],
      ['Patricia', 'Moore',   'pmoore',   'patricia.moore@gmail.com',  53],
      ['John',     'Brown',   'jbrown',   'john.brown@gmail.com',      28],
  ],
};

before(async () => {
  await client.query(`DROP TABLE IF EXISTS person`);
  await client.query(`
    CREATE TABLE person (
      id int(11) NOT NULL AUTO_INCREMENT,
      firstname varchar(50) NOT NULL,
      lastname varchar(50) NOT NULL,
      login varchar(50) UNIQUE NOT NULL,
      email varchar(100) UNIQUE NOT NULL,
      age int NOT NULL,
      PRIMARY KEY (id)
    )
  `);
  await client.query(`
    INSERT INTO person (firstname, lastname, login, email, age)
    VALUES ${data.persons.map(person => '(' + person.map(client.escape).join(', ') + ')').join(', ')}
  `);
});

describe('Model', () => {
  describe('#findAll', () => {
    it('should return all rows from table', async () => {
      const rows = await Person.findAll();
      const persons = rows.map(({ firstname, lastname, login, email, age }) => [firstname, lastname, login, email, age]);
      persons.should.be.eql(data.persons);
    });

    it('should filter rows properly 1', async () => {
      const rows = await Person.findAll({ where: { age: { $gt: 30 } } });
      rows.map(r => r.login).should.be.eql([
        'bsmith',
        'lcarter',
        'pmoore',
      ]);
    });

    it('should sort rows properly', async () => {
      const rows = await Person.findAll({ order: 'age' });
      rows.map(r => r.login).should.be.eql([
        'rjohnson',
        'jdoe',
        'jbrown',
        'lcarter',
        'pmoore',
        'bsmith',
      ]);
    });

    it('should sort rows properly (desc)', async () => {
      const rows = await Person.findAll({
        where: { age: { $gt: 30 } },
        order: '-age',
      });
      rows.map(r => r.login).should.be.eql([
        'bsmith',
        'pmoore',
        'lcarter',
      ]);
    });

    it('should sort rows properly (multiple)', async () => {
      const rows = await Person.findAll({
        order: [ 'firstname', 'lastname' ],
      });
      rows.map(r => r.login).should.be.eql([
        'bsmith',
        'jbrown',
        'jdoe',
        'lcarter',
        'pmoore',
        'rjohnson',
      ]);
    });

    it('should filter rows properly (and)', async () => {
      const rows = await Person.findAll({
        where: {
          age: { $lt: 30 },
          email: { $like: '%@gmail.com' },
        },
        order: 'id',
      });
      rows.map(r => r.login).should.be.eql([
        'rjohnson',
        'jbrown',
      ]);
    });

    it('should filter rows properly (or)', async () => {
      const rows = await Person.findAll({
        where: {
          $or: {
            age: { $gt: 60 },
            email: { $like: '%@hotmail.com' },
          },
        },
        order: 'id',
      });
      rows.map(r => r.login).should.be.eql([
        'bsmith',
        'lcarter',
      ]);
    });

    it('should filter rows properly (and, or, not)', async () => {
      const rows = await Person.findAll({
        where: {
          age: { $le: 50 },
          $or: {
            age: 20,
            email: { $like: '%@gmail.com' },
          },
        },
        order: 'id',
      });
      rows.map(r => r.login).should.be.eql([
        'jdoe',
        'rjohnson',
        'jbrown',
      ]);
    });
  });
});
