'use strict'

const Bcrypt = require('bcrypt')

exports.up = function (r, connection) {
  const admin = {
    username: 'admin',
    password: 'p4$$w0Rd',
    scope: ['user', 'admin']
  }

  return Bcrypt.hash(admin.password, 10 /* SALT_ROUNDS */)
    .then(hash => {
      delete admin.password
      const user = Object.assign({}, admin, { hash })
      return r.table('users').wait([
        { waitFor: 'ready_for_writes', timeout: 20 }
      ])
      .run()
      .then(() => r.table('users').insert(user).run())
    })
}

exports.down = function (r, connection) {
  return Promise.resolve()
}
