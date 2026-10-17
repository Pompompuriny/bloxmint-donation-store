# BloxMint: Roblox account linking + gamepass links

## Files to upload

Upload the contents of the update ZIP to the **root directory configured for your Cloudflare Pages project**, preserving the `public/` and `functions/` folders. You may copy the complete ZIP contents to that root to replace everything. Do **not** upload the ZIP as a single file.

If your GitHub repository has a nested folder, use the actual Pages **Root directory** shown in your settings. The **Build output directory** must remain `public`; build command is empty.

## Account linking (real Roblox OAuth, not a fake username box)

The **Link with Roblox** buttons open `/api/auth/start`. Pages Functions starts Roblox official `https://apis.roblox.com/oauth/v1/authorize`, stores CSRF state and PKCE verifier in D1, then exchanges the authorization code on `/api/auth/callback` and creates a secure signed-in session.

1. Roblox Creator Dashboard > Credentials > OAuth 2.0 Apps: register an app with `openid` and `profile` scopes. You need Roblox's OAuth eligibility/approval requirements for public use.
2. Set the exact OAuth redirect URI (including `/api/auth/callback`):
   `https://YOUR-ACTUAL-PROJECT.pages.dev/api/auth/callback`
3. In Cloudflare **Pages project** > Settings > Variables and Secrets (Production):
   - `SITE_URL` = `https://YOUR-ACTUAL-PROJECT.pages.dev` (no trailing slash)
   - `ROBLOX_CLIENT_ID` = Roblox OAuth Client ID
   - `ROBLOX_CLIENT_SECRET` = Roblox OAuth Client Secret (**Secret**)
   - `ROBLOX_API_KEY` = Roblox Open Cloud API key for ownership checks (**Secret**)
   - `DISCORD_BOT_TOKEN`, `DISCORD_CHANNEL_ID` as before (**Bot Token Secret**)
   - `SWEEP_SECRET` as before
4. Create Cloudflare D1 `donation_db`, execute `schema.sql`, and add a **Pages Functions** binding **named exactly `DB`**. Redeploy.
5. Click Link with Roblox. If anything is missing, the homepage shows a useful setup message instead of a server stack trace.

**Important:** No real Roblox account can be linked until YOU configure Roblox OAuth credentials and the Cloudflare D1 binding. These cannot be embedded in an open-source ZIP and must never be committed to GitHub.

## Gamepass links

- All 26 passes display a **View pass ↗** link that directly opens `https://www.roblox.com/game-pass/PASS_ID` in a new tab or the Roblox app if the device associates that URL with Roblox.
- Clicking the pass title opens its Roblox page as well.
- For a **tracked purchase** and eventual Discord verification: first Link with Roblox, then click **Buy on Roblox**, which uses `/api/checkout` and only redirects after ownership checks and pending-intent storage.
- Fish, Sharp Card and Whale in the coin-requirement popup directly open their own gamepass pages.
- Coin-pass Buy is still blocked server-side unless linked account owns one of those three role gamepasses; **View pass** cannot enforce this and a user can still manually navigate to public Roblox pages. Your Roblox game server must verify role access before granting coin rewards.
- Direct links can load without Roblox OAuth, but they do **not** by themselves record a purchase or send a Discord notification.

## Testing

1. Visit deployed site: all 26 passes should be visible even if D1 isn't connected yet.
2. Tap REAPER > View pass ↗ : Roblox page with ID `2036090286` should open.
3. Tap Fish > View pass ↗ : Roblox page with ID `2036210513` should open.
4. Tap Link with Roblox: official Roblox OAuth page should open; returning should show your username (requires above credentials).
5. Tap Buy on Roblox after linking: check that it redirects to exact pass and creates pending donation. Return to Verify now after buying and check your Discord confirmation.
6. Test a restricted coin pass without and with a Gambler role. It must block then allow **tracked Buy** respectively. Roblox pages can still be viewed directly.

These gamepass IDs and listed prices were provided by the website owner. Confirm ownership, pricing, and sale status in the Roblox Creator Dashboard; Roblox controls the real checkout experience.
