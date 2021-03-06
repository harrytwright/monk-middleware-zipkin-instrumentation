const { Tracer, ExplicitContext, BatchRecorder } = require('zipkin')

const xpt = (expect, toNot = false) => (value, target) => {
  return (toNot ? expect(value).to.not : expect(value).to).be.equal(target)
}

function expectCorrectSpanData (expect) {
  return ({ span, command, parentId, tags = { }, toNot = false }) => {
    // Check the end-points
    expect(span.localEndpoint.serviceName).to.equal('unknown')
    expect(span.remoteEndpoint.serviceName).to.equal('mongodb')

    // For the express one the command will not be correct as we use multiple commands
    command && expect(span.name).to.equal(command)

    // Check that commands share a common parent
    parentId && xpt(expect, toNot)(span.parentId, parentId)

    // For certain tests docker on docker will be used where the host is not an ipv4
    if (require('net').isIPv4(process.env.MONGO_HOST || 'localhost:27017')) expect(span.remoteEndpoint.ipv4).to.equal(process.env.MONGO_HOST || 'localhost:27017')

    // Test the tags and see if they match the ones we want to watch
    Object.keys(tags).forEach((tag) => {
      // console.log(span.tags)
      expect(span.tags).to.have.any.keys(tag)
      expect(span.tags[tag]).to.be.deep.equal(JSON.stringify(tags[tag]))
    })
  }
}

function createTracer (logSpan, ctxImpl = new ExplicitContext()) {
  const recorder = new BatchRecorder({ logger: { logSpan } })
  const tracer = new Tracer({ ctxImpl, recorder })
  tracer.setId(tracer.createRootId())

  return tracer
}

module.exports = {
  createTracer,
  expectCorrectSpanData
}
