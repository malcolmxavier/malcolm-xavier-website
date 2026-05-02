# Letterboxd export drop zone

Drop the **unzipped** Letterboxd export here. The refresh script reads
the following files directly from this directory:

- `diary.csv` — every diary entry (one row per watch event)
- `reviews.csv` — every review (one row per review, joined to diary by date + film)
- `watched.csv` — full watched list
- `ratings.csv` — ratings without diary entries (e.g. legacy imports)

## How to export

1. Letterboxd → Settings → **Import & Export**
2. Click **"Export your data"** — Letterboxd queues a ZIP and emails a download link.
3. Unzip the ZIP **into this directory**. Letterboxd's ZIP creates a
   timestamped subfolder (e.g. `letterboxd-<user>-<timestamp>-utc/`)
   that nests the actual CSVs — that's expected. The refresh script
   walks one level down to find them. Don't flatten the structure;
   keeping the nested folder lets multiple exports coexist (the
   parser picks the most recent by mtime).

## Privacy

Everything in this directory other than this README is gitignored.
Your viewing data, ratings, and review prose stay local — they're
read by the refresh script, baked into the snapshot at
`lib/feeds/_fixtures/letterboxd-snapshot.json`, and the snapshot is
the only artifact that gets committed.

## When to re-export

The Letterboxd export is the **bulk seed** source. Refresh `films:refresh`
will detect when `diary.csv` mtime is newer than the current snapshot
capture and re-seed from CSV; otherwise it pulls the last ~50 entries
via RSS. So you only need a fresh export when:

- You've made retroactive edits on Letterboxd (corrected old reviews,
  changed ratings, deleted entries).
- You want to re-run the full TMDB enrichment from scratch.
- You first set up the project on a new machine.

For routine "I watched and reviewed something new" cases, the RSS-only
incremental refresh covers it — no re-export needed.
