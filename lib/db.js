'use strict'

const rethinkdbdash = require('rethinkdbdash')

exports.register = (server, options, next) => {
  server.app.r = rethinkdbdash(options)
  next()
}

exports.register.attributes = {
  name: 'Database'
}
