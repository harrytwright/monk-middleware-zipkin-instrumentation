(async () => {
  const monk = require('monk')
  const CLSContext  = require('zipkin-context-cls')
  const { Tracer, ExplicitContext, ConsoleRecorder, BatchRecorder, jsonEncoder: { JSON_V2 } } = require('zipkin')

  const { HttpLogger } = require('zipkin-transport-http')

  const tracer = new Tracer({
    ctxImpl: new CLSContext('namespace', true), // implicit in-process context
    recorder: new BatchRecorder({
      logger: new HttpLogger({
        endpoint: 'http://localhost:9411/api/v2/spans',
        jsonEncoder: JSON_V2
      })
    }), // batched http recorder
    localServiceName: 'default' // name of this application
  });

  /**
   * @type {monk.IMonkManager}
   * */
  const client = monk('localhost:27017/demo')

  const middleware = require('../src/index')({ tracer, verbose: true })
  client.addMiddleware(middleware)

  const data = { name: 'tester' }
  const connection = client.get(require('nanoid').nanoid())

  await connection.insert(data)
  await connection.findOne(data._id)

  // For the HTTP logger
  await timeout(3000)

  await client.close()
})()

function timeout (time) {
  return new Promise((resolve) => {
    setTimeout(resolve, time)
  })
}
