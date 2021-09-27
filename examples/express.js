(async () => {
  const monk = require('monk')
  const express = require('express')
  const { nanoid } = require('nanoid')
  const zipkinMiddleware = require('zipkin-instrumentation-express').expressMiddleware;

  const { HttpLogger } = require('zipkin-transport-http');
  const Context  = require('zipkin-context-cls')

  const { Tracer, BatchRecorder, jsonEncoder: { JSON_V2 } } = require('zipkin')

  const recorder = new BatchRecorder({
    logger: new HttpLogger({
      endpoint: 'http://localhost:9411/api/v2/spans', // Required
      jsonEncoder: JSON_V2
    })
  })

  const tracer = new Tracer({
    ctxImpl: new Context('zipkin', true), // cls context
    recorder: recorder, // batched http recorder
    localServiceName: 'example' // name of this application
  });

  /**
   * @type {monk.IMonkManager}
   * */
  const client = monk(`localhost:27017/${nanoid()}`)

  const middleware = require('../src/index')({ tracer, verbose: true })
  client.addMiddleware(middleware)

  const collection = client.get(nanoid())

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

  app.listen(3000, () => {
    console.log('Starting at 3000')
  })

})()
