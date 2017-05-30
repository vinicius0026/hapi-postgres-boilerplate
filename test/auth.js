'use strict'

const Code = require('code')
const Lab = require('lab')
const Migrate = require('rethinkdb-migrate').migrate
const Path = require('path')

const lab = exports.lab = Lab.script()
const describe = lab.experiment
const expect = Code.expect
const it = lab.test
const before = lab.before
const after = lab.after

const Config = require('../lib/config')
const dbConfig = require('../migrations/config')
const Server = require('../lib')

const internals = {}

describe('Auth', () => {
  const migrationConfig = Object.assign({}, dbConfig, { relativeTo: Path.resolve(__dirname, '../') })
  const admin = {
    username: 'admin',
    password: 'p4$$w0Rd',
    scope: ['user', 'admin']
  }

  before({ timeout: 10000 }, done => {
    Migrate(Object.assign({}, migrationConfig, { op: 'up' }))
      .then(() => done())
      .catch(done)
  })

  after({ timeout: 10000 }, done => {
    Migrate(Object.assign({}, migrationConfig, { op: 'down' }))
      .then(done)
      .catch(done)
  })
  it('allows user to authenticate via POST /login', done => {
    let server

    Server.init(internals.manifest, internals.composeOptions)
      .then(_server => {
        server = _server

        return server.inject({
          method: 'POST',
          url: '/login',
          payload: {
            username: admin.username,
            password: admin.password
          }
        })
      })
      .then(res => {
        expect(res.statusCode).to.equal(200)
        server.stop(done)
      })
      .catch(done)
  })

  it('returns 401 if wrong password is used', done => {
    let server
    Server.init(internals.manifest, internals.composeOptions)
      .then(_server => {
        server = _server

        return server.inject({
          method: 'POST',
          url: '/login',
          payload: {
            username: 'admin',
            password: 'wrong-pass'
          }
        })
      })
      .then(res => {
        expect(res.statusCode).to.equal(401)
        server.stop(done)
      })
      .catch(done)
  })

  it('returns 401 if user doesn exist', done => {
    let server
    Server.init(internals.manifest, internals.composeOptions)
      .then(_server => {
        server = _server

        return server.inject({
          method: 'POST',
          url: '/login',
          payload: {
            username: 'non-user',
            password: 'doent matter'
          }
        })
      })
      .then(res => {
        expect(res.statusCode).to.equal(401)
        server.stop(done)
      })
      .catch(done)
  })

  it('logs user out when logged user requests GET /logout', done => {
    let server
    Server.init(internals.manifest, internals.composeOptions)
      .then(_server => {
        server = _server

        const admin = {
          username: 'admin',
          password: 'p4$$w0Rd'
        }

        return server.inject({
          method: 'POST',
          url: '/login',
          payload: {
            username: admin.username,
            password: admin.password
          }
        })
        .then(res => {
          const cookie = internals.getCookieFromResponse(res)

          return server.inject({
            url: '/logout',
            headers: { cookie }
          })
        })
        .then(res => {
          expect(res.statusCode).to.equal(200)
          server.stop(done)
        })
        .catch(done)
      })
  })
})

internals.getCookieFromResponse = res => {
  const header = res.headers['set-cookie']
  /* eslint-disable */
  const cookie = header[0].match(/(?:[^\x00-\x20\(\)<>@\,;\:\\"\/\[\]\?\=\{\}\x7F]+)\s*=\s*(?:([^\x00-\x20\"\,\;\\\x7F]*))/)
  /* eslint-enable */
  return cookie[0]
}

internals.manifest = {
  connections: [
    { port: 0 }
  ],
  registrations: [
    { plugin: './lib/auth' },
    { plugin: 'hapi-auth-cookie' },
    { plugin: './api/users' },
    { plugin: { register: './lib/db', options: Config.get('/db') } }
  ]
}

internals.composeOptions = {
  relativeTo: Path.resolve(__dirname, '..')
}
