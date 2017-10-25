'use strict'

exports.register = function (server, options, next) {
  server.ext('onPreHandler', (request, reply) => {
    const logData = {
      path: request.route.path,
      params: request.params,
      headers: request.headers,
      payload: request.payload
    }

    request.log(request.route.method, logData)

    reply.continue()
  })

  next()
}

exports.register.attributes = {
  name: 'request-logging'
}
