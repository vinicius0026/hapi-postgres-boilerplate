'use strict'

const Config = require('./lib/config')

module.exports = Object.assign({}, Config.get('/db'))
