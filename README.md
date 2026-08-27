# OurTales — landing page

**Live:** https://dev-zohaibalishah.github.io/ourtales-landing/  
**Download:** [OurTales 1.0.1 for Android](https://github.com/dev-zohaibalishah/ourtales-landing/releases/download/v1.0.1/ourtales-1.0.1-android.apk) · 145.0 MB · Android 7.0+

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

---

## The app itself

The APK is **not in this repository** — at 145.0 MB it is well past what a git
repository should carry. It lives as a [GitHub Release][rel] asset, and every download
button on the page links straight at it:

```
https://github.com/dev-zohaibalishah/ourtales-landing/releases/download/v1.0.1/ourtales-1.0.1-android.apk
```

Current build, all of it verified against the file itself rather than copied from a
build log:

| | |
|---|---|
| Version | 1.0.1 (versionCode 1) |
| Size | 145.0 MB (152,031,865 bytes) |
| Package | `xyz.ourtales.app` |
| minSdk / targetSdk | 24 (Android 7.0) / 36 |
| ABIs | arm64-v8a, armeabi-v7a, x86, x86_64 — which is most of the size |
| Signing | APK Signature Scheme v2/v3 |
| SHA-256 | `4e4b77aa733768207405693c9acd8aaec4ada56ecb68657351ade92a4043fc5f` |

[rel]: https://github.com/dev-zohaibalishah/ourtales-landing/releases/tag/v1.0.1

The `v1.0.1` asset has been replaced in place twice, so the download URL has never
changed and three distinct binaries have now been published under it. Superseded
checksums, oldest first:

- `6268598da095e38f91e89f4b91436e68a95b66965471c0cdd7c687313ab909de` — 148,579,637 bytes
- `4516682f8248609d1c656eef58bbb1d7065e4f4b6024485dde5d51ebadac9c26` — 148,598,233 bytes

Every one of them carries the same signing certificate (`ef4e3c1b…baa6577c`), so each
installs straight over the last with nothing to uninstall. That is the *only* reason
replacing in place has been safe.

**It should stop being the habit, though.** `versionName` and `versionCode` have stayed
`1.0.1` / `1` across all three, which means:

- anyone holding an earlier download now fails a checksum comparison against this page,
  and a failed checksum is indistinguishable from tampering unless they read the release
  notes (which record the superseded values for exactly this reason);
- no tester can tell you which build they are running, and the app cannot tell you either;
- Play Store submission will reject a second upload at `versionCode 1` outright.

Bump `versionCode` in `app.config.ts` and cut a new tag for the next build.

### Publishing a new build

```bash
gh release create v1.0.2 ./ourtales-1.0.2-android.apk --title "OurTales 1.0.2 — Android beta" --notes-file notes.md
```

Then update the page. The version, size and checksum are written into the HTML as
literal text in several places on purpose — a download link that only works once
JavaScript has run is a download link that silently fails for some people:

- **the URL** — six links: header, hero, download panel, final CTA, mobile dock, footer
- **the numbers** — hero `.get__meta`, final `.get__meta`, the `.facts` list, the mobile dock
- **the checksum** — the `data-copy` attribute *and* the visible `<code>` beside it
- **JSON-LD** — `softwareVersion`, `fileSize`, `downloadUrl`
- **`CONFIG.BUILD`** in `assets/js/main.js`, which only tags the analytics events

Sanity check before pushing:

```bash
grep -c "1\.0\.1" index.html
```

### Before you publish an APK anywhere

Confirm nothing secret is baked into the JS bundle. This build was checked: it carries
only the Supabase **publishable** key (client-safe by design) — no service-role JWT, no
`sb_secret_` value, no service-account private key. Anything shipped in an APK is public
the moment the link is.

---

## Wire up the waitlist

Signups are **not** collected until you set one string. Open
[`assets/js/main.js`](assets/js/main.js) and fill in `CONFIG.ENDPOINT`:

```js
var CONFIG = {
  ENDPOINT: 'https://formspree.io/f/xxxxxxx',   // or a Supabase Edge Function, Buttondown, …
  STORAGE_KEY: 'ourtales.waitlist',
  BUILD: { version: '1.0.1', platform: 'android' }
};
```

It POSTs `{ email, source, page }` as JSON. `source` names the form that fired — today
that is the single `ios` waitlist form, since the Android half of the audience downloads
the app instead of leaving an address.

**Until it is set**, a submission is validated, written to `localStorage` and shown the
success state — so the page can be demoed and shared without pretending to collect
addresses it is throwing away. Addresses captured that way are readable in the console
with `JSON.parse(localStorage.getItem('ourtales.waitlist'))`.

### Analytics

`track()` in `main.js` pushes to `dataLayer`, `gtag` and `plausible` if any of them are
on the page, and no-ops otherwise. Drop your tag into `index.html` and events start
flowing with no edit here. Events: `download_click` (the one that matters — carries version and
section), `cta_click`, `checksum_copy`, `signup_submit`, `signup_success`,
`signup_invalid`, `signup_error`.

---

## How the page is built to convert

| Decision | Reason |
|---|---|
| One primary CTA above the fold, and it is the download | The app exists and is free. Anything standing between the visitor and installing it is a leak — including an email field asking permission to send them the thing they could already have. |
| The iPhone route is a visibly secondary button | Two equal buttons make the visitor choose a platform before they have chosen the product. The email capture still exists — one field, further down — for the half of the audience Android cannot serve yet. |
| Six download links, one destination | Readers convert at different depths: header, hero, story section, download panel, final CTA, mobile dock. Nobody should have to scroll back up. |
| A whole section about Android's "unknown source" warning | For an APK outside the Play Store this is *the* drop-off point. Explaining what the warning actually says — and publishing the checksum so the source becomes checkable — converts far better than hoping nobody notices. |
| Version, size, minimum Android and checksum stated up front | Nothing kills a direct download like uncertainty about what you just got. Every number on the page was read out of the APK itself, not copied from a build log. |
| "What you get / what we're asking" side by side | Naming the cost up front converts better than hiding it, and it filters out testers who will never invite anyone. |
| Objection-handling FAQ, including a "what's still rough" answer | The rough-edges answer is the highest-trust thing on the page. It is also indexed as `FAQPage` structured data. |
| No testimonials, no user counts, no invented statistics | Nothing has shipped to real users yet. The proof here is product proof — enforceable guarantees and a build you can verify — because fabricated social proof is the fastest way to lose the audience this app is for. |

## Accessibility

Skip link, visible focus rings, `aria-invalid` toggled on the email fields, live regions
on the success states, `prefers-reduced-motion` honoured throughout, and the mobile dock
goes `inert` while off-screen so it cannot take focus behind the page.

---

## Design

Palette, type scale, radii and motion come from the app's own tokens
(`src/theme/tokens.ts`, `src/theme/typography.ts`) rather than being invented for
marketing: a single crimson accent `#F5334B` on a warm cream ground, Playfair Display
for headlines, Inter for everything else. The wordmark is the supplied logo artwork, not
type. The four secondary colours are used only for the "many voices" motif — avatars,
step markers, pillar icons — and never for an affordance.

The phone in the hero is drawn in CSS, not photographed, and uses gradient
"PhotoPlates" exactly as the app does in place of real images.

## Files

```
index.html            the page
404.html              not-found page — self-contained, logo inlined as a data URI
assets/css/styles.css design system + every section
assets/js/main.js     forms, analytics hooks, reveal, dock
assets/img/           brand assets (below)
site.webmanifest      installable metadata
robots.txt sitemap.xml
.github/workflows/pages.yml
```

### Brand assets

The logo arrives as one stacked lockup — book above wordmark — which is illegible at
header size, so it is cut into halves the page recombines horizontally:

| File | Used by |
|---|---|
| `ourtales-lockup.png` | the master artwork; not referenced by the page, kept for decks and press |
| `ourtales-mark.png` | the book alone — header and footer |
| `ourtales-wordmark.png` | the wordmark alone — header |
| `ourtales-wordmark-onink.png` | same wordmark with the navy "Our" repainted cream, for the near-black footer |
| `og-card.png` | 1200×630 share card, the lockup centred on cream |
| `favicon-32.png`, `favicon-180.png`, `ourtales-icon-512.png` | tab icon, apple-touch icon, manifest |

All of them are generated from the single supplied PNG. Heights are set in CSS and
widths left to the intrinsic ratio, so no half can be squashed independently of the
other. When the logo changes, re-cut all of them rather than replacing one — a mark and
wordmark from different revisions sitting side by side is the kind of thing nobody
notices for months.
