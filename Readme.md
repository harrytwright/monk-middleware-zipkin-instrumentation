# Zipkin

[![Node.js CI](https://github.com/harrytwright/monk-middleware-zipkin-instrumentation/actions/workflows/node.js.yml/badge.svg)](https://github.com/harrytwright/monk-middleware-zipkin-instrumentation/actions/workflows/node.js.yml)

To add zipkin instrumentation to monk.

```shell
npm i --save monk-middleware-zipkin-instrumentation
```

## Usage

```javascript
const { Tracer, ExplicitContext, ConsoleRecorder } = require('zipkin');

const tracer = new Tracer({
  ctxImpl: new ExplicitContext(), // implicit in-process context
  recorder: new ConsoleRecorder(), // batched http recorder
  localServiceName: 'tester' // name of this application
});

db.addMiddleware(require('monk-middleware-zipkin-instrumentation')({ tracer }))
```

### Express

> This is something that I'm going to look in to

Please note that using express the context should be `zipkin-context-cls` or the parent is not properly assigned

## Benchmark

> Due to the proxying nature of the way zipkin works there is a slight discrepancy with performance.
>
> In this case zipkin was faster but not by much

Function calling time:

```shell
$ node ./test/benchmark.js
monk             10,457 ops/sec
zipkin/monk      11,532 ops/sec
```

Test configuration:
```shell
$ uname -a
Darwin 2015-MBP 19.6.0 Darwin Kernel Version 19.6.0: <DATE> x86_64
$ node --version
v16.2.0
```
