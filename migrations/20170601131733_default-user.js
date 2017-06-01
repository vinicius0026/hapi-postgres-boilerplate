const Bcrypt = require('bcrypt')

exports.up = function (knex, Promise) {
  const admin = {
    username: 'admin',
    password: 'admin',
    scope: ['user', 'admin']
  }

  return Bcrypt.hash(admin.password, 10 /* SALT_ROUNDS */)
    .then(hash => {
      delete admin.password
      const user = Object.assign({}, admin, { hash })
      return knex('users').insert(user)
    })
}

exports.down = function (knex, Promise) {
  return knex('users')
    .del()
}
