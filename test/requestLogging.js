'use strict'

const Code = require('code')
const Lab = require('lab')
const Path = require('path')

const lab = exports.lab = Lab.script()
const describe = lab.experiment
const expect = Code.expect
const it = lab.test

const Config = require('../lib/config')
const UserModel = require('../api/users/model')()
const Server = require('../lib')

const internals = {}

describe('Request Logging', () => {
  it('emmits request event when a request is sent to server', done => {
    let server
    Server.init(internals.manifest, internals.composeOptions)
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
          done()
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
      .catch(done)
  })
})

internals.manifest = {
  connections: [
    { port: 0 }
  ],
  registrations: [
    { plugin: { register: './lib/auth', options: { getValidatedUser: UserModel.getValidatedUser } } },
    { plugin: './lib/requestLogging' },
    { plugin: 'hapi-auth-cookie' },
    { plugin: { register: './lib/db', options: Config.get('/db') } }
  ]
}

internals.composeOptions = {
  relativeTo: Path.resolve(__dirname, '..')
}
