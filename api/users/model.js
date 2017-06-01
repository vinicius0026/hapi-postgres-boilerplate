'use strict'

const Bcrypt = require('bcrypt')
const Boom = require('boom')
const Joi = require('joi')

const internals = {}
let User

internals.model = {
  id: Joi.number().min(0),
  username: Joi.string().min(3).max(50).description('User\'s username, used for login'),
  password: Joi.string().min(3).max(50).description('User\'s password, used for login'),
  scope: Joi.array().items(Joi.string().valid('user', 'admin'))
    .description('User\'s role, used for determining what the user will be able to do in the system')
}

internals.SALT_ROUNDS = 10

module.exports = function (di) {
  Object.assign(internals, di)

  const { bookshelf } = internals

  User = bookshelf.Model.extend({
    tableName: 'users',
    hidden: ['hash']
  })

  return {
    getValidatedUser,
    create,
    read,
    update,
    remove,
    list
  }
}

module.exports.model = internals.model

function create (data) {
  return Bcrypt.hash(data.password, internals.SALT_ROUNDS)
    .then(hash => {
      delete data.password
      const user = Object.assign({}, data, { hash })
      return User.forge(user).save()
    })
    .then(user => user.get('id'))
}

function read (id) {
  return User.forge({ id })
    .fetch()
    .then(user => user.toJSON())
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
    .then(data => {
      return User.forge({ id })
        .fetch({ require: true })
        .then(user => user.save(data))
        .catch(err => {
          if (err.message === 'EmptyResponse') {
            return Boom.notFound('User not found')
          }

          throw err
        })
    })
}

function remove (id) {
  return User.forge({ id })
    .fetch({ require: true })
    .then(user => {
      return user.destroy()
    })
    .catch(err => {
      if (err.message === 'EmptyResponse') {
        return Boom.notFound('User not found')
      }

      return Boom.wrap(err)
    })
}

function list ({ page, limit }) {
  return User.fetchPage({ page, pageSize: limit })
    .then(results => {
      return {
        pagination: {
          totalItems: results.pagination.rowCount,
          page,
          limit
        },
        data: results.toJSON()
      }
    })
}

function getValidatedUser (username, password) {
  return User.forge({ username })
    .fetch({ require: true })
    .then(user => {
      return Bcrypt.compare(password, user.get('hash'))
        .then(validPass => {
          if (!validPass) {
            return Promise.resolve()
          }

          return Promise.resolve(user.toJSON())
        })
    })
    .catch(err => {
      if (err.message === 'EmptyResponse') {
        return Promise.resolve()
      }

      throw err
    })
}
