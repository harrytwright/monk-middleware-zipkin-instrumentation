# Zipkin

To add zipkin instrumentation to monk.

```shell
npm i --save monk-middleware-zipkin-instrumentation
```

```javascript
const { Tracer, ExplicitContext, ConsoleRecorder } = require('zipkin');

const tracer = new Tracer({
  ctxImpl: new ExplicitContext(), // implicit in-process context
  recorder: new ConsoleRecorder(), // batched http recorder
  localServiceName: 'tester' // name of this application
});

db.addMiddleware(require('monk-middleware-zipkin-instrumentation')({ tracer }))
```

## TODO:

- [X] Add all binary logs (ones that are still in use)
- [ ] Add the option for custom binary logs
- [ ] Test against zipkin clients
- [ ] Benchmark
- [ ] Test with multi instrumentation (Make sure they log together with the same parent, i.e `express -> redis.GET -> mongo.findOne -> redis.SET`)
