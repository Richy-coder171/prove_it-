export function createFixedWindowLimiter({ windowMs, maxAttempts, maxEntries = 5000 }) {
  const records = new Map();

  function cleanup(now = Date.now()) {
    for (const [key, record] of records) {
      if (now - record.firstAt >= windowMs) records.delete(key);
    }
    while (records.size > maxEntries) {
      const oldest = records.keys().next().value;
      if (oldest === undefined) break;
      records.delete(oldest);
    }
  }

  function get(key, now = Date.now()) {
    cleanup(now);
    const current = records.get(String(key));
    if (!current || now - current.firstAt >= windowMs) return null;
    return current;
  }

  return {
    isBlocked(key, now = Date.now()) {
      return (get(key, now)?.count || 0) >= maxAttempts;
    },
    record(key, now = Date.now()) {
      cleanup(now);
      const normalizedKey = String(key);
      const current = records.get(normalizedKey);
      if (!current || now - current.firstAt >= windowMs) records.set(normalizedKey, { count: 1, firstAt: now });
      else current.count += 1;
      cleanup(now);
    },
    consume(key, now = Date.now()) {
      if (this.isBlocked(key, now)) return false;
      this.record(key, now);
      return true;
    },
    size() {
      return records.size;
    },
    reset(key) {
      records.delete(String(key));
    },
    clear() {
      records.clear();
    },
  };
}
