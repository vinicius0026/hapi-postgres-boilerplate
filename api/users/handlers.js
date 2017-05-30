'use strict'

const Boom = require('boom')

const Model = require('./model')

const internals = {}

module.exports = function (options) {
  internals.model = Model(options)

  return {
    create,
    read,
    update,
    remove,
    list
  }
}

function create (request, reply) {
  return internals.model.create(request.payload)
    .then(id => reply({ ok: true, message: `Created user with id ${id}` }).code(201))
    .catch(err => reply(Boom.wrap(err)))
}

function read (request, reply) {
  const id = request.params.id
  return internals.model.read(id)
    .then(reply)
    .catch(err => reply(Boom.wrap(err)))
}

function update (request, reply) {
  const id = request.params.id
  const payload = request.payload
  return internals.model.update(id, payload)
    .then(user => reply({ ok: true, message: `Updated user ${user.id}` }))
    .catch(err => reply(Boom.wrap(err)))
}

function remove (request, reply) {
  const id = request.params.id
  return internals.model.remove(id)
    .then(() => reply().code(204))
    .catch(err => reply(Boom.wrap(err)))
}

function list (request, reply) {
  return internals.model.list(request.query)
    .then(reply)
    .catch(err => reply(Boom.wrap(err)))
}
