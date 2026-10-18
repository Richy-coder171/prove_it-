const LOCAL_ENVIRONMENTS = new Set(['local', 'development', 'demo', 'test']);

export function isLoopbackMongoUri(value) {
  const uri = String(value || '').trim();
  if (!uri) return false;
  const match = uri.match(/^mongodb(?:\+srv)?:\/\/([^/?#]+)(?:[/?#]|$)/i);
  if (!match) return false;
  const hosts = match[1].split('@').pop().split(',').map((host) => {
    const value = host.trim();
    return (value.startsWith('[') ? value.slice(1, value.indexOf(']')) : value.split(':')[0]).toLowerCase();
  });
  return hosts.length > 0 && hosts.every((host) => ['127.0.0.1', 'localhost', '::1'].includes(host));
}

export function assertSeedSafety(env = process.env) {
  if (env.AI_MOCK !== '1') throw new Error('Seed requires AI_MOCK=1.');
  if (env.NODE_ENV === 'production') throw new Error('Seed is disabled when NODE_ENV=production.');
  if (!LOCAL_ENVIRONMENTS.has(String(env.PROVEIT_ENV || '').toLowerCase())) {
    throw new Error('Seed requires PROVEIT_ENV=local (or another explicitly approved demo/test environment).');
  }
  if (env.PROVEIT_SEED_CONFIRM !== 'LOCAL_DEMO') {
    throw new Error('Seed requires PROVEIT_SEED_CONFIRM=LOCAL_DEMO.');
  }
  const mongoUri = env.MONGO_URI || 'mongodb://127.0.0.1:27017/proveit';
  if (!isLoopbackMongoUri(mongoUri)) throw new Error('Seed only permits a loopback MongoDB URI; refusing remote or production data.');
  return { environment: env.PROVEIT_ENV, mongoUri };
}
