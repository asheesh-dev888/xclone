// PostgreSQL connection pool + startup init (schema + first-run seed).
const { Pool, types } = require('pg');
const fs = require('fs');
const path = require('path');

// Return BIGINT/COUNT(*) as JS numbers (epoch-ms timestamps and counts fit safely).
types.setTypeParser(20, (v) => parseInt(v, 10));

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]', '']);
function poolConfig() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    console.error('DATABASE_URL is not set. Example: postgres://user:pass@localhost:5432/zuzu');
    process.exit(1);
  }
  const url = new URL(raw);
  const local = LOCAL_HOSTS.has(url.hostname) || url.searchParams.get('host')?.startsWith('/');
  // sslmode in the URL would override the ssl object below, so drop it and set SSL explicitly.
  url.searchParams.delete('sslmode');
  return {
    connectionString: url.toString(),
    ssl: local ? false : { rejectUnauthorized: false },
    max: parseInt(process.env.PG_POOL_MAX || '5', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
  };
}

let pool;
function getPool() {
  if (!pool) {
    pool = new Pool(poolConfig());
    // Idle clients can be dropped by the server (e.g. Neon scaling to zero); don't crash on that.
    pool.on('error', (err) => console.error('pg pool error (ignored):', err.message));
  }
  return pool;
}

// Turn "... WHERE id=@id AND user_id=@me" + {id, me} into $1/$2 params.
function named(sql, params) {
  if (Array.isArray(params) || params == null) return [sql, params || []];
  const vals = [], idx = {};
  const text = sql.replace(/@(\w+)/g, (m, k) => {
    if (!(k in idx)) { vals.push(params[k] === undefined ? null : params[k]); idx[k] = vals.length; }
    return '$' + idx[k];
  });
  return [text, vals];
}
const query = (sql, params, client) => (client || getPool()).query(...named(sql, params));
const all = async (sql, params, client) => (await query(sql, params, client)).rows;
const get = async (sql, params, client) => (await query(sql, params, client)).rows[0] || null;
const run = async (sql, params, client) => (await query(sql, params, client)).rowCount;

async function tx(fn) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const r = await fn(client);
    await client.query('COMMIT');
    return r;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally { client.release(); }
}

// Create tables if missing and seed demo data only when there are no users
// (demo DMs only when there are no DM conversations).
// An advisory lock keeps two instances (e.g. during a deploy) from seeding twice.
async function init({ retries = 8 } = {}) {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  for (let attempt = 1; ; attempt++) {
    try {
      return await tx(async (c) => {
        await c.query('SELECT pg_advisory_xact_lock(424242)');
        await c.query(schema);
        const { seed, seedDMs } = require('./seed');
        const seeded = await seed(c);
        const seededDMs = await seedDMs(c); // demo DMs only while there are no DMs at all
        return { seeded, seededDMs };
      });
    } catch (e) {
      if (attempt >= retries) throw e;
      console.error(`DB init failed (attempt ${attempt}/${retries}): ${e.message}; retrying…`);
      await new Promise(r => setTimeout(r, Math.min(1000 * 2 ** (attempt - 1), 10000)));
    }
  }
}

module.exports = { getPool, query, all, get, run, tx, init };
