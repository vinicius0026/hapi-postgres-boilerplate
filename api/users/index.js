'use strict'

const Joi = require('joi')

const User = require('./model')()
const Handlers = require('./handlers')

const internals = {}

internals.basePath = '/api/users'

exports.register = (server, options, next) => {
  internals.options = options

  server.dependency(['Auth'], internals.registerRoutes)
  next()
}

exports.register.attributes = {
  name: 'UserAPIRouter'
}

internals.registerRoutes = function (server, next) {
  internals.options.r = server.app.r
  internals.handlers = Handlers(internals.options)

  server.route([
    {
      method: 'POST',
      path: internals.basePath,
      config: {
        description: 'Create users',
        validate: {
          payload: {
            username: User.model.username.required(),
            password: User.model.password.required(),
            scope: User.model.scope.default(['user'])
          }
        },
        handler: internals.handlers.create
      }
    },
    {
      method: 'GET',
      path: `${internals.basePath}/{id}`,
      config: {
        auth: {
          access: {
            scope: ['user', 'admin']
          }
        },
        description: 'Read user data',
        handler: internals.handlers.read
      }
    },
    {
      method: 'PUT',
      path: `${internals.basePath}/{id}`,
      config: {
        description: 'Update user info',
        handler: internals.handlers.update,
        validate: {
          payload: {
            password: User.model.password,
            scope: User.model.scope
          }
        }
      }
    },
    {
      method: 'DELETE',
      path: `${internals.basePath}/{id}`,
      config: {
        description: 'Removes user',
        handler: internals.handlers.remove
      }
    },
    {
      method: 'GET',
      path: `${internals.basePath}`,
      config: {
        auth: {
          access: {
            scope: ['user', 'admin']
          }
        },
        validate: {
          query: {
            limit: Joi.number().integer().min(1).max(100).default(10).description('number of items per page'),
            page: Joi.number().integer().min(1).default(1).description('page to fetch')
          }
        },
        description: 'Lists users',
        handler: internals.handlers.list
      }
    }
  ])

  next()
}
