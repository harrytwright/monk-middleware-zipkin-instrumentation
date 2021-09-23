const chai = require('chai')
const monk = require('monk')
const sinon = require('sinon')
const { nanoid } = require('nanoid')

const createMiddleware = require('../src/index')

const { expectCorrectSpanData, createTracer } = require('./utils/tracer')

const expect = chai.expect

describe('monk', function () {

  /**
   * @type {monk.IMonkManager}
   * */
  let client;

  before(() => {
    client = monk(process.env.MONGO_HOST = 'localhost:27017')
  })

  after(async () => {
    client && await client.close()
  })

  it('should add zipkin annotations', async function () {
    const logSpan = sinon.spy();

    const tracer = createTracer(logSpan)

    client.addMiddleware(createMiddleware({ tracer }))

    const collection = client.get(nanoid())

    const key = nanoid()
    const data = { [key]: nanoid() }
    const res = await collection.insert(data)

    // Just a initial test for the initial build
    expect(res[key]).to.be.eq(data[key])

    const spans = logSpan.args.map(arg => arg[0]);
    expect(spans).to.have.length(1)
    spans.forEach((span) => expectCorrectSpanData(expect)({
      command: 'insert',
      span
    }))
  });

  it('should handle mongodb errors', async function () {
    const logSpan = sinon.spy();

    const tracer = createTracer(logSpan)

    client.addMiddleware(createMiddleware({ tracer }))

    const collection = client.get(nanoid())

    try {
      const res = await collection.dropIndex(nanoid())

      // Should never be called
      expect(res).to.be.undefined
    } catch (err) {
      expect(err).to.not.be.undefined
    }

    const spans = logSpan.args.map(arg => arg[0]);
    expect(spans).to.have.length(1)
    spans.forEach((span) => expectCorrectSpanData(expect)({
      command: 'dropindex', // Wish it wasn't this case but name/command is lowercased
      span
    }))
  });
});
