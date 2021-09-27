(async () => {
  const monk = require('monk')
  const { nanoid } = require('nanoid')
  const monkMiddleware = require('../src/index')
  const { Tracer, ExplicitContext, ConsoleRecorder } = require('zipkin')

  function createTracer () {
    const ctxImpl = new ExplicitContext();
    const recorder = new ConsoleRecorder(() => { });
    const tracer = new Tracer({ ctxImpl, recorder });
    tracer.setId(tracer.createRootId());

    return tracer
  }

  function formatNumber(number) {
    return String(number)
  }

  /** @type {monk.IMonkManager} */
  const client = monk(`localhost:27017/${nanoid()}`)

  const monkCollection = client.get(nanoid())

  client.addMiddleware(monkMiddleware({ tracer: createTracer() }))
  const zipkinCollection = client.get(nanoid())

  const { Suite } = require('benchmark')

  const suite = new Suite('redis')

  suite.add('monk', (deferred) => {
    monkCollection.insert({ [nanoid()]: nanoid() }).finally(() => deferred.resolve())
  }, { defer: true }).add('zipkin/monk', (deferred) => {
    zipkinCollection.insert({ [nanoid()]: nanoid() }).finally(() => deferred.resolve())
  }, { defer: true }).on('cycle', event => {
    let name = event.target.name.padEnd('zipkin/monk  '.length)
    let hz = formatNumber(event.target.hz.toFixed(0)).padStart(10)
    process.stdout.write(`${name}${hz} ops/sec\n`)
  }).on('complete', function() {
    client.close()
  }).run({ 'async': true });
})()
