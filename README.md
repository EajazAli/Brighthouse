# Bright House

Bilingual (Arabic and English) website for Bright House Real Estate, a property
management company in Jeddah. Static site, no framework: one Node script writes
`dist/`.

## Build

```bash
node build.mjs
```

Output goes to `dist/`. Serve that folder from the root of a domain.

To build for a sub-path (this is what the GitHub Pages preview does):

```bash
BASE=/Brighthouse node build.mjs
```

A sub-path build is marked `noindex`. Canonical URLs always point at
`https://brighthouse.sa`.

## Where things are

| Path | What |
|---|---|
| `src/content.mjs` | All copy in both languages, routes, phone, form endpoint |
| `src/articles.json` | The 240 migrated blog articles |
| `src/site.css`, `src/site.js` | Page styles and behaviour |
| `assets/` | Fonts, images, the scroll engine |
| `build.mjs` | Templates, structured data, sitemap, `llms.txt`, redirects |
| `tools/` | Asset preparation, article extraction, checks |

## Before launch

- Set `endpoint` in `src/content.mjs` so enquiries are recorded. While it is
  empty the form hands the message to WhatsApp.
- `dist/_redirects` covers the old tag, category, author and shop URLs. It works
  on Cloudflare Pages and Netlify. GitHub Pages ignores it.
- Most article featured images are still missing (see `tools/post_images.py`).
- Article content was migrated as written and needs an editorial review.

## Checks

```bash
node tools/check.mjs
```
