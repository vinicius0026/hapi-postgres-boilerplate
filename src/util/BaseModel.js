const Model = require('objection').Model
const _ = require('lodash')
const snakeCase = _.memoize(_.snakeCase)
const camelCase = _.memoize(_.camelCase)

class BaseModel extends Model {
  $formatDatabaseJson (json) {
    json = super.$formatDatabaseJson(json)

    return _.mapKeys(json, (value, key) => {
      return snakeCase(key)
    })
  }

  $parseDatabaseJson (json) {
    json = _.mapKeys(json, (value, key) => {
      return camelCase(key)
    })

    return super.$parseDatabaseJson(json)
  }

  $beforeInsert () {
    this.created_at = new Date().toISOString()
  }

  $beforeUpdate () {
    this.updated_at = new Date().toISOString()
  }
}

module.exports = BaseModel
