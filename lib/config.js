'use strict'

const Confidence = require('confidence')
const Dotenv = require('dotenv')

Dotenv.config()

const internals = {}

const criteria = {
  env: process.env.NODE_ENV
}

const config = {
  $meta: 'Environment based configuration',
  cookieSecret: {
    $filter: 'env',
    prod: process.env.COOKIE_SECRET,
    $default: 'superlongandsecretpasswordthatnoonewillguess'
  },
  logging: {
    $filter: 'env',
    test: {},
    dev: {
      reporters: {
        requests: [
          { module: 'good-squeeze', name: 'Squeeze', args: [{ log: '*', request: '*', response: '*' }] },
          { module: 'good-console' },
          'stdout'
        ],
        errors: [
          { module: 'good-squeeze', name: 'Squeeze', args: [{ error: '*' }] },
          { module: 'good-console' },
          'stderr'
        ]
      }
    },
    prod: {
      ops: {
        interval: 30000
      },
      reporters: {
        requests: [
          { module: 'good-squeeze', name: 'Squeeze', args: [{ log: '*', request: '*', response: '*' }] },
          { module: 'good-squeeze', name: 'SafeJson' },
          { module: 'good-file', args: ['./logs/requests.log'] }
        ],
        errors: [
          { module: 'good-squeeze', name: 'Squeeze', args: [{ error: '*' }] },
          { module: 'good-squeeze', name: 'SafeJson' },
          { module: 'good-file', args: ['./logs/errors.log'] }
        ],
        operational: [
          { module: 'good-squeeze', name: 'Squeeze', args: [{ ops: '*' }] },
          { module: 'good-squeeze', name: 'SafeJson' },
          { module: 'good-file', args: ['./logs/operational.log'] }
        ]
      }
    }
  },
  db: {
    $filter: 'env',
    test: {
      db: 'hapi_rethinkdb_boilerplate_test',
      host: 'localhost',
      port: 28015
    },
    dev: {
      db: 'hapi_rethinkdb_boilerplate_dev',
      host: 'localhost',
      port: 28015
    },
    prod: {
      db: 'hapi_rethinkdb_boilerplate',
      host: 'localhost',
      port: 28015
    }
  }
}

internals.store = new Confidence.Store(config)

exports.get = key => internals.store.get(key, criteria)
