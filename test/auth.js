'use strict'

const Code = require('code')
const Lab = require('lab')
const Path = require('path')

const { describe, it, before, after } = exports.lab = Lab.script()
const { expect } = Code

const Config = require('../src/config')
const dbConfig = require('../knexfile')
const Server = require('../src')

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

  it('allows user to authenticate via POST /login', async () => {
    const server = await Server.init(internals.manifest, internals.composeOptions)
    const res = await server.inject({
      method: 'POST',
      url: '/login',
      payload: {
        username: admin.username,
        password: admin.password
      }
    })

    expect(res.statusCode).to.equal(200)

    await server.stop()
  })

  it('returns 401 if wrong password is used', async () => {
    const server = await Server.init(internals.manifest, internals.composeOptions)
    const res = await server.inject({
      method: 'POST',
      url: '/login',
      payload: {
        username: 'admin',
        password: 'wrong-pass'
      }
    })
    expect(res.statusCode).to.equal(401)
    await server.stop()
  })

  it('returns 401 if user doesn exist', async () => {
    const server = await Server.init(internals.manifest, internals.composeOptions)
    const res = await server.inject({
      method: 'POST',
      url: '/login',
      payload: {
        username: 'non-user',
        password: 'doent matter'
      }
    })
    expect(res.statusCode).to.equal(401)
    await server.stop()
  })

  it('logs user out when logged user requests GET /logout', async () => {
    const server = await Server.init(internals.manifest, internals.composeOptions)

    const admin = {
      username: 'admin',
      password: 'admin'
    }

    const res = await server.inject({
      method: 'POST',
      url: '/login',
      payload: {
        username: admin.username,
        password: admin.password
      }
    })

    const cookie = internals.getCookieFromResponse(res)

    const res2 = await server.inject({
      url: '/logout',
      headers: { cookie }
    })

    expect(res2.statusCode).to.equal(200)

    await server.stop()
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
    { plugin: './src/auth' },
    { plugin: 'hapi-auth-cookie' },
    { plugin: './src/api/users' },
    { plugin: { register: './src/db', options: Config.get('/db') } }
  ]
}

internals.composeOptions = {
  relativeTo: Path.resolve(__dirname, '..')
}
