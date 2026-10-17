let user = null;
let owned = new Map();
let passes = [];
const grid = document.getElementById('passGrid');
const accountBody = document.getElementById('accountBody');
const feedback = document.getElementById('feedback');
const roleDialog = document.getElementById('coinRoleDialog');
const roleProceed = document.getElementById('roleProceed');
const roleModalStatus = document.getElementById('roleModalStatus');
let selectedCoinPass = null;

// The Roblox page can be viewed without logging in; buying through the
// tracked flow still requires Roblox OAuth and an ownership precheck.
function gamepassUrl(id) {
  const value = Number(id);
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('Invalid gamepass ID');
  return `https://www.roblox.com/game-pass/${value}`;
}
function robloxAnchor(pass, label = 'View pass ↗', cls = 'pass-link') {
  const a = document.createElement('a');
  a.className = cls;
  a.href = gamepassUrl(pass.id);
  a.textContent = label;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.setAttribute('aria-label', `Open ${pass.name} gamepass on Roblox`);
  return a;
}


function openRoleDialog(pass) {
  selectedCoinPass = pass;
  document.getElementById('selectedCoinName').textContent = pass.name;
  roleModalStatus.textContent = '';
  roleProceed.disabled = false;
  roleDialog.showModal();
}
function closeRoleDialog() {
  roleDialog.close();
}
async function checkoutPass(pass) {
  const response = await jsonRequest('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passId: pass.id })
  });
  if (response.status === 'pending') {
    window.location.assign(response.url);
  } else {
    setFeedback('This gamepass is already owned by your Roblox account.');
    await refreshAccount();
    renderPasses();
  }
}

document.getElementById('roleDialogClose').addEventListener('click', closeRoleDialog);
document.getElementById('roleCancel').addEventListener('click', closeRoleDialog);
roleProceed.addEventListener('click', async () => {
  if (!selectedCoinPass) return;
  roleProceed.disabled = true;
  roleModalStatus.textContent = 'Checking your Roblox inventory...';
  try {
    await checkoutPass(selectedCoinPass);
    // If still on-site (e.g. already owned), dismiss the dialog.
    closeRoleDialog();
  } catch (error) {
    roleModalStatus.textContent = error.message;
  } finally {
    roleProceed.disabled = false;
  }
});
// Fish, Sharp Card, and Whale in the modal are direct Roblox links.


async function jsonRequest(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}
function setFeedback(message, error = false) {
  feedback.textContent = message;
  feedback.classList.toggle('error', error);
}
async function refreshAccount() {
  const data = await jsonRequest('/api/me');
  user = data.user;
  owned = new Map(data.passes.map(p => [Number(p.pass_id), p.status]));
  accountBody.replaceChildren();
  const title = document.createElement('h2');
  title.textContent = user ? `Linked as @${user.username}` : 'Link your Roblox account';
  accountBody.append(title);
  if (user) {
    const row = document.createElement('div'); row.className = 'account-row';
    if (user.picture) {
      const avatar = document.createElement('img');
      avatar.className = 'avatar'; avatar.alt = 'Roblox avatar'; avatar.src = user.picture;
      row.append(avatar);
    }
    const p = document.createElement('p'); p.textContent = `Roblox ID: ${user.user_id}`;
    row.append(p);
    const btn = document.createElement('button'); btn.className = 'logout';
    btn.textContent = 'Unlink / Log out';
    btn.addEventListener('click', async () => {
      try { await jsonRequest('/api/auth/logout', { method: 'POST' }); await refreshAccount(); renderPasses(); }
      catch (error) { setFeedback(error.message, true); }
    });
    accountBody.append(row, btn);
  } else {
    const p = document.createElement('p'); p.textContent = 'Sign in on Roblox, then return here to choose a pass.';
    const link = document.createElement('a'); link.className = 'primary';
    link.href = '/api/auth/start'; link.textContent = 'Link with Roblox';
    accountBody.append(p, link);
  }
}
function makeButton(text, cls, action) {
  const button = document.createElement('button');
  button.className = cls;
  button.type = 'button';
  button.textContent = text;
  button.addEventListener('click', async () => {
    button.disabled = true;
    try { await action(); } catch (error) { setFeedback(error.message, true); }
    finally { button.disabled = false; }
  });
  return button;
}
function renderPasses() {
  grid.replaceChildren();
  for (const pass of passes) {
    const card = document.createElement('article');
    card.className = 'card pass';
    card.dataset.passId = String(pass.id);
    card.tabIndex = -1;
    const logo = document.createElement('div'); logo.className = 'pass-icon';
    logo.textContent = pass.requiresGamblerRole ? '$' : '*';
    if (pass.icon) {
      const img = document.createElement('img'); img.src = pass.icon;
      img.alt = `${pass.name} gamepass icon`;
      img.addEventListener('error', () => img.remove());
      logo.append(img);
    }
    const info = document.createElement('div'); info.className = 'pass-info';
    const name = document.createElement('p'); name.className = 'pass-name';
    name.append(robloxAnchor(pass, pass.name, 'pass-title-link'));
    const price = document.createElement('span'); price.className = 'price';
    price.textContent = `R$ ${pass.price.toLocaleString('en-US')}`;
    const state = owned.get(pass.id);
    const stateText = document.createElement('span'); stateText.className = 'status';
    stateText.textContent = state === 'verified' ? 'Verified owner' :
      state === 'already_owned' ? 'Already owned before checkout' :
      state === 'pending' ? 'Awaiting purchase / verification' : 'Not purchased through this store yet';
    const actions = document.createElement('div'); actions.className = 'pass-actions';
    if (!user) {
      const link = document.createElement('a'); link.href = '/api/auth/start'; link.className = 'buy'; link.textContent = 'Link to buy'; actions.append(link);
    } else if (state === 'verified' || state === 'already_owned') {
      const disabled = document.createElement('button'); disabled.className = 'buy'; disabled.disabled = true;
      disabled.textContent = state === 'verified' ? 'Verified' : 'Already owned'; actions.append(disabled);
    } else {
      actions.append(makeButton(state === 'pending' ? 'Open Roblox' : 'Buy on Roblox', 'buy', async () => {
        if (pass.requiresGamblerRole) openRoleDialog(pass);
        else await checkoutPass(pass);
      }));
      if (state === 'pending') actions.append(makeButton('Verify now', 'verify', async () => {
        const response = await jsonRequest('/api/verify', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ passId: pass.id })
        });
        setFeedback(response.status === 'verified' ? `${pass.name} verified! Discord will be notified.` :
          response.status === 'requires_gambler_role' ?
            'Coin verification requires Fish, Sharp Card, or Whale. Buy one of these role passes first.' :
            `${pass.name} is still pending. If you purchased it, try again shortly.`,
          response.status === 'requires_gambler_role');
        await refreshAccount(); renderPasses();
      }));
    }
    // A direct gamepass-page link is always available, even before login.
    // It is only a view link: tracked purchase and role checks use /api/checkout.
    actions.append(robloxAnchor(pass));
    info.append(name, price);
    if (pass.requiresGamblerRole || pass.isGamblerRole) {
      const badge = document.createElement('span');
      badge.className = pass.requiresGamblerRole ? 'coin-badge' : 'role-pass-badge';
      badge.textContent = pass.requiresGamblerRole ? 'Gambler role required' : 'Gambler role';
      info.append(badge);
    }
    info.append(stateText, actions);
    card.append(logo, info);
    grid.append(card);
  }
}
async function init() {
  // Render catalog independently from account login, so a missing D1 binding or
  // unfinished OAuth configuration does not prevent clicking gamepass links.
  try {
    let catalog;
    try {
      catalog = await jsonRequest('/api/passes');
    } catch (serverError) {
      const response = await fetch('/catalog.json', { cache: 'no-store' });
      if (!response.ok) throw serverError;
      catalog = await response.json();
    }
    passes = catalog.passes;
    renderPasses();
  } catch (error) {
    setFeedback(`Unable to load gamepasses: ${error.message}`, true);
    grid.replaceChildren();
    const msg = document.createElement('p');
    msg.textContent = 'The gamepass catalog could not load. Please try refreshing the page.';
    grid.append(msg);
  }

  try {
    await refreshAccount();
    renderPasses();
  } catch (error) {
    // Keep the anonymous Link Roblox button and gamepass links on the page.
    user = null;
    renderPasses();
    setFeedback('Account service is not ready. The site owner must configure the Cloudflare D1 database and Roblox OAuth secrets. Gamepass links can still be opened.', true);
  }
  const params = new URL(location.href).searchParams;
  if (params.get('auth') === 'setup') {
    setFeedback('Roblox linking needs setup: configure ROBLOX_CLIENT_ID, ROBLOX_CLIENT_SECRET, SITE_URL, and the Cloudflare D1 binding DB.', true);
  } else if (params.get('auth') === 'db') {
    setFeedback('Roblox linking needs the Cloudflare D1 binding named DB and database tables from schema.sql.', true);
  } else if (params.get('auth') === 'denied') {
    setFeedback('Roblox authorization was canceled. You can try again.', true);
  } else if (params.get('auth') === 'error') {
    setFeedback('Roblox login was not completed. Check the exact OAuth redirect URL registered with Roblox and your Cloudflare secrets, then retry.', true);
  }
  // Remove auth query params to prevent stale errors after later reloads.
  if (params.has('auth')) history.replaceState(null, '', `${location.pathname}${location.hash}`);
  setInterval(async () => {
    try { await refreshAccount(); renderPasses(); } catch { /* retry on next interval */ }
  }, 30000);
}
init();
