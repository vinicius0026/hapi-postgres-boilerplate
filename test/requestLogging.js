'use strict'

const Code = require('code')
const Lab = require('lab')
const Path = require('path')

const lab = exports.lab = Lab.script()
const describe = lab.experiment
const expect = Code.expect
const it = lab.test

const dbConfig = require('../knexfile')
const knex = require('knex')(dbConfig)
const bookshelf = require('bookshelf')(knex)

const Config = require('../src/config')
const UserModel = require('../src/api/users/model')({ bookshelf })
const Server = require('../src')

const internals = {}

describe('Request Logging', () => {
  it('emmits request event when a request is sent to server', () => {
    let server
    return Server.init(internals.manifest, internals.composeOptions)
      .then(_server => {
        server = _server

        const admin = {
          username: 'admin',
          password: 'p4$$w0Rd'
        }

        server.on('request', (request, event, tags) => {
          const logData = event.data

          expect(logData.path).to.equal('/login')
          expect(logData.payload).to.equal({
            username: admin.username,
            password: admin.password
          })
          expect(logData.headers).to.be.an.object()
        })

        return server.inject({
          method: 'POST',
          url: '/login',
          payload: {
            username: admin.username,
            password: admin.password
          }
        })
      })
  })
})

internals.manifest = {
  connections: [
    { port: 0 }
  ],
  registrations: [
    { plugin: { register: './src/auth', options: { getValidatedUser: UserModel.getValidatedUser } } },
    { plugin: './src/requestLogging' },
    { plugin: 'hapi-auth-cookie' },
    { plugin: { register: './src/db', options: Config.get('/db') } }
  ]
}

internals.composeOptions = {
  relativeTo: Path.resolve(__dirname, '..')
}
