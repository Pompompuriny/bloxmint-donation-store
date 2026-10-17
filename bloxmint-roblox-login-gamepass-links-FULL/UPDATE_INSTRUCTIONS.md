# BloxMint updated gamepasses + coin requirement

This ZIP has **files at the ZIP root** (`public/`, `functions/`, `cron-worker/`, etc.) to prevent the extra nested folder problem experienced with earlier packages.

## Updating your existing GitHub Pages project

Your last-known repository is `Pompompuriny/bloxmint-donation-store`, with the Pages site files inside:

`bloxmint-donation-store-discord-invite/roblox-donation-store/`

**Keep your existing Cloudflare Pages root directory** if it currently points to that location.

1. Download and extract the ZIP on your computer.
2. Replace the corresponding files INSIDE the existing repository's `bloxmint-donation-store-discord-invite/roblox-donation-store/` directory. The `public` and `functions` folders must remain siblings at that location.
3. Add the new file `functions/_lib/gambler.js` (not present in previous versions).
4. Commit all changes to the production branch (typically `main`). Cloudflare Pages will deploy automatically.
5. Check that the project's **build output directory** remains `public` and the build command is empty.
6. Refresh the website and verify that it lists **26** passes. Sign in with Roblox, tap Buy on `30k coins`, and check that the role notice opens.
7. Test with a linked account without Fish/Sharp Card/Whale (blocked) and one owning at least one (proceeds to Roblox).

If you instead create a **new** GitHub repository for the extracted ZIP files at the repository root, set Cloudflare Pages **root directory** to the repo root (blank) and **build output** to `public`.

## How restriction works

Coin gamepasses: `30k coins`, `150k coins`, `500k coins`, `1.2M coins`.

Any ONE of Fish (`2036210513`), Sharp Card (`2037020534`), or Whale (`2039810308`) qualifies, based on **Roblox gamepass ownership**, not Discord roles.

- UI popup on coin Buy, with shortcuts to the three role gamepasses.
- `/api/checkout` refuses to give a coin gamepass link if none of the role passes is owned.
- `/api/verify` / cron sweep also refuse to mark a coin gamepass verified without the prerequisite pass.
- This site cannot restrict someone who directly purchases a public gamepass **on Roblox**. Roblox game scripts must separately check eligibility before granting in-game coin benefits.

Existing D1 schema and Cloudflare environment variable names **do not change**.

To run local code tests with Node.js 22+: `npm test` and `npm run verify`.
