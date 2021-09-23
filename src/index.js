const { Annotation, InetAddress, Tracer } = require('zipkin')

const { TMiddleware } = require('monk')

// Get the data from object with a key, just keeps the code cleaner in a way
const dataWithKey = (obj, key) => [key, JSON.stringify(obj[key])]

// TODO: Go through each method and add the custom binary
const binary = {
  'dropIndex': (args) => dataWithKey(args, 'fields'),
  'findOne': (args) => dataWithKey(args, 'query'),
  'insert': (args) => dataWithKey(args, 'data'),
}

// These are the standard output for the zipkin client
//
// with verbose added which is a thing I like to add
module.exports = function createZipkin ({ tracer, remoteServiceName = 'mongodb', serviceName = tracer.localEndpoint.serviceName, verbose = true }) {
  function commonAnnotations (method, ctx) {
    // This seems expensive for what it is ??
    const { hostname, port } = new URL(ctx.monkInstance._connectionURI)

    tracer.recordRpc(method)
    tracer.recordAnnotation(new Annotation.ServiceName(serviceName))
    tracer.recordAnnotation(new Annotation.ServerAddr({
      serviceName: remoteServiceName,
      host: new InetAddress(hostname || '127.0.0.1'), // This is a guess work
      port: parseInt(port) || 27017
    }))
    tracer.recordAnnotation(new Annotation.ClientSend())
  }

  return (ctx) => (next) => {
    const originalId = tracer.id

    return (args, method) => {
      const id = tracer.createChildId()
      tracer.letId(id, () => {
        commonAnnotations(method, ctx)
        // Maybe??
        verbose && binary[method] && tracer.recordBinary(...binary[method](args))
      })

      // This is why monk is the best
      return next(args, method).then((res) => {
        tracer.letId(id, () => {
          tracer.recordAnnotation(new Annotation.ClientRecv())
        })

        // This is in all of zipkin's instrumentation
        // callback runs after the client request, so let's restore the former ID
        // TODO: add tests for this for all clients
        return tracer.letId(originalId, () => res)
      }).catch((err) => {
        tracer.letId(id, () => {
          tracer.recordBinary('error', err.message || /* istanbul ignore next */ String(err))
          tracer.recordAnnotation(new Annotation.ClientRecv())
        })

        // This is in all of zipkin's instrumentation
        // callback runs after the client request, so let's restore the former ID
        // TODO: add tests for this for all clients
        throw tracer.letId(originalId, () => err)
      })
    }
  }
}
