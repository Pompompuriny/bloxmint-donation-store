import { randomToken, sha256 } from '../../_lib/security.js';

export async function onRequestGet({ env, request }) {
  // Never silently direct Roblox users to a broken OAuth callback.
  const url = new URL(request.url);
  const home = `${url.origin}/`;
  const siteUrl = (env.SITE_URL || '').replace(/\/$/, '');
  if (!env.ROBLOX_CLIENT_ID || !env.ROBLOX_CLIENT_SECRET || !siteUrl || siteUrl !== url.origin) {
    return Response.redirect(`${home}?auth=setup#account`, 302);
  }
  if (!env.DB) return Response.redirect(`${home}?auth=db#account`, 302);
  const state = randomToken(24);
  const verifier = randomToken(48);
  const challenge = await sha256(verifier);
  try {
    await env.DB.prepare('INSERT INTO oauth_states(state,verifier,created_at) VALUES(?,?,?)')
      .bind(state, verifier, Date.now()).run();
  } catch (error) {
    console.error('OAuth start database unavailable:', error.message);
    return Response.redirect(`${home}?auth=db#account`, 302);
  }
  const params = new URLSearchParams({
    client_id: env.ROBLOX_CLIENT_ID,
    redirect_uri: `${env.SITE_URL.replace(/\/$/, '')}/api/auth/callback`,
    scope: 'openid profile',
    response_type: 'code',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state
  });
  return new Response(null, {
    status: 302,
    headers: {
      'Location': `https://apis.roblox.com/oauth/v1/authorize?${params}`,
      'Set-Cookie': `rbx_oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/api/auth/callback; Max-Age=600`,
      'Cache-Control': 'no-store'
    }
  });
}
