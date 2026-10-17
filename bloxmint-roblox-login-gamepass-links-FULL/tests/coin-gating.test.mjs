import test from 'node:test';
import assert from 'node:assert/strict';
import { PASSES, GAMBLER_ROLE_IDS, isCoinPass } from '../functions/_lib/passes.js';
import { onRequestPost as checkout } from '../functions/api/checkout.js';
import { verifyIntent } from '../functions/_lib/donations.js';

const user = { user_id: '12345', username: 'TestUser', picture: null };

function buildContext({ passId, old = null, roleOwned = false, coinOwned = false }) {
  const runs = [];
  const DB = {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() {
              if (sql.includes('FROM sessions')) return user;
              if (sql.includes('SELECT status,created_at FROM donation_intents')) return old;
              return null;
            },
            async run() { runs.push({ sql, args }); return { meta: { changes: 1 } }; }
          };
        }
      };
    }
  };
  const request = new Request('https://store.example/api/checkout', {
    method: 'POST',
    headers: { 'Origin': 'https://store.example', 'Cookie': 'donation_session=testtoken', 'Content-Type': 'application/json' },
    body: JSON.stringify({ passId })
  });
  const env = { DB, ROBLOX_API_KEY: 'test-only-not-real' };
  const before = globalThis.fetch;
  const queried = [];
  globalThis.fetch = async (url) => {
    const requestUrl = new URL(url);
    const filter = requestUrl.searchParams.get('filter');
    queried.push(filter);
    if (filter === `gamePassIds=${GAMBLER_ROLE_IDS.join(',')}`) {
      return Response.json({ inventoryItems: roleOwned ? [{ id: 'gamePass/2036210513' }] : [] });
    }
    if (filter === `gamePassIds=${passId}`) {
      return Response.json({ inventoryItems: coinOwned ? [{ id: `gamePass/${passId}` }] : [] });
    }
    throw new Error(`Unexpected filter: ${filter}`);
  };
  return { context: { request, env }, env, queried, runs, restore: () => { globalThis.fetch = before; } };
}

test('catalog has exactly 26 unique passes and four restricted coin passes', () => {
  assert.equal(PASSES.length, 26);
  assert.equal(new Set(PASSES.map(p => p.id)).size, 26);
  assert.deepEqual(PASSES.filter(isCoinPass).map(p => p.name), ['30k coins', '150k coins', '500k coins', '1.2M coins']);
  assert.deepEqual(PASSES.filter(p => GAMBLER_ROLE_IDS.includes(p.id)).map(p => p.name), ['Fish', 'Sharp Card', 'Whale']);
});

test('coin checkout blocks a Roblox user without Fish / Sharp Card / Whale', async () => {
  const t = buildContext({ passId: 2026532592, roleOwned: false });
  try {
    const response = await checkout(t.context);
    assert.equal(response.status, 403);
    const body = await response.json();
    assert.equal(body.code, 'GAMBLER_ROLE_REQUIRED');
    assert.equal(t.runs.length, 0);
    assert.equal(t.queried.length, 1);
  } finally { t.restore(); }
});

test('coin checkout allows user with a gambler role and starts pending checkout', async () => {
  const t = buildContext({ passId: 2026532592, roleOwned: true });
  try {
    const response = await checkout(t.context);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.status, 'pending');
    assert.equal(body.url, 'https://www.roblox.com/game-pass/2026532592');
    assert.equal(t.runs.length, 1);
    assert.equal(t.queried.length, 2);
  } finally { t.restore(); }
});

test('coin checkout blocks an old pending intent when the required role is missing', async () => {
  const t = buildContext({ passId: 2026532592, roleOwned: false, old: { status: 'pending', created_at: Date.now() } });
  try {
    const response = await checkout(t.context);
    assert.equal(response.status, 403);
  } finally { t.restore(); }
});

test('non-coin gamepass checkout never requires a gambler role', async () => {
  const t = buildContext({ passId: 2036090286, roleOwned: false });
  try {
    const response = await checkout(t.context);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).status, 'pending');
    assert.deepEqual(t.queried, ['gamePassIds=2036090286']);
  } finally { t.restore(); }
});

test('pending coin verification cannot pass without the prerequisite gamer role', async () => {
  const t = buildContext({ passId: 2026532592, roleOwned: false });
  const record = { status: 'pending', user_id: user.user_id, pass_id: 2026532592, username: user.username };
  try {
    const status = await verifyIntent(t.env, record);
    assert.equal(status, 'requires_gambler_role');
    assert.equal(t.runs.length, 1);
    assert.equal(t.queried.length, 1);
  } finally { t.restore(); }
});
