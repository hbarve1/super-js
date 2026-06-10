# Super.js Website

Next.js 16 website for [superjs.dev](https://superjs.dev).

## Development

```bash
npm install
npm run dev
```

## Deployment

Deploys to Cloudflare Pages on push to `master` (when `website/` changes).

Required GitHub secrets:
- `CF_API_TOKEN` — Cloudflare API token (Pages: Edit permission)
- `CF_ACCOUNT_ID` — Cloudflare account ID

Local preview: `npm run preview:cf`
