'use strict'

const Glue = require('glue')

const internals = {}

internals.init = function (manifest, options) {
  let server

  return Glue.compose(manifest, options)
    .then(_server => {
      server = _server
    })
    .then(() => server.start())
    .then(() => server)
    .catch(err => {
      throw err
    })
}

exports.init = internals.init
