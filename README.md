# Basera (بصيرة) — website

Corporate training, OD consulting and learning platform for companies in Saudi Arabia.

## What's here
- `index.html` — the full site (EN/AR, course search, certificate check, AI career coach). No build step.
- `.github/workflows/deploy.yml` — publishes to GitHub Pages on every push to `main`.

## Run locally
Open `index.html` in a browser, or:
```
python3 -m http.server 8080
```

## Deploy
1. Push to `main`.
2. In the repo: Settings → Pages → Source: **GitHub Actions**.
3. The Actions tab shows the deploy; the URL is `https://<user>.github.io/<repo>/`.

## Backend (Supabase project `basera`, eu-central-1)
- Tables: `courses` (public read), `certificates` (lookup only via `verify_certificate(code)` RPC), `leads` (public insert), `coach_logs`.
- Edge Function `career-coach`: holds the Anthropic key server-side, answers from the live catalogue, logs each exchange.
- Required secret: `ANTHROPIC_API_KEY` (Dashboard → Edge Functions → Secrets). Without it the site falls back to keyword matching.
- The anon key in `index.html` is public by design; row-level security protects the data.

## Before going live
- Replace `hello@basera.sa` and the phone number in the contact section.
- Add real courses to `courses` and real certificates to `certificates`; the demo code `BSR-2026-00417` can be deleted.

## Custom domain
Add a `CNAME` file containing the domain, then point DNS at GitHub Pages.
