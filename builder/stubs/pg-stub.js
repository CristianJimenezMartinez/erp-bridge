class DummyPool {
  async connect() { throw new Error('PostgreSQL direct client not available on local agent'); }
  async query() { throw new Error('PostgreSQL direct client not available on local agent'); }
  async end() {}
}
class DummyClient {}
module.exports = {
  Pool: DummyPool,
  Client: DummyClient,
  defaults: {}
};
