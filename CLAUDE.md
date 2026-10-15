# Deploy calculators

Embeddable financial calculators for deploy.finance (Webflow site "Deploy LP"). They serve two goals: organic SEO traffic, and funnelling visitors to Deploy's agents. Deploy trades stocks, crypto, FX and commodities, so keep calculators asset-agnostic (asset-class switch) and never frame Deploy as crypto-only.

## Rules

- **This repo is public** (github.com/Faction42HQ/deploy-calculators). Never commit `deploy-calculators-plan.md`, `silvia-calculators-review.md` or `content/` (strategy and page copy; they're gitignored on purpose). Check `git status` before every commit.
- **Compliance wording lives in `src/config.ts`** (Deploy APY figure and source, disclaimers, CTA links). Never present Deploy's APY as guaranteed; reuse the homepage wording. Changes there need the user's sign-off.
- **Math goes in `src/math/` as pure functions with tests** in `test/math.test.ts`, with the hand-worked arithmetic in a comment. UI definitions in `src/calcs/` stay declarative (fields + compute).
- Nothing on the Webflow site changes without the user's explicit go-ahead; create pages and CMS items as drafts.

## Commands

```bash
npm run dev        # http://localhost:5173/demo/ (the demo cache-busts the entry)
npm test           # vitest, math
npm run typecheck
npm run release    # clean build + dist/seo assets
npm run sri        # pinned jsDelivr URL + SRI hash of the single-file bundle
```

## Releasing (jsDelivr serves tagged commits)

1. Bump `package.json` version, `npm run release`, commit `dist/` with the change.
2. `git tag vX.Y.Z && git push && git push --tags`, then `npm run sri` and confirm "jsDelivr serves the same file".
3. Webflow uses the pinned single-file `dist/deploy-calcs.bundle.js` with its SRI hash. Don't put SRI on the split ES module `deploy-calcs.js`: the browser won't run it, because the hash can't cover its lazily imported chunks. Third-party embeds use `@1/dist/deploy-calcs.js`.

## Adding a calculator

Math in `src/math/` + tests → definition in `src/calcs/` → key in `src/registry.ts` → SEO meta in `scripts/seo-meta.ts` (title ≤60 chars, description ≤155) → `npm run seo` → check it in the demo at desktop and phone width.
