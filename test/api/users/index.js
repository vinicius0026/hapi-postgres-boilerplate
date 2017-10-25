'use strict'

const Code = require('code')
const Lab = require('lab')
const Path = require('path')

const { describe, it, before, after } = exports.lab = Lab.script()
const { expect } = Code

const dbConfig = require('../../../knexfile')

const Config = require('../../../lib/config')
const Server = require('../../../lib')

const knex = require('knex')(dbConfig)
const bookshelf = require('bookshelf')(knex)
const UserModel = require('../../../api/users/model')({ bookshelf })

const internals = {}

describe('User API Tests', () => {
  before(() => knex.migrate.latest())

  after(() => knex.migrate.rollback()
    .then(() => knex.destroy())
  )

  describe('List Users Tests', () => {
    it('Lists users if logged as user', () => {
      let server

      return Server.init(internals.manifest, internals.composeOptions)
        .then(_server => {
          server = _server

          return server.inject({
            method: 'GET',
            url: '/api/users',
            credentials: {
              scope: ['user']
            }
          })
          .then(res => {
            expect(res.statusCode).to.equal(200)
            const list = res.result.data
            expect(list).to.be.an.array()
            list.every(item => {
              expect(item.username).to.be.a.string()
              expect(item.scope).to.be.an.array()
            })
            const pagination = res.result.pagination
            expect(pagination).to.equal({
              totalItems: 1,
              page: 1,
              limit: 10
            })
            return server.stop()
          })
        })
    })

    it('handles errors in db', () => {
      let server
      const manifest = {
        connections: [
          { port: 0 }
        ],
        registrations: [
          { plugin: { register: './lib/auth', options: { getValidatedUser: UserModel.getValidatedUser } } },
          { plugin: { register: './api/users' } },
          { plugin: { register: './lib/db', options: { client: 'pg', connection: { database: 'inexistent-db' } } } },
          { plugin: 'hapi-auth-cookie' }
        ]
      }

      return Server.init(manifest, internals.composeOptions)
        .then(_server => {
          server = _server

          return server.inject({
            url: '/api/users',
            credentials: {
              scope: ['user']
            }
          })
        })
        .then(res => {
          expect(res.statusCode).to.equal(500)
          return server.stop()
        })
    })
  })

  describe('Create User Tests', () => {
    it('creates user if authenticated as admin', () => {
      let server

      return Server.init(internals.manifest, internals.composeOptions)
        .then(_server => {
          server = _server

          return server.inject({
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
        })
        .then(res => {
          expect(res.statusCode).to.equal(201)
          expect(res.result.ok).to.equal(true)
          expect(res.result.message).to.match(/^Created user with id .+$/)

          return server.stop()
        })
    })

    it('doesnt create user if username is already taken', () => {
      let server

      return Server.init(internals.manifest, internals.composeOptions)
        .then(_server => {
          server = _server

          return server.inject({
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
        })
        .then(res => {
          expect(res.statusCode).to.equal(400)
          expect(res.result.message).to.equal('Username already taken')

          return server.stop()
        })
    })
  })

  describe('Read User Tests', () => {
    let userId

    const user = {
      username: 'userrr',
      password: 'some-passs',
      scope: ['user']
    }

    before(() => {
      let server
      return Server.init(internals.manifest, internals.composeOptions)
        .then(_server => {
          server = _server

          return server.inject({
            method: 'POST',
            url: '/api/users',
            payload: user,
            credentials: {
              scope: ['admin']
            }
          })
        })
        .then(res => {
          userId = res.result.message.match(/^Created user with id (.+)$/)[1]

          return server.stop()
        })
    })

    after(() => knex('users').del())

    it('Reads an user', () => {
      let server

      return Server.init(internals.manifest, internals.composeOptions)
        .then(_server => {
          server = _server

          return server.inject({
            url: `/api/users/${userId}`,
            credentials: {
              scope: ['user']
            }
          })
        })
        .then(res => {
          expect(res.statusCode).to.equal(200)
          const _user = res.result
          expect(_user.username).to.equal(user.username)
          expect(_user.scope).to.equal(user.scope)
          expect(_user.password).to.not.exist()

          return server.stop()
        })
    })

    it('Returns 404 if user doesnt exist', () => {
      let server

      return Server.init(internals.manifest, internals.composeOptions)
        .then(_server => {
          server = _server

          return server.inject({
            url: '/api/users/99',
            credentials: {
              scope: ['user']
            }
          })
        })
        .then(res => {
          expect(res.statusCode).to.equal(404)
          expect(res.result.message).to.equal('User not found')

          return server.stop()
        })
    })
  })

  describe('Update User Tests', () => {
    let userId

    const user = {
      username: 's0m&n4m&',
      password: 'asdlfk',
      scope: ['user']
    }

    before(() => {
      let server
      return Server.init(internals.manifest, internals.composeOptions)
        .then(_server => {
          server = _server

          return server.inject({
            method: 'POST',
            url: '/api/users',
            payload: user,
            credentials: {
              scope: ['admin']
            }
          })
        })
        .then(res => {
          userId = res.result.message.match(/^Created user with id (.+)$/)[1]

          return server.stop()
        })
    })

    after(() => knex('users').del())

    it('Updates an user', () => {
      let server

      return Server.init(internals.manifest, internals.composeOptions)
        .then(_server => {
          server = _server

          return server.inject({
            method: 'PUT',
            url: `/api/users/${userId}`,
            credentials: {
              scope: ['admin']
            },
            payload: {
              scope: ['user', 'admin']
            }
          })
        })
        .then(res => {
          expect(res.statusCode).to.equal(200)
          expect(res.result.ok).to.equal(true)
          expect(res.result.message).to.equal(`Updated user ${userId}`)

          return server.inject({
            method: 'GET',
            url: `/api/users/${userId}`,
            credentials: {
              scope: ['user']
            }
          })
        })
        .then(res => {
          const user = res.result
          expect(user.scope).to.equal(['user', 'admin'])

          return server.stop()
        })
    })

    it('returns 404 if user doesnt exist', () => {
      let server

      return Server.init(internals.manifest, internals.composeOptions)
        .then(_server => {
          server = _server

          return server.inject({
            method: 'PUT',
            url: `/api/users/99`,
            credentials: {
              scope: ['admin']
            },
            payload: {
              scope: ['user', 'admin']
            }
          })
        })
        .then(res => {
          expect(res.statusCode).to.equal(404)
          expect(res.result.message).to.equal('User not found')

          return server.stop()
        })
    })
  })

  describe('Remove User Tests', () => {
    let userId

    const user = {
      username: 'another-user',
      password: 'asdlfk',
      scope: ['user']
    }

    before(() => {
      let server
      return Server.init(internals.manifest, internals.composeOptions)
        .then(_server => {
          server = _server

          return server.inject({
            method: 'POST',
            url: '/api/users',
            payload: user,
            credentials: {
              scope: ['admin']
            }
          })
        })
        .then(res => {
          userId = res.result.message.match(/^Created user with id (.+)$/)[1]

          return server.stop()
        })
    })

    after(() => knex('users').del())

    it('Removes an user', () => {
      let server

      return Server.init(internals.manifest, internals.composeOptions)
        .then(_server => {
          server = _server

          return server.inject({
            method: 'DELETE',
            url: `/api/users/${userId}`,
            credentials: {
              scope: ['admin']
            }
          })
        })
        .then(res => {
          expect(res.statusCode).to.equal(204)

          return server.inject({
            method: 'GET',
            url: `/api/users/${userId}`,
            credentials: {
              scope: ['user']
            }
          })
        })
        .then(res => {
          expect(res.statusCode).to.equal(404)
          expect(res.result.message).to.equal('User not found')

          return server.stop()
        })
    })

    it('returns 404 if user doesnt exist', () => {
      let server

      return Server.init(internals.manifest, internals.composeOptions)
        .then(_server => {
          server = _server

          return server.inject({
            method: 'DELETE',
            url: `/api/users/99`,
            credentials: {
              scope: ['admin']
            }
          })
        })
        .then(res => {
          expect(res.statusCode).to.equal(404)
          expect(res.result.message).to.equal('User not found')

          return server.stop()
        })
    })
  })
})

internals.manifest = {
  connections: [
    { port: 0 }
  ],
  registrations: [
    { plugin: { register: './lib/auth', options: { getValidatedUser: UserModel.getValidatedUser } } },
    { plugin: './api/users' },
    { plugin: 'hapi-auth-cookie' },
    { plugin: { register: './lib/db', options: Config.get('/db') } }
  ]
}

internals.composeOptions = {
  relativeTo: Path.resolve(__dirname, '../../..')
}
