# Archive review tracking

The archive is incomplete. No year or tour appearance is certified exhaustively reviewed.

Regenerate the evidence-transfer check with `python3 scripts/audit-early-review-transfer.py` and the queue snapshot with `python3 scripts/archive-status.py`.

Each source is identified by Discord channel and message ID. Images use attachment IDs or stable external-image IDs; download ledgers retain local files and hashes. Reviewed images are not reread routinely. Reopen them when transcription is ambiguous, a conflicting source appears, or surrounding messages are needed to establish player, laps, or chronology.

The stages are distinct: source captured, media preserved, image read, chronology reconciled, record published, live result verified. A screenshot showing a personal best does not establish a world record. A repost timestamp does not establish the date of the run. Missing original dates stay unresolved.

## Saved checkpoints

- `2019-image-to-curated-audit.json`: links for 90 transcribed 2019 images from one indexed queue.
- `early-review-transfer-audit.json`: repeatable source/time/course matching for the saved pre-March-2020 image queue. This checks transfer into curated evidence, not WR completeness.
- Held evidence has an explicit disposition report. The readable October 23, 2019 Dino Dino Jungle 1:45.50 cup overview is held for unknown runner identity, rather than treated as an unprocessed image. It remains unpublished.
- `early-chronology-resume-queue.json`: unresolved early achievement-date leads, keyed by record ID with source links and required evidence.
- `early-undated-published-records-queue.json`: 14 accepted early records without record dates in the saved snapshot. Separate from intermediate-run leads.
- `history-coverage-audit.json`: per-course, per-tour flags; all appearances remain unverified until source coverage and rival chronology are reconciled.
- `archive-status.json`: generated counts and the continuous discussion/message and submission/image checkpoints. Counts from overlapping searches must not be added as unique coverage.

The current saved continuous discussion capture runs from December 2, 2020 to February 16, 2021 (14,558 unique messages across 707 overlapping pages). It does not establish complete coverage before December 2020, and capturing messages does not establish that every image or external video was reviewed.

Tour reconciliation reports preserve individual image readings and contextual decisions. Original source URLs remain attached to curated runs. Publication and live deployment are tracked separately; a Git push alone does not verify the live site.

The chronology queue also includes report-only leads that are absent from curated runs. For example, Astre's April 8, 2020 report names Tomegome's Kalimari Desert 1:15.99 alongside Kaguya's faster 1:15.83. Its original proof, achievement date and possible earlier WR status are still open. Queue counts therefore need not equal undated curated-run counts.
