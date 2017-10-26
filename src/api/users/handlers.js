'use strict'

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

async function create (request, reply) {
  try {
    const id = await internals.model.create(request.payload)
    return reply({ ok: true, message: `Created user with id ${id}` }).code(201)
  } catch (err) {
    return reply(err)
  }
}

async function read (request, reply) {
  const { id } = request.params
  try {
    const user = await internals.model.read(id)
    return reply(user)
  } catch (err) {
    return reply(err)
  }
}

async function update (request, reply) {
  const { id } = request.params
  const { payload } = request
  try {
    const user = await internals.model.update(id, payload)
    return reply({ ok: true, message: `Updated user ${user.id}` })
  } catch (err) {
    return reply(err)
  }
}

async function remove (request, reply) {
  const { id } = request.params
  try {
    await internals.model.remove(id)
    return reply().code(204)
  } catch (err) {
    return reply(err)
  }
}

async function list (request, reply) {
  try {
    const results = await internals.model.list(request.query)
    return reply(results)
  } catch (err) {
    return reply(err)
  }
}
