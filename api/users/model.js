'use strict'

const Bcrypt = require('bcrypt')
const Boom = require('boom')
const Joi = require('joi')

const internals = {}

internals.model = {
  id: Joi.number().min(0),
  username: Joi.string().min(3).max(50).description('User\'s username, used for login'),
  password: Joi.string().min(3).max(50).description('User\'s password, used for login'),
  scope: Joi.array().items(Joi.string().valid('user', 'admin'))
    .description('User\'s role, used for determining what the user will be able to do in the system')
}

internals.SALT_ROUNDS = 10

module.exports = function (_di) {
  const di = _di || {}

  Object.assign(internals, di)

  return {
    getValidatedUser,
    model: internals.model,
    create,
    read,
    update,
    remove,
    list
  }
}

function create (data) {
  const { r } = internals

  return r.table('users').filter({ username: data.username }).run()
    .then(users => {
      if (users.length) {
        return Promise.reject(Boom.badRequest('Username already taken'))
      }
      return Bcrypt.hash(data.password, internals.SALT_ROUNDS)
    })
    .then(hash => {
      delete data.password
      const user = Object.assign({}, data, { hash })
      return r.table('users').insert(user).run()
    })
    .then(result => {
      return Promise.resolve(result.generated_keys[0])
    })
}

function read (id) {
  return internals.r.table('users').get(id).pluck('id', 'username', 'scope').run()
    .catch(err => {
      if (err.message.match(/^Cannot perform pluck on a non-object non-sequence `null`/)) {
        return Promise.reject(Boom.notFound('User not found'))
      }
      throw err
    })
}

function update (id, data) {
  return Promise.resolve()
    .then(() => {
      if (data.password) {
        return Bcrypt.hash(data.password, internals.SALT_ROUNDS)
          .then(hash => {
            delete data.password
            return Object.assign({}, data, { hash })
          })
      }

      return data
    })
    .then(data => internals.r.table('users').get(id).update(data, { returnChanges: true }).run())
    .then(result => {
      if (result.skipped === 1) {
        return Promise.reject(Boom.notFound('User not found'))
      }
      return Promise.resolve(result.changes[0].new_val)
    })
}

function remove (id) {
  return internals.r.table('users').get(id).delete().run()
    .then(result => {
      if (result.deleted === 0) {
        return Promise.reject(Boom.notFound('User not found'))
      }
      return Promise.resolve()
    })
}

function list ({ page, limit }) {
  return Promise.all([
    internals.r.table('users').count().run(),
    internals.r.table('users').slice((page - 1) * limit, page * limit).withFields('id', 'username', 'scope').run()
  ])
  .then(([totalItems, data]) => ({
    pagination: {
      totalItems,
      page,
      limit
    },
    data
  }))
}

function getValidatedUser (username, password) {
  return internals.r.table('users').filter({ username: username }).run()
    .then(users => {
      if (users.length === 0) {
        return Promise.resolve()
      }

      const user = users[0]

      return Bcrypt.compare(password, user.hash)
        .then(validPass => {
          if (!validPass) {
            return Promise.resolve()
          }

          const _user = Object.assign({}, user)
          delete _user.password
          delete _user.hash
          return Promise.resolve(_user)
        })
    })
}
