'use strict'

const Bcrypt = require('bcrypt')
const Boom = require('boom')
const Joi = require('joi')
const R = require('ramda')

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

async function create (data) {
  const hash = await Bcrypt.hash(data.password, internals.SALT_ROUNDS)

  try {
    const user = await User.forge(R.omit(['password'], { ...data, hash })).save()

    return user.get('id')
  } catch (err) {
    if (err.message.match(/violates unique constraint "users_username_unique"/)) {
      throw Boom.badRequest('Username already taken')
    }

    throw Boom.wrap(err)
  }
}

async function read (id) {
  try {
    const user = await User.forge({ id }).fetch({ require: true })
    return user.toJSON()
  } catch (err) {
    if (err.message === 'EmptyResponse') {
      throw Boom.notFound('User not found')
    }

    throw Boom.wrap(err)
  }
}

async function update (id, data) {
  try {
    let updateData
    if (data.password) {
      const hash = await Bcrypt.hash(data.password, internals.SALT_ROUNDS)
      updateData = R.omit(['password'], { ...data, hash })
    } else {
      updateData = data
    }

    const user = await User
      .forge({ id })
      .fetch({ require: true })

    return user.save(updateData)
  } catch (err) {
    if (err.message === 'EmptyResponse') {
      throw Boom.notFound('User not found')
    }

    throw Boom.wrap(err)
  }
}

async function remove (id) {
  try {
    const user = await User
      .forge({ id })
      .fetch({ require: true })
    return user.destroy()
  } catch (err) {
    if (err.message === 'EmptyResponse') {
      throw Boom.notFound('User not found')
    }

    throw Boom.wrap(err)
  }
}

async function list ({ page, limit }) {
  try {
    const results = await User.fetchPage({ page, pageSize: limit })
    return {
      pagination: {
        totalItems: results.pagination.rowCount,
        page,
        limit
      },
      data: results.toJSON()
    }
  } catch (err) {
    throw Boom.wrap(err)
  }
}

async function getValidatedUser (username, password) {
  const user = await User.forge({ username }).fetch({ require: true })
  const validPass = await Bcrypt.compare(password, user.get('hash'))

  if (!validPass) {
    return null
  }

  return user.toJSON()
}
