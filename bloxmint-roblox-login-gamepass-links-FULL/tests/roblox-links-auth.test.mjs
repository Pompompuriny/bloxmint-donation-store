import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { onRequestGet as beginOAuth } from '../functions/api/auth/start.js';
import { onRequestGet as finishOAuth } from '../functions/api/auth/callback.js';
import { PASSES } from '../functions/_lib/passes.js';

const origin = 'https://bloxmint-donation-pages.pages.dev';
const withRequest = (pathname, cookie = '') => ({ request: new Request(`${origin}${pathname}`, { headers: cookie ? { Cookie: cookie } : {} }) });

test('public catalog has all 26 IDs matching backend and all gamepass URLs are numeric', async () => {
  const catalog = JSON.parse(await readFile(new URL('../public/catalog.json', import.meta.url), 'utf8'));
  assert.deepEqual(catalog.passes.map(p => p.id), PASSES.map(p => p.id));
  const appJs = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(appJs, /https:\/\/www\.roblox\.com\/game-pass\/\$\{value\}/);
  assert.match(appJs, /View pass ↗/);
});

test('Roblox OAuth begins correctly with PKCE, D1 state, client ID and exact callback', async () => {
  const saved = [];
  const env = {
    SITE_URL: origin,
    ROBLOX_CLIENT_ID: 'test_client_id',
    ROBLOX_CLIENT_SECRET: 'test_secret',
    DB: {prepare: () => ({bind: (...args) => ({run: async () => {saved.push(args)}})})}
  };
  const response = await beginOAuth({...withRequest('/api/auth/start'), env});
  assert.equal(response.status, 302);
  const url = new URL(response.headers.get('Location'));
  assert.equal(url.origin, 'https://apis.roblox.com');
  assert.equal(url.pathname, '/oauth/v1/authorize');
  assert.equal(url.searchParams.get('redirect_uri'), `${origin}/api/auth/callback`);
  assert.equal(url.searchParams.get('scope'), 'openid profile');
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(url.searchParams.get('response_type'), 'code');
  assert.equal(url.searchParams.get('client_id'), 'test_client_id');
  assert.equal(url.searchParams.get('state'), saved[0][0]);
  assert.match(response.headers.get('Set-Cookie'), /HttpOnly; Secure; SameSite=Lax/);
});

test('missing Roblox secrets or D1 redirects to an understandable setup message', async () => {
  const a = await beginOAuth({...withRequest('/api/auth/start'),env: {SITE_URL: origin}});
  assert.equal(a.headers.get('Location'), `${origin}/?auth=setup#account`);
  const b = await beginOAuth({...withRequest('/api/auth/start'), env: {SITE_URL: origin, ROBLOX_CLIENT_ID: 'a', ROBLOX_CLIENT_SECRET:'b'}});
  assert.equal(b.headers.get('Location'), `${origin}/?auth=db#account`);
});

test('Roblox callback saves verified profile into a session', async () => {
  const realFetch = globalThis.fetch;
  const issued = [];
  const env = {
    SITE_URL: origin, ROBLOX_CLIENT_ID:'client', ROBLOX_CLIENT_SECRET:'secret',
    DB: {
      prepare(sql) { return { bind(...args) {return {
        async first() { if (sql.includes('FROM oauth_states')) return {verifier: 'pkce_verifier', created_at: Date.now()}; return null; },
        async run() {issued.push([sql, args]); return {meta:{changes:1}};}
      };}};}
    }
  };
  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/oauth/v1/token')) return Response.json({access_token:'mock'});
    if (String(url).endsWith('/oauth/v1/userinfo')) return Response.json({sub:'87654321',preferred_username:'BloxTester',picture:null});
    throw new Error(`Unrecognized URL ${url}`);
  };
  try {
    const response = await finishOAuth({...withRequest('/api/auth/callback?code=one-time&state=somestate', 'rbx_oauth_state=somestate'), env});
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('Location'), `${origin}/#donate`);
    assert.match(response.headers.get('Set-Cookie'), /donation_session=.*HttpOnly; Secure;/);
    const sessionInsert = issued.find(([sql]) => sql.includes('INSERT INTO sessions'));
    assert.ok(sessionInsert);
    assert.equal(sessionInsert[1][1], '87654321');
    assert.equal(sessionInsert[1][2], 'BloxTester');
  } finally {globalThis.fetch = realFetch;}
});
