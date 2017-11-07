'use strict'

exports.register = (server, options, next) => {
  const knex = require('knex')(options)

  server.app.knex = knex
  next()
}

exports.register.attributes = {
  name: 'Database'
}
