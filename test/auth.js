'use strict'

const Code = require('code')
const Lab = require('lab')
const Path = require('path')

const { describe, it, before, after } = exports.lab = Lab.script()
const { expect } = Code

const Config = require('../lib/config')
const dbConfig = require('../knexfile')
const Server = require('../lib')

const knex = require('knex')(dbConfig)

const internals = {}

describe('Auth', () => {
  const admin = {
    username: 'admin',
    password: 'admin',
    scope: ['user', 'admin']
  }

  before(() => knex.migrate.latest())

  after(() => knex
    .migrate
    .rollback()
    .then(() => knex.destroy())
  )

  it('allows user to authenticate via POST /login', () => {
    let server

    return Server.init(internals.manifest, internals.composeOptions)
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

        return server.stop()
      })
  })

  it('returns 401 if wrong password is used', () => {
    let server

    return Server.init(internals.manifest, internals.composeOptions)
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
        return server.stop()
      })
  })

  it('returns 401 if user doesn exist', () => {
    let server
    return Server.init(internals.manifest, internals.composeOptions)
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
        return server.stop()
      })
  })

  it('logs user out when logged user requests GET /logout', () => {
    let server
    return Server.init(internals.manifest, internals.composeOptions)
      .then(_server => {
        server = _server

        const admin = {
          username: 'admin',
          password: 'admin'
        }

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
        const cookie = internals.getCookieFromResponse(res)

        return server.inject({
          url: '/logout',
          headers: { cookie }
        })
      })
      .then(res => {
        expect(res.statusCode).to.equal(200)

        return server.stop()
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
