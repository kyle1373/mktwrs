# Mario Kart Tour World Records

A Next.js archive of Mario Kart Tour Time Trial records, submissions, players and playable tour windows. The UI follows the compact course-page layout of MKWRS: Current WR, Course Stats and chronological History, with dated tour start/end rows. Video evidence links from the time; a separate image icon opens screenshot proof. The original Mario Kart Tour logo, mushroom icon and course artwork are preserved locally.

## Run

```sh
npm ci
npm run dev
```

`npm run build` rebuilds the static JSON from preserved sources and prerenders the course and player pages. `npm start` serves the production Next.js build. `/health` is Railway's health check. No database is required.

## Sources and preservation

- `archive/raw/`: original Discord message captures, wiki pages, and the original leaderboard workbook. This directory belongs in the private repository, not the public web root.
- `scripts/extract-workbook.py`: read-only extraction of the saved workbook into a JSON intermediate; requires Python with openpyxl.
- `scripts/build.mjs` and `scripts/import-sources.mjs`: deterministic import, name mapping and source reconciliation.
- `archive/import-issues.json`: records that need manual review, retained instead of silently corrected or discarded.
- `public/data/courses/<id>.json`: independently downloadable course history, submissions and tour appearances.
- `public/data/manifest.json`: current import counts and coverage status.
- `scripts/mirror-assets.mjs`: preserves available course artwork, player pictures and WR screenshot evidence locally. Failed retrievals remain in `archive/assets-manifest.json`.
- `scripts/audit-videos.mjs`: retrieves public YouTube oEmbed titles. Title/time conflicts are preserved but withheld as linked proof pending verification.
- `scripts/map-submission-images.mjs`: builds a tt-submission-only review queue with tour/course candidates, submission matches and missing-media flags; date correlation never automatically verifies a WR.
- `scripts/ocr-submission-images.swift`: optional macOS Vision OCR of preserved local images; writes unverified text and coordinates for subsequent visual review.
- `archive/curated-runs.json`: individually reviewed runs with precise message references, including community WR confirmations and explicit mushroom allocations.

The workbook source is [Mario Kart Tour Course Leaderboard](https://docs.google.com/spreadsheets/d/1fTkcCluvL4frXvvFw4qBvkHBpj7mVtw7sCgDs6TGGno/edit). The original WR history is [MKCentral's wr-history channel](https://discord.com/channels/629221606064914442/896050730216095765). The course roster and tour schedule are from Super Mario Wiki.

## Accuracy rules

Time values use integer centiseconds. The spreadsheet's historical `MS` helper columns use inconsistent encodings and are not used as canonical time values. Achievement dates, source post times, submission times, and attachment upload dates are separate. Discord attachment snowflakes establish upload time, not achievement time. Migrated proof uploaded outside the record’s documented tour does not supply its displayed record date. Missing fields are null. A source split sum that disagrees with the total is flagged and not promoted to a WR row. Ties retain distinct players and source observations. Only wr-history announcements, individually confirmed community WRs and documented first-place community leaderboard entries appear in record tables, course stats and player rankings. Inferred contenders remain in each course JSON’s candidates array, and ordinary submissions remain in its submissions array. Neither contributes to WR rankings. Third-section splits are retained in JSON; the main table shows Lap 1 and Lap 2, as requested.

Playable duration is the union of course availability intervals intersected with a record's reign. It pauses outside tours. Displayed dates prioritize original submission dates in UTC. Durations use those calendar dates, with no approximation symbols. Missing dates remain blank; recovered intermediate records can revise totals. Duration totals union overlapping reigns per course, including same-country ties. `npm test` verifies these boundaries, confirmed-record filtering and tour event order.

## Research status

This is an archive in progress, not a claim of complete historical reconstruction. The WR channel and dedicated tt-submission channel have been captured back to their beginnings (11,073 submission messages at this checkpoint), and the original workbook is preserved, including 8,828 usable rows and player alias tables. All 55 pages of the discussion-channel search for “shroom” were captured, yielding 1,369 distinct message IDs. Current reconciliation focuses on tt-submission screenshots and adjacent lap-time messages. Mushroom allocations are omitted from the tables. Deleted evidence and missing dates still require reconciliation. Counts are available in the generated manifest. All public pages disclose incomplete coverage.

## Railway

Live at **https://mktwrs.com**. Railway deploys the private `kyle1373/mktwrs` repository's `main` branch automatically in the personal Hobby workspace.

Project: `mktwrs.com` (`80b026c9-fa2d-4e7d-9b01-657a2f631ff0`); production service: `mktwrs` (`dc662fe0-1295-439f-ba7f-d957436f93c5`). The service UI sets build command `npm run build` and health check `/health`; Railpack uses `npm start`. New Railway services no longer opt into the deprecated config-as-code feature, so the retained `railway.json` is not the active service configuration. Cloudflare's root CNAME points to Railway; HTTPS is active. No credentials belong in this repository.

Player portraits are refreshed from captured tt-submission avatars by matching Discord user IDs, then stored locally using `node scripts/refresh-player-avatars.mjs`. Unavailable or mismatched portraits use a neutral initial, never another player's image. `archive/player-portraits.json` retains identity and capture provenance.
