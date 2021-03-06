
import 'should';

import Grm from '../src/index.js';
import IncludesResolver from '../src/includes-resolver';

const grm = new Grm({
  user: 'root',
  password: 'root',
  database: 'grm',
  logging: true,
});

grm.define('Person', {
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
    city: { model: 'City' },
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
        year: { $lt: 1990 },
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
      dependsOn: { favoriteMovies: true },
      getter() {
        return this.favoriteMovies[0].name;
      },
    },
  },
});

grm.define('City', {
  fields: {
    id: {},
    name: {},
  },
  relations: {
    state: { model: 'State' },
    inhabitants: {
      model: 'Person',
      mappedBy: 'city',
    },
  },
});

grm.define('State', {
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

const Movie = grm.define('Movie', {
  fields: {
    id: {},
    name: {},
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
    person: { model: 'Person' },
    movie: { model: 'Movie' },
  },
});

describe('Include resolver', () => {
  it('should return only default fields of relation', async () => {
    const includes = IncludesResolver.of(Movie).resolve(['fans']);
    includes.should.be.eql({
      id: true,
      name: true,
      fans: {
        id: true,
        firstname: true,
        lastname: true,
        age: true,
        email: true,
        emailService: true,
        gender: true,
        login: true,
        city: {
          id: true,
        },
      },
    });
  });
});
