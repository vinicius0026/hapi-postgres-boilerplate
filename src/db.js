'use strict'

exports.register = (server, options, next) => {
  const knex = require('knex')(options)
  const bookshelf = require('bookshelf')(knex)

  bookshelf.plugin(['visibility', 'bookshelf-camelcase', 'pagination'])
  server.app.bookshelf = bookshelf
  next()
}

exports.register.attributes = {
  name: 'Database'
}
