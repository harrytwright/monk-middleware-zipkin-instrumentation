module.exports = (tracer, collection) => {
  const express = require('express')
  const zipkinMiddleware = require('zipkin-instrumentation-express').expressMiddleware;

  const app = express()

  app.use(require('body-parser').json())
  app.use(zipkinMiddleware({ tracer, port: 3000 }))

  app.post('/api/post', async (req, res, next) => {
    const body = req.body
    try {
      const result = await collection.insert(body)
      return res.status(200).json(result).end()
    } catch (err) {
      return next(err)
    }
  })

  return app
}
