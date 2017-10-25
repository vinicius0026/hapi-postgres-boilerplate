'use strict'

const manifest = require('./manifest')
const options = require('./composeOptions')
const Server = require('./')

Server.init(manifest, options)
  .then(server => {
    console.log(`Server running at: ${server.info.uri} in ${process.env.NODE_ENV} mode`)
  })
  .catch(err => {
    console.error('err', err)
    process.exit(1)
  })
