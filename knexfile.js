'use strict'

const Config = require('./src/config')

module.exports = Object.assign({}, Config.get('/db'))
