// Roblox Open Cloud inventory API: a successful, filtered response is required.
// Errors (401/403/429/5xx) must NEVER be interpreted as no ownership.
export async function ownsAnyPass(env, userId, passIds) {
  if (!Array.isArray(passIds) || passIds.length === 0 ||
      !passIds.every(id => Number.isSafeInteger(Number(id)) && Number(id) > 0)) {
    throw new Error('Invalid gamepass list');
  }
  const filter = encodeURIComponent(`gamePassIds=${passIds.join(',')}`);
  const url = `https://apis.roblox.com/cloud/v2/users/${encodeURIComponent(userId)}/inventory-items?filter=${filter}`;
  const response = await fetch(url, {
    headers: { 'x-api-key': env.ROBLOX_API_KEY, 'Accept': 'application/json' }
  });
  if (!response.ok) throw new Error(`Roblox ownership lookup failed: HTTP ${response.status}`);
  const payload = await response.json();
  if (!Array.isArray(payload.inventoryItems)) {
    throw new Error('Roblox ownership lookup returned invalid data');
  }
  // Filtered to specific pass IDs, so any returned item proves one is owned.
  return payload.inventoryItems.length > 0;
}

export async function ownsPass(env, userId, passId) {
  return ownsAnyPass(env, userId, [passId]);
}
