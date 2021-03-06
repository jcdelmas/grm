import 'babel-polyfill';
import should from 'should';
import 'should-promised';
import _ from 'lodash';
import toArray from 'stream-to-array';

import Grm, { sql } from '../src/index.js';
import { escape } from '../src/client';

const grm = new Grm({
  user: 'root',
  password: 'root',
  database: 'grm',
  logging: false,
});

const client = grm.client;

const Person = grm.define('Person', {
  fields: {
    id: {},
    firstname: {},
    lastname: {},
    login: {},
    email: {},
    gender: {},
    age: {},
  },
  relations: {
    city: { model: 'City', required: true },
    religion: { model: 'Religion' },
    favoriteMovies: {
      model: 'Movie',
      through: 'FavoriteMovie',
      order: 'position',
    },
    favoriteOldMovies: {
      model: 'Movie',
      through: 'FavoriteMovie',
      order: 'position',
      where: {
        'movie.year': { $lt: 1990 },
      },
    },
  },
  virtualFields: {
    emailService: {
      dependsOn: { email: true },
      getter() {
        return this.email.match(/[^@]+@([^\.]+)\..+/)[1];
      },
    },
    favoriteMovieName: {
      dependsOn: { favoriteMovies: { name: true } },
      getter() {
        return this.favoriteMovies[0].name;
      },
    },
    favoriteMovieNameUpper: {
      dependsOn: { favoriteMovieName: true },
      getter() {
        return this.favoriteMovieName.toUpperCase();
      },
    },
  },
});

const City = grm.define('City', {
  fields: {
    id: {},
    name: {},
  },
  relations: {
    state: { model: 'State', required: true },
    inhabitants: {
      model: 'Person',
      mappedBy: 'city',
    },
  },
});

const State = grm.define('State', {
  fields: {
    id: {},
    name: {},
  },
  relations: {
    cities: {
      model: 'City',
      mappedBy: 'state',
      order: 'name',
    },
  },
});

grm.define('Religion', {
  fields: {
    id: {},
    name: {},
  },
  virtualFields: {
    lowerName: {
      dependsOn: { name: true },
      getter() {
        return this.name.toLowerCase();
      },
    },
  },
});

const Movie = grm.define('Movie', {
  fields: {
    id: {},
    name: {},
    year: {},
  },
  relations: {
    fans: {
      model: 'Person',
      mappedBy: 'favoriteMovies',
    },
  },
});

grm.define('FavoriteMovie', {
  fields: {
    position: {},
  },
  relations: {
    person: { model: 'Person', required: true },
    movie: { model: 'Movie', required: true },
  },
});

const data = {
  persons: [
    [1, 'John', 'Doe', 'jdoe', 'john.doe@msn.com', 'M', 20, 1, 1],
    [2, 'Brad', 'Smith', 'bsmith', 'brad.smith@yahoo.com', 'M', 64, 2, null],
    [3, 'Lauren', 'Carter', 'lcarter', 'lauren.carter@hotmail.com', 'W', 37, 1, 1],
    [4, 'Robert', 'Johnson', 'rjohnson', 'robert.johnson@gmail.com', 'M', 17, 3, null],
    [5, 'Patricia', 'Moore', 'pmoore', 'patricia.moore@gmail.com', 'W', 53, 3, null],
    [6, 'John', 'Brown', 'jbrown', 'john.brown@gmail.com', 'M', 28, 1, 2],
  ],
  cities: [
    [1, 'New-York', 1],
    [2, 'San Francisco', 2],
    [3, 'Los Angeles', 2],
  ],
  states: [
    [1, 'New-York'],
    [2, 'California'],
  ],
  religions: [
    [1, 'Catholicism'],
    [2, 'Islam'],
  ],
  movies: [
    [1, 'The Godfather', 1972],
    [2, 'Pulp Fiction', 1994],
    [3, 'The Good, the Bad and the Ugly', 1966],
    [4, 'Forrest Gump', 1994],
    [5, 'The Lord of the Rings', 2001],
    [6, 'Star Wars', 1977],
    [7, 'Usual Suspects', 1995],
    [8, 'The Green Mile', 1999],
  ],
  favoriteMovies: [
    [1, 2, 1],
    [1, 6, 2],
    [1, 5, 3],
    [2, 5, 1],
    [3, 2, 1],
    [3, 8, 2],
    [3, 1, 3],
    [4, 3, 1],
    [4, 7, 2],
    [4, 5, 3],
    [5, 6, 1],
    [5, 1, 2],
    [6, 8, 1],
    [6, 5, 2],
    [6, 3, 3],
  ],
};

function values(items) {
  return items.map(fields => '(' + fields.map(escape).join(', ') + ')').join(', ');
}

before(async () => {
  await client.query(`DROP TABLE IF EXISTS person`);
  await client.query(`DROP TABLE IF EXISTS city`);
  await client.query(`DROP TABLE IF EXISTS state`);
  await client.query(`DROP TABLE IF EXISTS religion`);
  await client.query(`DROP TABLE IF EXISTS movie`);
  await client.query(`DROP TABLE IF EXISTS favorite_movie`);
  await client.query(`
    CREATE TABLE person (
      id int(11) UNIQUE NOT NULL,
      firstname varchar(50) NOT NULL,
      lastname varchar(50) NOT NULL,
      login varchar(50) UNIQUE NOT NULL,
      email varchar(100) UNIQUE NOT NULL,
      gender char(1) NOT NULL,
      age int NOT NULL,
      city_id int(11) NOT NULL,
      religion_id int(11) NULL,
      PRIMARY KEY (id)
    )
  `);
  await client.query(`
    CREATE TABLE city (
      id int(11) UNIQUE NOT NULL,
      name varchar(50) NOT NULL,
      state_id int(11) NOT NULL,
      PRIMARY KEY (id)
    )
  `);
  await client.query(`
    CREATE TABLE state (
      id int(11) UNIQUE NOT NULL,
      name varchar(50) NOT NULL,
      PRIMARY KEY (id)
    )
  `);
  await client.query(`
    CREATE TABLE religion (
      id int(11) UNIQUE NOT NULL,
      name varchar(50) NOT NULL,
      PRIMARY KEY (id)
    )
  `);
  await client.query(`
    CREATE TABLE movie (
      id int(11) UNIQUE NOT NULL,
      name varchar(50) NOT NULL,
      year int(4) NOT NULL,
      PRIMARY KEY (id)
    )
  `);
  await client.query(`
    CREATE TABLE favorite_movie (
      person_id int(11) NOT NULL,
      movie_id int(11) NOT NULL,
      position int(11) NOT NULL,
      hidden tinyint(1) NOT NULL DEFAULT 0,
      PRIMARY KEY (person_id, movie_id)
    )
  `);
  await client.query(`
    INSERT INTO person (id, firstname, lastname, login, email, gender, age, city_id, religion_id)
    VALUES ${values(data.persons)}
  `);
  await client.query(`
    INSERT INTO state (id, name)
    VALUES ${values(data.states)}
  `);
  await client.query(`
    INSERT INTO city (id, name, state_id)
    VALUES ${values(data.cities)}
  `);
  await client.query(`
    INSERT INTO religion (id, name)
    VALUES ${values(data.religions)}
  `);
  await client.query(`
    INSERT INTO movie (id, name, year)
    VALUES ${values(data.movies)}
  `);
  await client.query(`
    INSERT INTO favorite_movie (person_id, movie_id, position)
    VALUES ${values(data.favoriteMovies)}
  `);
});

describe('Model', () => {
  describe('#findAll', () => {
    it('should return all rows from table', async () => {
      const rows = await Person.findAll();
      rows.map(({ id, firstname, lastname, login, email, gender, age, city, religion }) => {
        return [id, firstname, lastname, login, email, gender, age, city.id, religion && religion.id];
      }).should.be.eql(data.persons);
    });

    describe('includes', () => {
      it('many-to-one', async () => {
        const rows = await Person.findAll({
          includes: ['city'],
          where: { age: { $lt: 30 } },
          order: 'age',
        });
        rows.map(({ login, city }) => ([login, city.name])).should.be.eql([
          ['rjohnson', 'Los Angeles'],
          ['jdoe', 'New-York'],
          ['jbrown', 'New-York'],
        ]);
      });

      it('many-to-many', async () => {
        const rows = await Person.findAll({
          includes: { favoriteMovies: true },
          where: { age: { $gt: 30 } },
          order: 'age',
        });
        rows.map(({ login, favoriteMovies }) => ([login, favoriteMovies.map(m => m.name)])).should.be.eql([
          ['lcarter', ['Pulp Fiction', 'The Green Mile', 'The Godfather']],
          ['pmoore', ['Star Wars', 'The Godfather']],
          ['bsmith', ['The Lord of the Rings']],
        ]);
      });

      it('one-to-many', async () => {
        const rows = await State.findAll({
          includes: { cities: true },
          order: 'name',
        });
        rows.map(({ name, cities }) => ([name, cities.map(m => m.name)])).should.be.eql([
          ['California', ['Los Angeles', 'San Francisco']],
          ['New-York', ['New-York']],
        ]);
      });

      it('many-to-many (with filter on relation)', async () => {
        const rows = await Person.findAll({
          includes: { favoriteMovies: true },
          where: { 'favoriteMovies.name': 'The Godfather' },
          order: 'age',
        });
        rows.map(({ login, favoriteMovies }) => ([login, favoriteMovies.map(m => m.name)])).should.be.eql([
          ['lcarter', ['Pulp Fiction', 'The Green Mile', 'The Godfather']],
          ['pmoore', ['Star Wars', 'The Godfather']],
        ]);
      });

      it('many-to-many (with filtered relation)', async () => {
        const rows = await Person.findAll({
          includes: { favoriteOldMovies: true },
          order: 'age',
        });
        rows.map(({ login, favoriteOldMovies }) => ([login, favoriteOldMovies.map(m => m.name)])).should.be.eql([
          ['rjohnson', ['The Good, the Bad and the Ugly']],
          ['jdoe', ['Star Wars']],
          ['jbrown', ['The Good, the Bad and the Ugly']],
          ['lcarter', ['The Godfather']],
          ['pmoore', ['Star Wars', 'The Godfather']],
          ['bsmith', []],
        ]);
      });

      it('indirect relation include', async () => {
        const rows = await Person.findAll({
          includes: { city: { state: true } },
          order: 'login',
        });
        rows.map(({ login, city }) => [login, city.name, city.state.name]).should.be.eql([
          ['bsmith', 'San Francisco', 'California'],
          ['jbrown', 'New-York', 'New-York'],
          ['jdoe', 'New-York', 'New-York'],
          ['lcarter', 'New-York', 'New-York'],
          ['pmoore', 'Los Angeles', 'California'],
          ['rjohnson', 'Los Angeles', 'California'],
        ]);
      });

      it('indirect relation include (with list includes)', async () => {
        const rows = await Person.findAll({
          includes: ['city.state'],
          order: 'login',
        });
        rows.map(({ login, city }) => [login, city.name, city.state.name]).should.be.eql([
          ['bsmith', 'San Francisco', 'California'],
          ['jbrown', 'New-York', 'New-York'],
          ['jdoe', 'New-York', 'New-York'],
          ['lcarter', 'New-York', 'New-York'],
          ['pmoore', 'Los Angeles', 'California'],
          ['rjohnson', 'Los Angeles', 'California'],
        ]);
      });

      it('without default fields', async () => {
        const rows = await Person.findAll({
          includes: {
            id: true,
            login: true,
            $defaults: false,
          },
          order: 'id',
        });
        rows.should.be.eql([
          { id: 1, login: 'jdoe' },
          { id: 2, login: 'bsmith' },
          { id: 3, login: 'lcarter' },
          { id: 4, login: 'rjohnson' },
          { id: 5, login: 'pmoore' },
          { id: 6, login: 'jbrown' },
        ]);
      });

      it('including virtual fields without defaults', async () => {
        const rows = await Person.findAll({
          includes: {
            id: true,
            login: true,
            emailService: true,
            $defaults: false,
          },
          order: 'id',
        });
        rows.should.be.eql([
          { id: 1, login: 'jdoe', emailService: 'msn' },
          { id: 2, login: 'bsmith', emailService: 'yahoo' },
          { id: 3, login: 'lcarter', emailService: 'hotmail' },
          { id: 4, login: 'rjohnson', emailService: 'gmail' },
          { id: 5, login: 'pmoore', emailService: 'gmail' },
          { id: 6, login: 'jbrown', emailService: 'gmail' },
        ]);
      });

      it('fields exclusion', async () => {
        const rows = await Person.findAll({
          includes: {
            firstname: false,
            lastname: false,
            email: false,
            gender: false,
            age: false,
            city: false,
            religion: false,
          },
          order: 'id',
        });
        rows.should.be.eql([
          { id: 1, login: 'jdoe', emailService: 'msn' },
          { id: 2, login: 'bsmith', emailService: 'yahoo' },
          { id: 3, login: 'lcarter', emailService: 'hotmail' },
          { id: 4, login: 'rjohnson', emailService: 'gmail' },
          { id: 5, login: 'pmoore', emailService: 'gmail' },
          { id: 6, login: 'jbrown', emailService: 'gmail' },
        ]);
      });

      it('with optional relation', async () => {
        const includes = {
          firstname: false,
          lastname: false,
          email: false,
          emailService: false,
          gender: false,
          age: false,
          city: false,
          religion: { lowerName: true },
        };
        const person1 = await Person.findById(1, includes);
        person1.should.be.eql({
          id: 1,
          login: 'jdoe',
          religion: {
            id: 1,
            name: 'Catholicism',
            lowerName: 'catholicism',
          },
        });

        const person2 = await Person.findById(2, includes);
        person2.should.be.eql({
          id: 2,
          login: 'bsmith',
          religion: null,
        });
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
          select: ['login', 'age'],
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

      it('with reference on other selected field', async () => {
        const rows = await Person.findAll({
          select: { foo: 'login', bar: sql.plus(sql.field('baz'), 1), baz: 'age' },
          where: { age: { $lt: 30 } },
        });
        rows.should.be.eql([
          { foo: 'jdoe', bar: 21, baz: 20 },
          { foo: 'rjohnson', bar: 18, baz: 17 },
          { foo: 'jbrown', bar: 29, baz: 28 },
        ]);
      });

      it('fallback on model fields for self-referencing fields', async () => {
        const rows = await Person.findAll({
          select: { login: 'login', age: sql.plus(sql.field('age'), 1) },
          where: { age: { $lt: 30 } },
        });
        rows.should.be.eql([
          { login: 'jdoe', age: 21 },
          { login: 'rjohnson', age: 18 },
          { login: 'jbrown', age: 29 },
        ]);
      });

      it('with one-to-many relation (exluding target to source link)', async () => {
        const rows = await State.findAll({
          select: { name: true, cities: { name: true } },
        });
        rows.should.be.eql([
          { name: 'New-York', cities: [{ name: 'New-York' }]},
          { name: 'California', cities: [{ name: 'Los Angeles' }, { name: 'San Francisco' }]},
        ]);
      });

      it('with many-to-many relation (exluding target to source link)', async () => {
        const rows = await Person.findAll({
          select: { login: true, favoriteMovies: { name: true } },
          where: { age: { $lt: 30 } },
        });
        _(rows).map(({ login, favoriteMovies }) => favoriteMovies.map(({ name }) => [login, name]))
          .flatten().value().should.be.eql([
            ['jdoe', 'Pulp Fiction'],
            ['jdoe', 'Star Wars'],
            ['jdoe', 'The Lord of the Rings'],
            ['rjohnson', 'The Good, the Bad and the Ugly'],
            ['rjohnson', 'Usual Suspects'],
            ['rjohnson', 'The Lord of the Rings'],
            ['jbrown', 'The Green Mile'],
            ['jbrown', 'The Lord of the Rings'],
            ['jbrown', 'The Good, the Bad and the Ugly'],
          ]);
      });

      it('with distinct', async () => {
        const rows = await Person.findAll({
          select: 'gender',
          distinct: true,
          order: 'gender',
        });
        rows.should.be.eql(['M', 'W']);
      });
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
          order: ['firstname', 'lastname'],
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

      it('on many to one relation', async () => {
        const rows = await Person.findAll({
          where: {
            city: { name: 'New-York' },
          },
          order: 'id',
        });
        rows.map(r => r.login).should.be.eql([
          'jdoe',
          'lcarter',
          'jbrown',
        ]);
      });

      it('on many to one optional relation', async () => {
        const rows = await Person.findAll({
          where: {
            religion: { name: 'Catholicism' },
          },
          order: 'id',
        });
        rows.map(r => r.login).should.be.eql([
          'jdoe',
          'lcarter',
        ]);
      });

      it('on many to many relation', async () => {
        const rows = await Person.findAll({
          where: {
            favoriteMovies: { name: { $in: ['Pulp Fiction', 'Star Wars'] } },
          },
          order: 'id',
        });
        rows.map(r => r.login).should.be.eql([
          'jdoe',
          'lcarter',
          'pmoore',
        ]);
      });

      it('on multiple relations', async () => {
        const rows = await Person.findAll({
          where: {
            favoriteMovies: { name: { $in: ['Pulp Fiction', 'Star Wars'] } },
            'city.name': 'New-York',
          },
          order: 'id',
        });
        rows.map(r => r.login).should.be.eql([
          'jdoe',
          'lcarter',
        ]);
      });

      it('on indirect relation', async () => {
        const rows = await City.findAll({
          where: {
            'inhabitants.favoriteMovies.name': 'Star Wars',
          },
          order: 'name',
        });
        rows.should.be.eql([
          { id: 3, name: 'Los Angeles', state: { id: 2 } },
          { id: 1, name: 'New-York', state: { id: 1 } },
        ]);
      });

      it('ignore empty filters', async () => {
        const rows = await Person.findAll({
          where: [
            {
              age: { $gt: 30 },
              lastname: {},
              email: [],
            },
            {},
            [],
          ],
        });
        rows.map(r => r.login).should.be.eql([
          'bsmith',
          'lcarter',
          'pmoore',
        ]);
      });
    });

    describe('count', () => {
      it('simple', async () => {
        const count = await Person.count();
        count.should.be.eql(6);
      });

      it('with filter on collection relation', async () => {
        const count = await Person.count({
          'favoriteMovies.name': { $in: ['Star Wars', 'The Lord of the Rings'] },
        });
        count.should.be.eql(5);
      });
    });

    describe('group', () => {
      it('count', async () => {
        const rows = await Person.findAll({
          select: { gender: true, count: sql.count(sql.field('id')) },
          group: 'gender',
          order: '-count',
        });
        rows.should.be.eql([
          { gender: 'M', count: 4 },
          { gender: 'W', count: 2 },
        ]);
      });
      it('avg', async () => {
        const rows = await Person.findAll({
          select: { gender: true, meanAge: sql.avg(sql.field('age')) },
          group: 'gender',
          order: sql.desc(sql.count(sql.field('id'))),
        });
        rows.should.be.eql([
          { gender: 'M', meanAge: 32.25 },
          { gender: 'W', meanAge: 45 },
        ]);
      });
      it('having', async () => {
        const rows = await Person.findAll({
          select: { gender: true, meanAge: sql.avg(sql.field('age')) },
          group: 'gender',
          having: sql.gt(sql.field('meanAge'), 40),
        });
        rows.should.be.eql([
          { gender: 'W', meanAge: 45 },
        ]);
      });
      it('with many-to-one relation', async () => {
        const rows = await Person.findAll({
          select: { cityName: 'city.name', count: sql.count(sql.field('id')) },
          group: 'city.id',
          order: '-count',
        });
        rows.should.be.eql([
          { cityName: 'New-York', count: 3 },
          { cityName: 'Los Angeles', count: 2 },
          { cityName: 'San Francisco', count: 1 },
        ]);
      });

      it('one-to-many not blocked when grouping on id field', async () => {
        const rows = await State.findAll({
          includes: { cities: true },
          order: 'name',
          group: 'id',
        });
        rows.map(({ name, cities }) => ([name, cities.map(m => m.name)])).should.be.eql([
          ['California', ['Los Angeles', 'San Francisco']],
          ['New-York', ['New-York']],
        ]);
      });
    });

    describe('functions and operations', () => {
      it('minus', async () => {
        const rows = await Person.findAll({
          select: { login: true, minAge: sql.minus(sql.field('age'), 10) },
          where: { age: { $gt: 30 } },
          order: 'age',
        });
        rows.should.be.eql([
          { login: 'lcarter', minAge: 27 },
          { login: 'pmoore', minAge: 43 },
          { login: 'bsmith', minAge: 54 },
        ]);
      });

      // FIXME: replace 0 and 1 by boolean
      it('comparison', async () => {
        const rows = await Person.findAll({
          select: { login: true, young: sql.lt(sql.field('age'), 30) },
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
          select: { gender: true, meanAge: sql.floor(sql.avg(sql.field('age'))) },
          group: 'gender',
          order: sql.desc(sql.count(sql.field('id'))),
        });
        rows.should.be.eql([
          { gender: 'M', meanAge: 32 },
          { gender: 'W', meanAge: 45 },
        ]);
      });
    });

    describe('virtual fields', () => {
      it('simple', async () => {
        const rows = await Person.findAll({
          where: { age: { $lt: 30 } },
          order: 'age',
        });
        rows.map(({ login, emailService }) => [login, emailService]).should.be.eql([
          ['rjohnson', 'gmail'],
          ['jdoe', 'msn'],
          ['jbrown', 'gmail'],
        ]);
      });
      it('with dependency', async () => {
        const rows = await Person.findAll({
          includes: ['favoriteMovieName'],
          where: { age: { $gt: 30 } },
          order: 'age',
        });
        rows.map(({ login, favoriteMovieName }) => [login, favoriteMovieName]).should.be.eql([
          ['lcarter', 'Pulp Fiction'],
          ['pmoore', 'Star Wars'],
          ['bsmith', 'The Lord of the Rings'],
        ]);
      });
      it('with dependency and with select', async () => {
        const rows = await Person.findAll({
          select: ['login', 'favoriteMovieName'],
          where: { age: { $gt: 30 } },
          order: 'age',
        });
        rows.map(({ login, favoriteMovieName }) => [login, favoriteMovieName]).should.be.eql([
          ['lcarter', 'Pulp Fiction'],
          ['pmoore', 'Star Wars'],
          ['bsmith', 'The Lord of the Rings'],
        ]);
      });
      it('with dependency on other virtual field', async () => {
        const rows = await Person.findAll({
          select: ['login', 'favoriteMovieNameUpper'],
          where: { age: { $gt: 30 } },
          order: 'age',
        });
        rows.map(({ login, favoriteMovieNameUpper }) => [login, favoriteMovieNameUpper]).should.be.eql([
          ['lcarter', 'PULP FICTION'],
          ['pmoore', 'STAR WARS'],
          ['bsmith', 'THE LORD OF THE RINGS'],
        ]);
      });
    });

    describe('Reverse relations', () => {
      it('many-to-many', async () => {
        const rows = await Movie.findAll({ includes: ['fans'] });
        rows.map(({ name, fans }) => [name, fans.map(f => f.login)]).should.be.eql([
          ['The Godfather', ['lcarter', 'pmoore']],
          ['Pulp Fiction', ['jdoe', 'lcarter']],
          ['The Good, the Bad and the Ugly', ['rjohnson', 'jbrown']],
          ['Forrest Gump', []],
          ['The Lord of the Rings', ['jdoe', 'bsmith', 'rjohnson', 'jbrown']],
          ['Star Wars', ['jdoe', 'pmoore']],
          ['Usual Suspects', ['rjohnson']],
          ['The Green Mile', ['lcarter', 'jbrown']],
        ]);
      });
    });

    describe('Model::findOne', () => {
      it('simple', async () => {
        const person = await Person.findOne({ where: { login: 'jdoe' } });
        person.should.be.eql({
          age: 20,
          city: {
            id: 1,
          },
          email: 'john.doe@msn.com',
          emailService: 'msn',
          firstname: 'John',
          gender: 'M',
          id: 1,
          lastname: 'Doe',
          login: 'jdoe',
          religion: {
            id: 1,
          },
        });
      });

      it('with select', async () => {
        const person = await Person.findOne({ where: { login: 'jdoe' }, select: [ 'email', 'age' ] });
        person.should.be.eql({
          age: 20,
          email: 'john.doe@msn.com',
        });
      });

      it('without result', async () => {
        const person = await Person.findOne({ where: { login: 'unknown' } });
        should(person).be.null();
      });

      it('more than one result', () => {
        return Person.findOne({ where: { age: { $gt: 30 } } }).should.be.rejected();
      });
    });

    describe('Model::findById', () => {
      it('simple', async () => {
        const person = await Person.findById(1);
        person.should.be.eql({
          age: 20,
          city: {
            id: 1,
          },
          email: 'john.doe@msn.com',
          emailService: 'msn',
          firstname: 'John',
          gender: 'M',
          id: 1,
          lastname: 'Doe',
          login: 'jdoe',
          religion: {
            id: 1,
          },
        });
      });

      it('with select', async () => {
        const person = await Person.findById(1, { $defaults: false, email: true, age: true });
        person.should.be.eql({
          age: 20,
          email: 'john.doe@msn.com',
        });
      });

      it('without result', async () => {
        const person = await Person.findById(9999);
        should(person).be.null();
      });
    });
  });

  describe('#stream', () => {
    it('all rows', async () => {
      const stream = Person.stream({
        select: ['login', 'age'],
      }, 2);
      const rows = await toArray(stream);
      rows.should.be.eql([
        { age: 20, login: 'jdoe' },
        { age: 64, login: 'bsmith' },
        { age: 37, login: 'lcarter' },
        { age: 17, login: 'rjohnson' },
        { age: 53, login: 'pmoore' },
        { age: 28, login: 'jbrown' },
      ]);
    });

    it('with filter', async () => {
      const stream = Person.stream({
        select: ['login', 'age'],
        where: { age: { $gt: 30 } },
      }, 2);
      const rows = await toArray(stream);
      rows.should.be.eql([
        { age: 64, login: 'bsmith' },
        { age: 37, login: 'lcarter' },
        { age: 53, login: 'pmoore' },
      ]);
    });

    it('with id field', async () => {
      const stream = Person.stream({
        select: ['id', 'login', 'age'],
        where: { age: { $gt: 30 } },
      }, 2);
      const rows = await toArray(stream);
      rows.should.be.eql([
        { id: 2, age: 64, login: 'bsmith' },
        { id: 3, age: 37, login: 'lcarter' },
        { id: 5, age: 53, login: 'pmoore' },
      ]);
    });

    it('with scalar result', async () => {
      const stream = Person.stream({
        select: 'login',
        where: { age: { $gt: 30 } },
      }, 2);
      const rows = await toArray(stream);
      rows.should.be.eql([
        'bsmith',
        'lcarter',
        'pmoore',
      ]);
    });
  });
});
