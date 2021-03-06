'use strict'

const Code = require('code')
const Lab = require('lab')
const Path = require('path')

const { describe, it, before, after } = exports.lab = Lab.script()
const { expect } = Code

const dbConfig = require('../../../knexfile')

const Config = require('../../../src/config')
const Server = require('../../../src')

const knex = require('knex')(dbConfig)
const UserModel = require('../../../src/api/users/model')({ knex })

const internals = {}

describe('User API Tests', () => {
  before(() => knex.migrate.latest())

  after(() => knex.migrate.rollback()
    .then(() => knex.destroy())
  )

  describe('List Users Tests', () => {
    it('Lists users if logged as user', async () => {
      const server = await Server.init(internals.manifest, internals.composeOptions)
      const res = await server.inject({
        method: 'GET',
        url: '/api/users',
        credentials: {
          scope: ['user']
        }
      })

      expect(res.statusCode).to.equal(200)

      const list = res.result.data
      expect(list).to.be.an.array()
      expect(list).to.have.length(1)
      list.every(item => {
        expect(item.username).to.be.a.string()
        expect(item.scope).to.be.an.array()
        expect(item.hash).to.not.exist()
      })

      const pagination = res.result.pagination
      expect(pagination).to.equal({
        totalItems: 1,
        page: 1,
        limit: 10
      })

      await server.stop()
    })

    it('handles errors in db', async () => {
      const server = await Server.init(internals.brokenManifest, internals.composeOptions)
      const res = await server.inject({
        url: '/api/users',
        credentials: {
          scope: ['user']
        }
      })

      expect(res.statusCode).to.equal(500)
      await server.stop()
    })
  })

  describe('Create User Tests', () => {
    it('creates user if authenticated as admin', async () => {
      const server = await Server.init(internals.manifest, internals.composeOptions)
      const res = await server.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          username: 'new-user',
          password: 'some-passsss',
          scope: ['user']
        },
        credentials: {
          scope: ['admin']
        }
      })

      expect(res.statusCode).to.equal(201)
      expect(res.result.ok).to.equal(true)
      expect(res.result.message).to.match(/^Created user with id .+$/)

      await server.stop()
    })

    it('doesnt create user if username is already taken', async () => {
      const server = await Server.init(internals.manifest, internals.composeOptions)
      const res = await server.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          username: 'admin',
          password: 'some-passsss',
          scope: ['user']
        },
        credentials: {
          scope: ['admin']
        }
      })

      expect(res.statusCode).to.equal(400)
      expect(res.result.message).to.equal('Username already taken')

      await server.stop()
    })

    it('deals with database errors', async () => {
      const server = await Server.init(internals.brokenManifest, internals.composeOptions)
      const res = await server.inject({
        method: 'POST',
        url: '/api/users',
        payload: {
          username: 'admin',
          password: 'some-passsss',
          scope: ['user']
        },
        credentials: {
          scope: ['admin']
        }
      })

      expect(res.statusCode).to.equal(500)

      await server.stop()
    })
  })

  describe('Read User Tests', () => {
    let userId

    const user = {
      username: 'userrr',
      password: 'some-passs',
      scope: ['user']
    }

    before(async () => {
      const server = await Server.init(internals.manifest, internals.composeOptions)
      const res = await server.inject({
        method: 'POST',
        url: '/api/users',
        payload: user,
        credentials: {
          scope: ['admin']
        }
      })

      userId = res.result.message.match(/^Created user with id (.+)$/)[1]

      await server.stop()
    })

    after(() => knex('users').del())

    it('Reads an user', async () => {
      const server = await Server.init(internals.manifest, internals.composeOptions)
      const res = await server.inject({
        url: `/api/users/${userId}`,
        credentials: {
          scope: ['user']
        }
      })

      expect(res.statusCode).to.equal(200)
      const _user = res.result
      expect(_user.username).to.equal(user.username)
      expect(_user.scope).to.equal(user.scope)
      expect(_user.password).to.not.exist()

      await server.stop()
    })

    it('Returns 404 if user doesnt exist', async () => {
      const server = await Server.init(internals.manifest, internals.composeOptions)
      const res = await server.inject({
        url: '/api/users/99',
        credentials: {
          scope: ['user']
        }
      })

      expect(res.statusCode).to.equal(404)
      expect(res.result.message).to.equal('User not found')

      await server.stop()
    })

    it('deals with database errors', async () => {
      const server = await Server.init(internals.brokenManifest, internals.composeOptions)
      const res = await server.inject({
        url: `/api/users/${userId}`,
        credentials: {
          scope: ['user']
        }
      })

      expect(res.statusCode).to.equal(500)

      await server.stop()
    })
  })

  describe('Update User Tests', () => {
    let userId

    const user = {
      username: 's0m&n4m&',
      password: 'asdlfk',
      scope: ['user']
    }

    before(async () => {
      const server = await Server.init(internals.manifest, internals.composeOptions)
      const res = await server.inject({
        method: 'POST',
        url: '/api/users',
        payload: user,
        credentials: {
          scope: ['admin']
        }
      })
      userId = res.result.message.match(/^Created user with id (.+)$/)[1]

      await server.stop()
    })

    after(() => knex('users').del())

    it('Updates an user', async () => {
      const server = await Server.init(internals.manifest, internals.composeOptions)
      const res = await server.inject({
        method: 'PUT',
        url: `/api/users/${userId}`,
        credentials: {
          scope: ['admin']
        },
        payload: {
          scope: ['user', 'admin']
        }
      })

      expect(res.statusCode).to.equal(200)
      expect(res.result.ok).to.equal(true)
      expect(res.result.message).to.equal(`Updated user ${userId}`)

      const res2 = await server.inject({
        method: 'GET',
        url: `/api/users/${userId}`,
        credentials: {
          scope: ['user']
        }
      })
      const user = res2.result
      expect(user.scope).to.equal(['user', 'admin'])

      await server.stop()
    })

    it('Updates user password', async () => {
      const newPass = 'newPass'
      const server = await Server.init(internals.manifest, internals.composeOptions)
      const res = await server.inject({
        method: 'PUT',
        url: `/api/users/${userId}`,
        credentials: {
          scope: ['admin']
        },
        payload: {
          password: newPass
        }
      })

      expect(res.statusCode).to.equal(200)
      expect(res.result.ok).to.equal(true)
      expect(res.result.message).to.equal(`Updated user ${userId}`)

      const res2 = await server.inject({
        method: 'POST',
        url: `/login`,
        payload: {
          username: user.username,
          password: newPass
        }
      })

      expect(res2.statusCode).to.equal(200)

      await server.stop()
    })

    it('returns 404 if user doesnt exist', async () => {
      const server = await Server.init(internals.manifest, internals.composeOptions)
      const res = await server.inject({
        method: 'PUT',
        url: `/api/users/99`,
        credentials: {
          scope: ['admin']
        },
        payload: {
          scope: ['user', 'admin']
        }
      })

      expect(res.statusCode).to.equal(404)
      expect(res.result.message).to.equal('User not found')

      await server.stop()
    })

    it('deals with database errors', async () => {
      const server = await Server.init(internals.brokenManifest, internals.composeOptions)
      const res = await server.inject({
        method: 'PUT',
        url: `/api/users/${userId}`,
        credentials: {
          scope: ['admin']
        },
        payload: {
          scope: ['user', 'admin']
        }
      })

      expect(res.statusCode).to.equal(500)

      await server.stop()
    })
  })

  describe('Remove User Tests', () => {
    let userId

    const user = {
      username: 'another-user',
      password: 'asdlfk',
      scope: ['user']
    }

    before(async () => {
      const server = await Server.init(internals.manifest, internals.composeOptions)
      const res = await server.inject({
        method: 'POST',
        url: '/api/users',
        payload: user,
        credentials: {
          scope: ['admin']
        }
      })

      userId = res.result.message.match(/^Created user with id (.+)$/)[1]

      await server.stop()
    })

    after(() => knex('users').del())

    it('Removes an user', async () => {
      const server = await Server.init(internals.manifest, internals.composeOptions)
      const res = await server.inject({
        method: 'DELETE',
        url: `/api/users/${userId}`,
        credentials: {
          scope: ['admin']
        }
      })

      expect(res.statusCode).to.equal(204)

      const res2 = await server.inject({
        method: 'GET',
        url: `/api/users/${userId}`,
        credentials: {
          scope: ['user']
        }
      })

      expect(res2.statusCode).to.equal(404)
      expect(res2.result.message).to.equal('User not found')

      await server.stop()
    })

    it('returns 404 if user doesnt exist', async () => {
      const server = await Server.init(internals.manifest, internals.composeOptions)
      const res = await server.inject({
        method: 'DELETE',
        url: `/api/users/99`,
        credentials: {
          scope: ['admin']
        }
      })

      expect(res.statusCode).to.equal(404)
      expect(res.result.message).to.equal('User not found')

      await server.stop()
    })

    it('deals with database errors', async () => {
      const server = await Server.init(internals.brokenManifest, internals.composeOptions)
      const res = await server.inject({
        method: 'DELETE',
        url: `/api/users/${userId}`,
        credentials: {
          scope: ['admin']
        }
      })
      expect(res.statusCode).to.equal(500)

      await server.stop()
    })
  })
})

internals.manifest = {
  connections: [
    { port: 0 }
  ],
  registrations: [
    { plugin: { register: './src/auth', options: { getValidatedUser: UserModel.getValidatedUser } } },
    { plugin: './src/api/users' },
    { plugin: 'hapi-auth-cookie' },
    { plugin: { register: './src/db', options: Config.get('/db') } }
  ]
}

internals.brokenManifest = {
  connections: [
    { port: 0 }
  ],
  registrations: [
    { plugin: { register: './src/auth', options: { getValidatedUser: UserModel.getValidatedUser } } },
    { plugin: { register: './src/api/users' } },
    { plugin: { register: './src/db', options: { client: 'pg', connection: { database: 'inexistent-db' } } } },
    { plugin: 'hapi-auth-cookie' }
  ]
}

internals.composeOptions = {
  relativeTo: Path.resolve(__dirname, '../../..')
}
