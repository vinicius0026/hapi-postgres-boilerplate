# Hapijs + PostgreSQL Boilerplate

[![Build Status](https://travis-ci.org/vinicius0026/hapi-postgres-boilerplate.svg?branch=master)](https://travis-ci.org/vinicius0026/hapi-postgres-boilerplate)
[![Coverage Status](https://coveralls.io/repos/github/vinicius0026/hapi-postgres-boilerplate/badge.svg?branch=master)](https://coveralls.io/github/vinicius0026/hapi-postgres-boilerplate?branch=master)
[![Standard - JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)
[![Dependencies](https://david-dm.org/vinicius0026/hapi-postgres-boilerplate.svg)](https://david-dm.org/vinicius0026/hapi-postgres-boilerplate)

Yet another [Hapi](https://github.com/hapijs/hapi) boilerplate for a RESTFul
server. Opinionated. Using [PostgreSQL](https://www.postgresql.org/)
as Database.

Using Node Native Promises for async handling, standardjs for linting, and
grouping files by resource (for the API).

Leverages the hapi ecosystem to a great extent:

- [Lab](https://github.com/hapijs/lab) and [Code](https://github.com/hapijs/code)
for testing
- [Glue](https://github.com/hapijs/glue) for server configuration and plugin
registration
- [hapi-auth-cookie](https://github.com/hapijs/hapi-auth-cookie) for
authentication
- Hapi builtin authorization via scope (see
[route options](https://hapijs.com/api#route-options) in Hapi API docs for
details)
- [Confidence](https://github.com/hapijs/confidence) for config management
- [Joi](https://github.com/hapijs/joi) for validation
- [Boom](https://github.com/hapijs/boom) for http error responses
- [Good](https://github.com/hapijs/good) for logging
- [Lout](https://github.com/hapijs/lout) (+
[Vision](https://github.com/hapijs/vision) &
[Inert](https://github.com/hapijs/inert)) for automatic documentation

[Bookshelf](http://bookshelfjs.org/) is used as ORM, together with
[knex](http://knexjs.org/) (which is also used to run migrations).

This boilerplate has authentication and authorization setup, and user management
api routes, for both demo purposes and to bootstrap an application easily.

## Project Structure

Hapijs Plugins are used to organize and modularize code. General purpose plugins
go into `src/` directory. API plugins go into `src/api/{resource}` directories.

Plugins are wiredeup using Glue. All plugin loading logic is into `src/manifest.js`
file.

For API resources, the directory contains 3 files: `index.js`, `handlers.js` and
`model.js`

Example:

```
src
|- api
   |- users
      |- index.js
      |- handlers.js
      |- model.js
```

`index.js` is basically a router file, were plugin is declared and routes are
registered into server.

The router handlers are declared in `handlers.js` file. This file exports a
function that receives as argument the `options` parameter from plugin
registration. This serves both to pass global parameters (such as db connections)
to handlers and to do dependency injection in tests. An object with all handlers
is returned. The handlers signature is allways `(request, reply)`.

```javascript
const Handlers = require('./handlers')

const options = {
  db: someDBStub
}

let handlers = Handlers(options)

console.log('handlers', handlers)
// {
//    create: function (request, reply) {...},
//    read: function (request, reply) {...},
//    ...
// }
```

Handlers interact with the Model, where business logic should be
encapsulated, such as validations (other than payload validation, which is done
at router level), DB operations and such likes. The model file also exports a
function which receives the options object passed to Handlers function, and
returns an object with all model operations, such as basic CRUD functionality.

All model function return promises.

The model also returns a blueprint object, used for payload validation in
router.


## Database

PostgreSQL is used as Database, with Bookshelf as ORM and knex as query builder.

Knex is used to run migrations. See [knex docs](http://knexjs.org/#Migrations)
for details on how to create and run migrations.

## Configuration

All configuration is stored in `src/config.js`, using
[Confidence](https://github.com/hapijs/confidence). Configuration for migrations
is in `migrations/config.js`.

## Running locally

- Make sure PostgreSQL is running
- Clone repo
- Run `npm install`
- Setup environment variables in a .env file
(see [dotenv](https://github.com/motdotla/dotenv)). The following environment
varibles must be set:
  - NODE_ENV: should be either `test`, `dev`, `staging` or `prod`
  - COOKIE_SECRET: the secret used to protect the cookie data used in
  authentication (required only for `prod` environment)
- Run `npm run`

## Contributing

Feel free to clone and make the changes you want. If you want to commit them back
to this repo, please ensure that tests pass and coverage is > 95% (ideally 100%)

## License

MIT License
