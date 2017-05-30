'use strict'

const Code = require('code')
const Hapi = require('hapi')
const Lab = require('lab')

const Server = require('../lib')

const lab = exports.lab = Lab.script()
const describe = lab.experiment
const expect = Code.expect
const it = lab.test

describe('Server', () => {
  it('exports an object', done => {
    expect(Server).to.be.an.object()
    done()
  })

  it('exports an init function', done => {
    expect(Server.init).to.be.a.function()
    done()
  })

  it('Server.init returns a promise that resolves to a hapi server instance', done => {
    const manifest = {}
    const options = {}

    Server.init(manifest, options)
      .then(server => {
        expect(server).to.be.instanceof(Hapi.Server)
        server.stop(done)
      })
      .catch(done)
  })

  it('handles error in registrations', done => {
    const manifest = {
      registrations: [
        { plugin: 'inexistent-plugin' }
      ]
    }
    const options = {}

    Server.init(manifest, options)
      .catch(err => {
        expect(err).to.exist()
        expect(err.message).to.equal('Cannot find module \'inexistent-plugin\'')
        done()
      })
  })

  it('works with manifest.js and composeOptions files', done => {
    const manifest = require('../lib/manifest')
    const options = require('../lib/composeOptions')

    Server.init(manifest, options)
      .then(server => {
        expect(server).to.be.instanceof(Hapi.Server)
        server.stop(done)
      })
      .catch(done)
  })
})
