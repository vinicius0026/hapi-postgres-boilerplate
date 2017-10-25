'use strict'

const Code = require('code')
const Hapi = require('hapi')
const Lab = require('lab')

const Server = require('../src')

const { describe, it } = exports.lab = Lab.script()
const { expect } = Code

describe('Server', () => {
  it('exports an object', () => {
    expect(Server).to.be.an.object()
  })

  it('exports an init function', () => {
    expect(Server.init).to.be.a.function()
  })

  it('Server.init returns a promise that resolves to a hapi server instance', () => {
    const manifest = {}
    const options = {}

    return Server.init(manifest, options)
      .then(server => {
        expect(server).to.be.instanceof(Hapi.Server)
        return server.stop()
      })
  })

  it('handles error in registrations', () => {
    const manifest = {
      registrations: [
        { plugin: 'inexistent-plugin' }
      ]
    }
    const options = {}

    return Server.init(manifest, options)
      .catch(err => {
        expect(err).to.exist()
        expect(err.message).to.equal('Cannot find module \'inexistent-plugin\'')
      })
  })

  it('works with manifest.js and composeOptions files', () => {
    const manifest = require('../src/manifest')
    const options = require('../src/composeOptions')

    return Server.init(manifest, options)
      .then(server => {
        expect(server).to.be.instanceof(Hapi.Server)

        return server.stop()
      })
  })
})
