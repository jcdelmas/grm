
import 'should';

import Groom, { sql } from '../index.js';

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
    gender: {},
    age: {},
  },
});

const data = {
  persons: [
      ['John',     'Doe',     'jdoe',     'john.doe@msn.com',          'M', 20],
      ['Brad',     'Smith',   'bsmith',   'brad.smith@yahoo.com',      'M', 64],
      ['Lauren',   'Carter',  'lcarter',  'lauren.carter@hotmail.com', 'W', 37],
      ['Robert',   'Johnson', 'rjohnson', 'robert.johnson@gmail.com',  'M', 17],
      ['Patricia', 'Moore',   'pmoore',   'patricia.moore@gmail.com',  'W', 53],
      ['John',     'Brown',   'jbrown',   'john.brown@gmail.com',      'M', 28],
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
      gender char(1) NOT NULL,
      age int NOT NULL,
      PRIMARY KEY (id)
    )
  `);
  await client.query(`
    INSERT INTO person (firstname, lastname, login, email, gender, age)
    VALUES ${data.persons.map(person => '(' + person.map(client.escape).join(', ') + ')').join(', ')}
  `);
});

describe('Model', () => {
  describe('#findAll', () => {
    it('should return all rows from table', async () => {
      const rows = await Person.findAll();
      const persons = rows.map(
        ({ firstname, lastname, login, email, gender, age }) => [firstname, lastname, login, email, gender, age]
      );
      persons.should.be.eql(data.persons);
    });

    describe('sort', () => {
      it('basic', async () => {
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

      it('desc', async () => {
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

      it('multiple', async () => {
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
    });

    describe('filter', () => {
      it('basic', async () => {
        const rows = await Person.findAll({ where: { age: { $gt: 30 } } });
        rows.map(r => r.login).should.be.eql([
          'bsmith',
          'lcarter',
          'pmoore',
        ]);
      });

      it('and', async () => {
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

      it('or', async () => {
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

      it('and, or', async () => {
        const rows = await Person.findAll({
          where: {
            age: { $le: 50 },
            $not: {
              $or: {
                age: 20,
                email: { $like: '%@hotmail.com' },
              },
            },
          },
          order: 'id',
        });
        rows.map(r => r.login).should.be.eql([
          'rjohnson',
          'jbrown',
        ]);
      });
    });

    describe('select', () => {
      it('one', async () => {
        const rows = await Person.findAll({
          select: 'login',
          where: { age: { $lt: 30 } },
        });
        rows.should.be.eql([
          'jdoe',
          'rjohnson',
          'jbrown',
        ]);
      });

      it('multiple', async () => {
        const rows = await Person.findAll({
          select: [ 'login', 'age' ],
          where: { age: { $lt: 30 } },
        });
        rows.should.be.eql([
          { login: 'jdoe', age: 20 },
          { login: 'rjohnson', age: 17 },
          { login: 'jbrown', age: 28 },
        ]);
      });

      it('with aliases', async () => {
        const rows = await Person.findAll({
          select: { foo: 'login', bar: 'age' },
          where: { age: { $lt: 30 } },
        });
        rows.should.be.eql([
          { foo: 'jdoe', bar: 20 },
          { foo: 'rjohnson', bar: 17 },
          { foo: 'jbrown', bar: 28 },
        ]);
      });
    });

    describe('group', () => {
      it('count', async () => {
        const rows = await Person.findAll({
          select: { gender: 'gender', count: sql.count(sql.field('id')) },
          group: 'gender',
          order: sql.desc(sql.count(sql.field('id'))),
        });
        rows.should.be.eql([
          { gender: 'M', count: 4 },
          { gender: 'W', count: 2 },
        ]);
      });
      it('avg', async () => {
        const rows = await Person.findAll({
          select: { gender: 'gender', age: sql.avg(sql.field('age')) },
          group: 'gender',
          order: sql.desc(sql.count(sql.field('id'))),
        });
        rows.should.be.eql([
          { gender: 'M', age: 32.25 },
          { gender: 'W', age: 45 },
        ]);
      });
      it('having', async () => {
        const rows = await Person.findAll({
          select: { gender: 'gender', age: sql.avg(sql.field('age')) },
          group: 'gender',
          having: sql.gt(sql.avg(sql.field('age')), 40),
        });
        rows.should.be.eql([
          { gender: 'W', age: 45 },
        ]);
      });
    });

    describe('functions and operations', () => {
      it('minus', async () => {
        const rows = await Person.findAll({
          select: { login: 'login', age: sql.minus(sql.field('age'), 10) },
          where: { age: { $gt: 30 } },
          order: 'age',
        });
        rows.should.be.eql([
          { login: 'lcarter', age: 27 },
          { login: 'pmoore', age: 43 },
          { login: 'bsmith', age: 54 },
        ]);
      });

      // FIXME: replace 0 and 1 by boolean
      it('comparison', async () => {
        const rows = await Person.findAll({
          select: { login: 'login', young: sql.lt(sql.field('age'), 30) },
          order: 'login',
        });
        rows.should.be.eql([
          { login: 'bsmith', young: 0 },
          { login: 'jbrown', young: 1 },
          { login: 'jdoe', young: 1 },
          { login: 'lcarter', young: 0 },
          { login: 'pmoore', young: 0 },
          { login: 'rjohnson', young: 1 },
        ]);
      });

      it('floor', async () => {
        const rows = await Person.findAll({
          select: { gender: 'gender', age: sql.floor(sql.avg(sql.field('age'))) },
          group: 'gender',
          order: sql.desc(sql.count(sql.field('id'))),
        });
        rows.should.be.eql([
          { gender: 'M', age: 32 },
          { gender: 'W', age: 45 },
        ]);
      });
    });
  });
});
