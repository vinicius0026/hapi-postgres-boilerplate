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

const Config = require('../../../lib/config')
const dbConfig = require('../../../migrations/config')
const UserModel = require('../../../api/users/model')
const Server = require('../../../lib')

const internals = {}

describe('User API Tests', () => {
  const migrationConfig = Object.assign({}, dbConfig, { relativeTo: Path.resolve(__dirname, '../../../') })

  before({ timeout: 10000 }, done => {
    Migrate(Object.assign({}, migrationConfig, { op: 'up' }))
      .then(done)
      .catch(done)
  })

  after({ timeout: 10000 }, done => {
    Migrate(Object.assign({}, migrationConfig, { op: 'down' }))
      .then(() => {
        done()
      })
      .catch(done)
  })

  describe('List Users Tests', () => {
    it('Lists users if logged as user', done => {
      let server

      Server.init(internals.manifest, internals.composeOptions)
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
            const list = res.result
            expect(list).to.be.an.array()
            list.every(item => {
              expect(item.username).to.be.a.string()
              expect(item.scope).to.be.an.array()
            })
            server.stop(done)
          })
          .catch(done)
        })
    })

    it('handles errors in db', done => {
      let server
      const manifest = {
        connections: [
          { port: 0 }
        ],
        registrations: [
          { plugin: { register: './lib/auth', options: { getValidatedUser: UserModel.getValidatedUser } } },
          { plugin: { register: './api/users' } },
          { plugin: { register: './lib/db', options: { db: 'hapi_rethinkdb_boilerplate_test', port: 28016, silent: true } } },
          { plugin: 'hapi-auth-cookie' }
        ]
      }

      Server.init(manifest, internals.composeOptions)
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
          server.stop(done)
        })
        .catch(err => {
          server.stop(error => done(error || err))
        })
    })
  })

  describe('Create User Tests', () => {
    it('creates user if authenticated as admin', done => {
      let server

      Server.init(internals.manifest, internals.composeOptions)
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

          server.stop(done)
        })
        .catch(done)
    })

    it('doesnt create user if username is already taken', done => {
      let server

      Server.init(internals.manifest, internals.composeOptions)
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
          server.stop(done)
        })
        .catch(done)
    })
  })

  describe('Read User Tests', () => {
    let server
    let userId

    const user = {
      username: 'userrr',
      password: 'some-passs',
      scope: ['user']
    }

    before(done => {
      Server.init(internals.manifest, internals.composeOptions)
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
        })
        .then(done)
        .catch(done)
    })

    after(done => server.stop(done))

    it('Reads an user', done => {
      server.inject({
        url: `/api/users/${userId}`,
        credentials: {
          scope: ['user']
        }
      })
      .then(res => {
        expect(res.statusCode).to.equal(200)
        const _user = res.result
        expect(_user.username).to.equal(user.username)
        expect(_user.scope).to.equal(user.scope)
        expect(_user.password).to.not.exist()
        done()
      })
      .catch(done)
    })

    it('Returns 404 if user doesnt exist', done => {
      server.inject({
        url: '/api/users/99',
        credentials: {
          scope: ['user']
        }
      })
      .then(res => {
        expect(res.statusCode).to.equal(404)
        expect(res.result.message).to.equal('User not found')
        done()
      })
      .catch(done)
    })
  })

  describe('Update User Tests', () => {
    let server
    let userId

    const user = {
      username: 's0m&n4m&',
      password: 'asdlfk',
      scope: ['user']
    }

    before(done => {
      Server.init(internals.manifest, internals.composeOptions)
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
        })
        .then(done)
        .catch(done)
    })

    after(done => server.stop(done))

    it('Updates an user', done => {
      server.inject({
        method: 'PUT',
        url: `/api/users/${userId}`,
        credentials: {
          scope: ['admin']
        },
        payload: {
          scope: ['user', 'admin']
        }
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
        done()
      })
      .catch(done)
    })

    it('returns 404 if user doesnt exist', done => {
      server.inject({
        method: 'PUT',
        url: `/api/users/99`,
        credentials: {
          scope: ['admin']
        },
        payload: {
          scope: ['user', 'admin']
        }
      })
      .then(res => {
        expect(res.statusCode).to.equal(404)
        expect(res.result.message).to.equal('User not found')
        done()
      })
      .catch(done)
    })
  })

  describe('Remove User Tests', () => {
    let server
    let userId

    const user = {
      username: 'another-user',
      password: 'asdlfk',
      scope: ['user']
    }

    before(done => {
      Server.init(internals.manifest, internals.composeOptions)
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
        })
        .then(done)
        .catch(done)
    })

    after(done => server.stop(done))

    it('Removes an user', done => {
      server.inject({
        method: 'DELETE',
        url: `/api/users/${userId}`,
        credentials: {
          scope: ['admin']
        }
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
        done()
      })
      .catch(done)
    })

    it('returns 404 if user doesnt exist', done => {
      server.inject({
        method: 'DELETE',
        url: `/api/users/99`,
        credentials: {
          scope: ['admin']
        }
      })
      .then(res => {
        expect(res.statusCode).to.equal(404)
        expect(res.result.message).to.equal('User not found')
        done()
      })
      .catch(done)
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
