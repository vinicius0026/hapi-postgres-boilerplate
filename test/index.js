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

  it('Server.init returns a promise that resolves to a hapi server instance', async () => {
    const manifest = {}
    const options = {}

    const server = await Server.init(manifest, options)

    expect(server).to.be.instanceof(Hapi.Server)
    await server.stop()
  })

  it('handles error in registrations', async () => {
    const manifest = {
      registrations: [
        { plugin: 'inexistent-plugin' }
      ]
    }
    const options = {}

    try {
      await Server.init(manifest, options)
    } catch (err) {
      expect(err).to.exist()
      expect(err.message).to.equal('Cannot find module \'inexistent-plugin\'')
    }
  })

  it('works with manifest.js and composeOptions files', async () => {
    const manifest = require('../src/manifest')
    const options = require('../src/composeOptions')

    const server = await Server.init(manifest, options)

    expect(server).to.be.instanceof(Hapi.Server)
    await server.stop()
  })
})
