# Mario Kart Tour World Records

A Next.js archive of Mario Kart Tour Time Trial records, submissions, players and playable tour windows. The UI follows the compact table and sidebar layout of MKWRS. Video evidence links from the time; image-only times are not links.

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

The workbook source is [Mario Kart Tour Course Leaderboard](https://docs.google.com/spreadsheets/d/1fTkcCluvL4frXvvFw4qBvkHBpj7mVtw7sCgDs6TGGno/edit). The original WR history is [MKCentral's wr-history channel](https://discord.com/channels/629221606064914442/896050730216095765). The course roster and tour schedule are from Super Mario Wiki.

## Accuracy rules

Time values use integer centiseconds. The spreadsheet's historical `MS` helper columns use inconsistent encodings and are not used as canonical time values. Dates, source post times and submission times are separate. Missing fields are null. A source split sum that disagrees with the total is flagged and not promoted to a WR row. Ties retain distinct players and source observations.

Playable duration is the union of course availability intervals intersected with a record's reign. It pauses outside tours. Missing achievement dates or missing intervening record chronology must not silently produce an exact reign duration. `npm test` verifies these boundaries.

## Research status

This is an archive in progress, not a claim of complete historical reconstruction. The WR channel has been captured back to its beginning and the original workbook preserved, including thousands of submissions and player alias tables. Older original Discord submissions, discussions, mushroom allocations, deleted evidence and missing dates still require reconciliation. Counts are available in the generated manifest. All public pages disclose incomplete coverage.

## Railway

Connect this repository's `main` branch to a Railway service in the personal Hobby workspace. `railway.json` supplies build, start and health-check settings. Railway should deploy on each push. Add `mktwrs.com` as a custom domain and apply the exact DNS records Railway provides in Cloudflare. No credentials belong in this repository.
