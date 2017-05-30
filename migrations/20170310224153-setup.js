'use strict'

exports.up = function (r, connection) {
  return r.tableCreate('users').run()
}

exports.down = function (r, connection) {
  return r.tableDrop('users').run()
}
