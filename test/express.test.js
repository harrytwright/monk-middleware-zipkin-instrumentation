const chai = require('chai')
const monk = require('monk')
const sinon = require('sinon')
const { nanoid } = require('nanoid')
const CLSContext = require('zipkin-context-cls')

const createMiddleware = require('../src/index')

const { expectCorrectSpanData, createTracer } = require('./utils/tracer')

const expect = chai.expect

chai.use(require('chai-http'))


const host = `${process.env.MONGO_HOST || 'localhost:27017'}/${nanoid()}`

/**
 * Test this works on all working functions in monk w/ a binary method
 * */
describe('monk', function () {
  /**
   * @type {monk.IMonkManager}
   * */
  let client

  beforeEach(() => {
    client = monk(host)
  })

  afterEach(async () => {
    client && await client.close()
  })

  /**
   * May ask this in the issues of zipkin and see why it doesn't work
   * */
  it('should not work with explicit context', async function () {
    const logSpan = sinon.spy()

    const tracer = createTracer(logSpan)

    client.addMiddleware(createMiddleware({ tracer }))

    const collection = client.get(nanoid())

    const app = require('./utils/express')(tracer, collection)
    const res = await chai.request(app).post('/api/post').send({
      'key': 'value'
    })

    expect(res).status(200)

    const spans = logSpan.args.map(arg => arg[0])
    expect(spans).to.have.length(2)

    // Remove the express one for the test
    const expressSpan = spans.pop()
    spans.forEach((span, idx) => expectCorrectSpanData(expect)({
      parentId: expressSpan.traceId,
      toNot: true,
      span,
    }))
  });

  it('should work with async cls', async function () {
    const logSpan = sinon.spy()

    const tracer = createTracer(logSpan, new CLSContext('zipkin', true))

    client.addMiddleware(createMiddleware({ tracer }))

    const collection = client.get(nanoid())

    const app = require('./utils/express')(tracer, collection)
    const res = await chai.request(app).post('/api/post').send({
      'key': 'value'
    })

    expect(res).status(200)

    const spans = logSpan.args.map(arg => arg[0])
    expect(spans).to.have.length(2)

    // Remove the express one for the test
    const expressSpan = spans.pop()

    spans.forEach((span) => expectCorrectSpanData(expect)({
      parentId: expressSpan.traceId,
      span,
    }))
  })

})
