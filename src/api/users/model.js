'use strict'

const _ = require('lodash')
const Bcrypt = require('bcrypt')
const Boom = require('boom')
const Joi = require('joi')
const R = require('ramda')

const internals = {}

internals.BaseModel = require('../../util/BaseModel')

internals.schema = {
  id: Joi.number().min(0),
  username: Joi.string().min(3).max(50).description('User\'s username, used for login'),
  password: Joi.string().min(3).max(50).description('User\'s password, used for login'),
  scope: Joi.array().items(Joi.string().valid('user', 'admin'))
    .description('User\'s role, used for determining what the user will be able to do in the system')
}

internals.SALT_ROUNDS = 10

module.exports = function (di) {
  Object.assign(internals, di)

  const { BaseModel, knex } = internals

  class User extends BaseModel {
    static get tableName () {
      return 'users'
    }

    static async create (data) {
      const hash = await Bcrypt.hash(data.password, internals.SALT_ROUNDS)

      try {
        const user = await User.query()
          .insert((R.omit(['password'], { ...data, hash })))

        return user.id
      } catch (err) {
        if (err.message.match(/violates unique constraint "users_username_unique"/)) {
          throw Boom.badRequest('Username already taken')
        }

        throw Boom.wrap(err)
      }
    }

    static async read (id) {
      try {
        const [user] = await User.query().where('id', id).omit(['hash'])

        if (!user) {
          throw Boom.notFound('User not found')
        }

        return user
      } catch (err) {
        throw Boom.wrap(err)
      }
    }

    static async update (id, data) {
      try {
        let updateData
        if (data.password) {
          const hash = await Bcrypt.hash(data.password, internals.SALT_ROUNDS)
          updateData = R.omit(['password'], { ...data, hash })
        } else {
          updateData = data
        }

        const user = await User.query().patchAndFetchById(id, updateData).omit(['hash'])

        if (!user) {
          throw Boom.notFound('User not found')
        }

        return user
      } catch (err) {
        throw Boom.wrap(err)
      }
    }

    static async delete (id) {
      try {
        const deleted = await User.query().delete().where('id', id)

        if (!deleted) {
          throw Boom.notFound('User not found')
        }

        return
      } catch (err) {
        throw Boom.wrap(err)
      }
    }

    static async list ({ page, limit }) {
      try {
        const result = await User
          .query()
          .omit(['hash'])
          .page(page - 1, limit)

        return {
          pagination: {
            totalItems: result.total,
            page,
            limit
          },
          data: result.results
        }
      } catch (err) {
        throw Boom.wrap(err)
      }
    }

    static async getValidatedUser (username, password) {
      const [user] = await User.query().where('username', username)

      if (!user) {
        return null
      }

      const validPass = await Bcrypt.compare(password, user.hash)

      if (!validPass) {
        return null
      }

      return _.omit(user, ['hash'])
    }
  }

  User.knex(knex)

  return User
}

module.exports.schema = internals.schema
