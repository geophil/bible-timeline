# Bible Timeline

A tablet-first, installable timeline spanning 4026 BCE through 100 CE. It includes
61 people, 18 events, seven historical periods, and six world powers derived
from the three cited source timelines.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. In Safari or Chrome, use the browser’s
“Add to Home Screen” or “Install app” action to install the PWA.

## Data and backups

- Changes are stored locally in IndexedDB.
- Use **Data → Export backup** to download a versioned
  `.bible-timeline.json` file.
- Imports can merge with or replace local data. A backup is downloaded before
  either operation.
- **Restore starter data** returns to the bundled source chronology after first
  exporting the current data.

Uploaded images are resized and stored locally. Source publication artwork is
not included or hotlinked.

## Standalone research data

The parsed BCE chronology from the public **Dates (Calendar)** source is kept
separate from the application's starter data:

- `data/jw-dates-calendar-bce.json`
- `data/jw-dates-calendar-bce.csv`

See [`data/README.md`](data/README.md) for its schema, source boundaries, and
regeneration command. This dataset is review material and is not loaded into
the timeline.

## Verification

```bash
npm test
npm run test:e2e
npm run build
```
