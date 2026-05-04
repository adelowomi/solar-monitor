# Sunhouse

A calm, personal dashboard for monitoring a Lutian WF-series hybrid solar inverter. Replaces the slow official "Solar of Things" app with a faster, dark-themed, notification-enabled interface built for Lagos power conditions.

## Architecture

```
 Browser (Vite + React + TS + Tailwind)
    |
    | HTTPS (fetch, 30s polling)
    v
 Cloudflare Worker (CORS proxy)
    |
    | HTTPS (forwarded as-is)
    v
 solar.siseli.com (Siseli IoT API)
```

- **Frontend:** Single-page app. No backend. Session stored in localStorage.
- **Proxy:** Thin Cloudflare Worker that forwards requests and adds CORS headers.
- **API:** Reverse-engineered JSON API from the Solar of Things web app.

## Features

- Live solar/battery/grid/load monitoring with 30s polling
- Plain-English status summary ("Grid is out -- running on battery ~3.2h left")
- Browser notifications: grid restored, grid lost, low battery, high temp, fault
- Settings panel: battery capacity, alert thresholds, notification toggles
- Dark theme with Fraunces display font
- Pauses polling when tab is hidden
- Mobile-responsive (360px+)

## Deploy the proxy

1. Sign up at [Cloudflare](https://dash.cloudflare.com/) (free tier).
2. Go to **Workers & Pages > Create > Create Worker**.
3. Name it `sunhouse-proxy`, click **Deploy**.
4. Click **Edit code**, paste the contents of `../sunhouse_proxy_worker.js`, click **Deploy**.
5. Copy your worker URL: `https://sunhouse-proxy.YOURNAME.workers.dev`

## Deploy the frontend

### Option A: Local dev

```bash
cp .env.local.example .env.local
# Edit .env.local -- set VITE_API_BASE to your worker URL + /apis

npm install
npm run dev
```

### Option B: Cloudflare Pages / Vercel

1. Push this repo to GitHub.
2. Connect the repo in Cloudflare Pages or Vercel.
3. Set the build command to `npm run build` and the output directory to `dist`.
4. Add the environment variable `VITE_API_BASE` with your proxy URL + `/apis`.
5. Deploy. Auto-deploys on push to `main`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | TypeScript check + production build |
| `npm run test` | Run Vitest tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run format` | Format source with Prettier |
| `npm run lint` | ESLint check |
| `npm run preview` | Preview production build locally |

## Open questions

1. **Battery capacity** defaults to 5 kWh. Configurable in Settings.
2. **Refresh token** endpoint not yet captured. Auth errors kick to login for now.
3. **Two-phase output** -- if your setup is two-phase, L2 fields need to be surfaced. Currently single-phase only.

## Security

- Your password (MD5'd) passes through your own Cloudflare Worker to Siseli. Cloudflare doesn't log request bodies by default.
- Access tokens live in localStorage. Fine for a single-user personal app.
- No secrets should ever be committed. `.env*` and `*.har` are gitignored.
