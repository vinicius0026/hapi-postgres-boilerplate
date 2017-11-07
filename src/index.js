'use strict'

const Glue = require('glue')

const internals = {}

internals.init = async function (manifest, options) {
  const server = await Glue.compose(manifest, options)

  server.ext({
    type: 'onPreStop',
    method: (server, next) => {
      const { knex } = server.app

      if (!knex) {
        return next()
      }

      knex.destroy(next)
    }
  })

  await server.start()

  return server
}

exports.init = internals.init
