# OurTales — landing page

**Live:** https://dev-zohaibalishah.github.io/ourtales-landing/

The acquisition page for **OurTales**, the memory-preservation app: one photograph,
everyone who was there adds their side by voice, photo or text, and a composed story
holds all of it without rewriting anyone or inventing anything.

This repository is the marketing site only. It is deliberately a **static page with no
build step** — one HTML file, one stylesheet, one script, no dependencies, no
framework. It loads on a bad connection in a village, which is the audience.

---

## Run it

Open `index.html`. That is the whole workflow. For a local server:

```bash
python -m http.server 8000
```

## Deploy

Pushing to `main` publishes to GitHub Pages via `.github/workflows/pages.yml`.
It works unchanged on Netlify, Vercel, Cloudflare Pages or any static host — the
repository root is the site.

### When the real domain exists

Three files hold the absolute URL and all three must move together, or the canonical
tag will point at a host that no longer serves the page:

- `index.html` — `<link rel="canonical">`, `og:url`, `og:image`, `twitter:image`
- `sitemap.xml` — `<loc>`
- `robots.txt` — `Sitemap:`

Also change the `404.html` home link away from `/ourtales-landing/` and drop the
project subpath.

### Known gap: the share card

`og:image` currently points at the 2080×520 brand logo. Scrapers crop or letterbox it
to 1.91:1. A purpose-built 1200×630 `assets/img/og-card.png` should replace it before
the link gets shared anywhere that matters.

---

## Wire up the waitlist

Signups are **not** collected until you set one string. Open
[`assets/js/main.js`](assets/js/main.js) and fill in `CONFIG.ENDPOINT`:

```js
var CONFIG = {
  ENDPOINT: 'https://formspree.io/f/xxxxxxx',   // or a Supabase Edge Function, Buttondown, …
  SEATS: { total: 40, taken: null },
  STORAGE_KEY: 'ourtales.waitlist'
};
```

It POSTs `{ email, source, page }` as JSON. `source` is which of the three forms fired
(`hero`, `beta`, `final`), so you can see which section actually converts.

**Until it is set**, a submission is validated, written to `localStorage` and shown the
success state — so the page can be demoed and shared without pretending to collect
addresses it is throwing away. Addresses captured that way are readable in the console
with `JSON.parse(localStorage.getItem('ourtales.waitlist'))`.

### The seat meter

`CONFIG.SEATS.taken` is `null` by default and the progress meter stays hidden. Put a
number there **only when it is the real count** — a scarcity bar that lies is the one
thing that makes a beta page feel like a scam.

### Analytics

`track()` in `main.js` pushes to `dataLayer`, `gtag` and `plausible` if any of them are
on the page, and no-ops otherwise. Drop your tag into `index.html` and events start
flowing with no edit here. Events: `cta_click`, `signup_submit`, `signup_success`,
`signup_invalid`, `signup_error` — each carrying the section it came from.

---

## How the page is built to convert

| Decision | Reason |
|---|---|
| Email field above the fold, one input | Every extra field costs signups. Name, device and use-case are asked in the confirmation email instead, where the person is already committed. |
| The same offer three times (hero, beta, footer) | Readers convert at different depths. Nobody should have to scroll back up. |
| Mobile dock appears only after the hero form leaves the screen | A persistent bar competing with the hero CTA cannibalises it. |
| "What you get / what we ask" side by side | Naming the cost up front converts better than hiding it, and it filters out testers who will never invite anyone. |
| Objection-handling FAQ, including a "what's still rough" answer | The rough-edges answer is the highest-trust thing on the page. It is also indexed as `FAQPage` structured data. |
| No testimonials, no user counts, no invented statistics | Nothing has shipped yet. The proof on this page is product proof — enforceable guarantees — because fabricated social proof is the fastest way to lose the audience this app is for. |

## Accessibility

Skip link, visible focus rings, `aria-invalid` toggled on the email fields, live regions
on the success states, `prefers-reduced-motion` honoured throughout, and the mobile dock
goes `inert` while off-screen so it cannot take focus behind the page.

---

## Design

Palette, type scale, radii and motion come from the app's own tokens
(`src/theme/tokens.ts`, `src/theme/typography.ts`) rather than being invented for
marketing: a single crimson accent `#F5334B` on a warm cream ground, Playfair Display
for headlines and the wordmark, Inter for everything else. The four mosaic colours from
the app icon are used only for the "many voices" motif — never for an affordance.

The phone in the hero is drawn in CSS, not photographed, and uses gradient
"PhotoPlates" exactly as the app does in place of real images.

## Files

```
index.html            the page
404.html              not-found page
assets/css/styles.css design system + every section
assets/js/main.js     forms, analytics hooks, reveal, dock
assets/img/           logo + favicon
site.webmanifest      installable metadata
robots.txt sitemap.xml
.github/workflows/pages.yml
```
