'use strict'

const Config = require('./config')
const UserModel = require('../api/users/model')

module.exports = {
  connections: [
    { host: 'localhost', port: 8000 }
  ],
  registrations: [
    // API Routes Plugins
    { plugin: './api/users' },

    // Project Plugins
    { plugin: { register: './lib/auth', options: { getValidatedUser: UserModel.getValidatedUser } } },
    { plugin: './lib/requestLogging' },
    { plugin: { register: './lib/db', options: Config.get('/db') } },

    // Vendor Plugins
    { plugin: 'hapi-auth-cookie' },
    { plugin: 'inert' },
    { plugin: 'vision' },
    { plugin: 'lout' },
    { plugin: { register: 'good', options: Config.get('/logging') } }
  ]
}
