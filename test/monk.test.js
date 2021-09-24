const chai = require('chai')
const monk = require('monk')
const sinon = require('sinon')
const { nanoid } = require('nanoid')

const createMiddleware = require('../src/index')

const { expectCorrectSpanData, createTracer } = require('./utils/tracer')

const expect = chai.expect

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

  it('should work with aggregate', async function () {
    const logSpan = sinon.spy()

    const tracer = createTracer(logSpan)

    client.addMiddleware(createMiddleware({ tracer }))

    const collection = client.get(nanoid())

    // this is the documentation aggregate pipeline
    const pipeline = await collection.aggregate([
      {
        $project: {
          author: 1,
          tags: 1
        }
      },
      { $unwind: '$tags' },
      {
        $group: {
          _id: { tags: '$tags' },
          authors: { $addToSet: '$author' }
        }
      }
    ])

    expect(pipeline).to.be.empty

    const spans = logSpan.args.map(arg => arg[0])
    expect(spans).to.have.length(1)
    spans.forEach((span) => expectCorrectSpanData(expect)({
      command: 'aggregate',
      tags: { stages: ['$project', '$unwind', '$group'] },
      span
    }))
  })

  it('should work with bulkWrite', async function () {
    const logSpan = sinon.spy()

    const tracer = createTracer(logSpan)

    client.addMiddleware(createMiddleware({ tracer }))

    const collection = client.get(nanoid())

    // this is the documentation bulkWrite pipeline
    const res = await collection.bulkWrite([
      { insertOne: { document: { a: 1 } } },
      { updateOne: { filter: { a: 2 }, update: { $set: { a: 2 } }, upsert: true } },
      { updateMany: { filter: { a: 2 }, update: { $set: { a: 2 } }, upsert: true } },
      { deleteOne: { filter: { c: 1 } } },
      { deleteMany: { filter: { c: 1 } } },
      { replaceOne: { filter: { c: 3 }, replacement: { c: 4 }, upsert: true } }
    ])

    expect(res).to.not.be.null

    const spans = logSpan.args.map(arg => arg[0])
    expect(spans).to.have.length(1)
    spans.forEach((span) => expectCorrectSpanData(expect)({
      command: 'bulk_write',
      tags: { operations: ['insertOne', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'replaceOne'] },
      span
    }))
  })

  it('should work with count', async function () {
    const logSpan = sinon.spy()

    const tracer = createTracer(logSpan)

    client.addMiddleware(createMiddleware({ tracer }))

    const collection = client.get(nanoid())

    const count = await collection.count()

    expect(count).to.be.eq(0)

    const spans = logSpan.args.map(arg => arg[0])
    expect(spans).to.have.length(1)
    spans.forEach((span) => expectCorrectSpanData(expect)({
      command: 'count',
      span
    }))
  })

  it('should work with createIndex', async function () {
    const logSpan = sinon.spy()

    const tracer = createTracer(logSpan)

    client.addMiddleware(createMiddleware({ tracer }))

    const collection = client.get(nanoid())

    const res = await collection.createIndex('name last')

    expect(res).to.be.eq('name_1_last_1')

    const spans = logSpan.args.map(arg => arg[0])
    expect(spans).to.have.length(1)
    spans.forEach((span) => expectCorrectSpanData(expect)({
      command: 'create_index',
      tags: { fields: { name: 1, last: 1 } },
      span
    }))
  })

  it('should work with distinct', async function () {
    const logSpan = sinon.spy()

    const tracer = createTracer(logSpan)

    client.addMiddleware(createMiddleware({ tracer }))

    const collection = client.get(nanoid())

    // this is the documentation aggregate pipeline
    const distinct = await collection.distinct('name')

    expect(distinct).to.be.empty

    const spans = logSpan.args.map(arg => arg[0])
    expect(spans).to.have.length(1)
    spans.forEach((span) => expectCorrectSpanData(expect)({
      command: 'distinct',
      tags: { field: 'name' },
      span
    }))
  })

  // Since this doesn't add a binary it seems pointless to test but here we go
  it('should work with drop', async function () {
    const logSpan = sinon.spy()

    const tracer = createTracer(logSpan)

    client.addMiddleware(createMiddleware({ tracer }))

    const collection = client.get(nanoid())

    // Might as well test while we're here
    await collection.drop()

    const spans = logSpan.args.map(arg => arg[0])
    expect(spans).to.have.length(1)
    spans.forEach((span) => expectCorrectSpanData(expect)({
      command: 'drop',
      span
    }))
  })

  // Needs a setup for this or it fails for some reason
  describe('dropIndex', function () {
    let collectionName; const indexName = 'name'

    before(async () => {
      collectionName = nanoid()

      const collection = client.get(collectionName)
      await collection.createIndex(indexName)
    })

    it('should add the correct dropIndex binaries', async function () {
      const logSpan = sinon.spy()

      const tracer = createTracer(logSpan)

      client.addMiddleware(createMiddleware({ tracer }))

      const collection = client.get(collectionName)

      const res = await collection.dropIndex(indexName)
      expect(res.ok).to.be.eq(1)

      const spans = logSpan.args.map(arg => arg[0])
      expect(spans).to.have.length(1)
      spans.forEach((span) => expectCorrectSpanData(expect)({
        command: 'drop_index',
        tags: { fields: { [indexName]: 1 } },
        span
      }))
    })
  })

  // Needs a setup for this or it fails for some reason
  describe('dropIndexes', function () {
    let collectionName; const indexName = 'name'

    before(async () => {
      collectionName = nanoid()

      const collection = client.get(collectionName)
      await collection.createIndex(indexName)
    })

    it('should add the correct dropIndexes binaries', async function () {
      const logSpan = sinon.spy()

      const tracer = createTracer(logSpan)

      client.addMiddleware(createMiddleware({ tracer }))

      const collection = client.get(collectionName)

      const res = await collection.dropIndexes()
      expect(res).to.be.eq(true)

      const spans = logSpan.args.map(arg => arg[0])
      expect(spans).to.have.length(1)
      spans.forEach((span) => expectCorrectSpanData(expect)({
        command: 'drop_indexes',
        span
      }))
    })
  })

  it('should work with find', async function () {
    const logSpan = sinon.spy()

    const tracer = createTracer(logSpan)

    client.addMiddleware(createMiddleware({ tracer }))

    const collection = client.get(nanoid())

    const query = { _id: monk.id() }
    const res = await collection.find(query)

    expect(res).to.be.empty

    const spans = logSpan.args.map(arg => arg[0])
    expect(spans).to.have.length(1)
    spans.forEach((span) => expectCorrectSpanData(expect)({
      command: 'find',
      tags: { query: query },
      span
    }))
  })

  it('should work with findOne', async function () {
    const logSpan = sinon.spy()

    const tracer = createTracer(logSpan)

    client.addMiddleware(createMiddleware({ tracer }))

    const collection = client.get(nanoid())

    const query = { _id: monk.id() }
    const res = await collection.findOne(query)

    expect(res).to.be.null

    const spans = logSpan.args.map(arg => arg[0])
    expect(spans).to.have.length(1)
    spans.forEach((span) => expectCorrectSpanData(expect)({
      command: 'find_one',
      tags: { query: query },
      span
    }))
  })

  it('should work with findOneAndDelete', async function () {
    const logSpan = sinon.spy()

    const tracer = createTracer(logSpan)

    client.addMiddleware(createMiddleware({ tracer }))

    const collection = client.get(nanoid())

    const query = { _id: monk.id() }
    const res = await collection.findOneAndDelete(query)

    expect(res).to.be.null

    const spans = logSpan.args.map(arg => arg[0])
    expect(spans).to.have.length(1)
    spans.forEach((span) => expectCorrectSpanData(expect)({
      command: 'find_one_and_delete',
      tags: { query: query },
      span
    }))
  })

  it('should work with findOneAndUpdate', async function () {
    const logSpan = sinon.spy()

    const tracer = createTracer(logSpan)

    client.addMiddleware(createMiddleware({ tracer }))

    const collection = client.get(nanoid())

    const query = { _id: monk.id() }
    const res = await collection.findOneAndUpdate(query, {
      $set: { name: 'Hello World' }
    }, { upsert: true })

    expect(res).to.not.be.null

    const spans = logSpan.args.map(arg => arg[0])
    expect(spans).to.have.length(1)
    spans.forEach((span) => expectCorrectSpanData(expect)({
      command: 'find_one_and_update',
      tags: { query: query, update: { $set: { name: 'Hello World' } } },
      span
    }))
  })

  describe('indexes', function () {
    let collectionName; const indexName = 'name'

    before(async () => {
      collectionName = nanoid()

      const collection = client.get(collectionName)
      await collection.createIndex(indexName)
    })

    it('should work with indexes', async function () {
      const logSpan = sinon.spy()

      const tracer = createTracer(logSpan)

      client.addMiddleware(createMiddleware({ tracer }))

      const collection = client.get(collectionName)

      const res = await collection.indexes()

      expect(res).to.not.be.null

      const spans = logSpan.args.map(arg => arg[0])
      expect(spans).to.have.length(1)
      spans.forEach((span) => expectCorrectSpanData(expect)({
        command: 'indexes',
        span
      }))
    })
  })

  it('should work with insert', async function () {
    const logSpan = sinon.spy()

    const tracer = createTracer(logSpan)

    client.addMiddleware(createMiddleware({ tracer }))

    const collection = client.get(nanoid())

    const query = { _id: monk.id(), name: 'hello world' }
    const res = await collection.insert(query)

    expect(res).to.not.be.null

    const spans = logSpan.args.map(arg => arg[0])
    expect(spans).to.have.length(1)
    spans.forEach((span) => expectCorrectSpanData(expect)({
      command: 'insert',
      args: { data: query },
      span
    }))
  })

  describe('remove', function () {
    let collectionName; const _id = monk.id()

    before(async () => {
      collectionName = nanoid()

      const collection = client.get(collectionName)

      const query = { _id, name: 'hello world' }
      await collection.insert(query)
    })

    it('should work with remove', async function () {
      const logSpan = sinon.spy()

      const tracer = createTracer(logSpan)

      client.addMiddleware(createMiddleware({ tracer }))

      const collection = client.get(collectionName)

      const res = await collection.remove(_id)

      expect(res).to.not.be.null

      const spans = logSpan.args.map(arg => arg[0])
      expect(spans).to.have.length(1)
      spans.forEach((span) => expectCorrectSpanData(expect)({
        command: 'remove',
        args: { query: _id },
        span
      }))
    })
  })
})
