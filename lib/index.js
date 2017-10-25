'use strict'

const Glue = require('glue')

const internals = {}

internals.init = function (manifest, options) {
  let server

  return Glue.compose(manifest, options)
    .then(_server => {
      server = _server

      server.ext({
        type: 'onPreStop',
        method: (server, next) => {
          const { bookshelf } = server.app

          if (!bookshelf) {
            return next()
          }

          bookshelf.knex.destroy(next)
        }
      })
    })
    .then(() => server.start())
    .then(() => server)
    .catch(err => {
      throw err
    })
}

exports.init = internals.init
