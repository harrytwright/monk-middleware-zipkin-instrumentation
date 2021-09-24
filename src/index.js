const { Annotation, InetAddress, Tracer } = require('zipkin')

const { TMiddleware } = require('monk')

// Get the data from object with a key, just keeps the code cleaner in a way
const dataWithKey = (obj, key) => obj[key] && new Map([[key, JSON.stringify(obj[key])]])

// This is for the array methods
const flatMapDataWithKey = (obj, key) => obj[key] && new Map([[key, JSON.stringify(obj[key].map((el) => Object.keys(el)).flatMap((el) => el))]])

const unionise = (...maps) => {
  return maps.reduce((previousValue, currentValue) => {
    return new Map(function * () { yield * previousValue; yield * currentValue }())
  }, new Map([]))
}

// Get multiple keys
const multiDataWithKeys = (obj, keys) => Object.keys(obj).some((key) => keys.includes(key)) && unionise(...keys.map(key => dataWithKey(obj, key)))

// Clean up the names since rpc are lowercased
const camelToSnakeCase = str => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)

// TODO: Go through each method and add the custom binary
const binary = {
  // Seems like a good idea maybe??
  aggregate: (args) => flatMapDataWithKey(args, 'stages'),
  bulkWrite: (args) => flatMapDataWithKey(args, 'operations'),
  count: (args) => dataWithKey(args, 'query'),
  createIndex: (args) => dataWithKey(args, 'fields'),
  distinct: (args) => dataWithKey(args, 'field'),
  dropIndex: (args) => dataWithKey(args, 'fields'),
  find: (args) => dataWithKey(args, 'query'),
  findOne: (args) => dataWithKey(args, 'query'),
  findOneAndDelete: (args) => dataWithKey(args, 'query'),
  findOneAndUpdate: (args) => multiDataWithKeys(args, ['query', 'update']),
  insert: (args) => dataWithKey(args, 'data'),
  remove: (args) => dataWithKey(args, 'query')
}

// These are the standard output for the zipkin client
//
// with verbose added which is a thing I like to add
module.exports = function createZipkin ({ tracer, remoteServiceName = 'mongodb', serviceName = tracer.localEndpoint.serviceName, verbose = true }) {
  function commonAnnotations (method, ctx) {
    // This seems expensive for what it is ??
    const { hostname, port } = new URL(ctx.monkInstance._connectionURI)

    tracer.recordRpc(camelToSnakeCase(method))
    tracer.recordAnnotation(new Annotation.ServiceName(serviceName))
    tracer.recordAnnotation(new Annotation.ServerAddr({
      serviceName: remoteServiceName,
      host: new InetAddress(hostname || '127.0.0.1'), // This is a guess work
      port: parseInt(port) || 27017
    }))
    tracer.recordAnnotation(new Annotation.ClientSend())
  }

  // Just to make sure this is safe
  function record (method, obj) {
    /** @type {Map<string, string>} */
    const argsMap = binary[method](obj)
    argsMap && argsMap.size > 0 && argsMap.forEach((value, key) => {
      tracer.recordBinary(key, value)
    })
  }

  return function zipkinMiddleware (ctx) {
    return (next) => {
      const originalId = tracer.id

      return (args, method) => {
        const id = tracer.createChildId()
        tracer.letId(id, () => {
          commonAnnotations(method, ctx)
          // Maybe??
          verbose && binary[method] && record(method, args)
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
}
