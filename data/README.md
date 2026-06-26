# Standalone chronology data

This directory contains research datasets that are deliberately separate from
the application's bundled starter timeline.

## JW Dates (Calendar), BCE

- `jw-dates-calendar-bce.json` is the lossless normalized review dataset.
- `jw-dates-calendar-bce.csv` is the same data flattened for spreadsheet
  review and editing.
- These files remain the review source rather than editable application data.

The extractor reads paragraphs 69–498 of the BCE section of
[Dates (Calendar)](https://wol.jw.org/en/wol/d/r1/lp-e/1200271562#h=68).
It distinguishes rows that introduce a date from continuation rows that inherit
the preceding date.

Supported source notation:

| Source | Normalized qualifier |
| --- | --- |
| `1943` | exact |
| `c. 1900` | approximate |
| `a. 874` | after |
| `b. 607` | before |
| `586 or 587` | alternative dates |
| `c. 1774–c. 1767` | independently qualified range |

Regenerate from the public page:

```bash
npm run data:extract:jw-dates
```

For a deterministic regeneration from a saved page:

```bash
npm run data:extract:jw-dates -- --html data/source-cache/dates-calendar.html
```

`data/source-cache` is ignored by Git. The generated files retain source
paragraph links, Scripture references, publication-reference labels, category
suggestions, and the original date notation. Their descriptions remain review
material.

## Application compilation

`expanded-chronology-manifest.json` contains reviewed semantic deduplication
mappings and short-title overrides. Compile the immutable application bundle:

```bash
npm run data:compile:chronology
```

The compiler:

- resolves every source paragraph to one new event or one enrichment;
- rejects unresolved duplicate candidates;
- enforces unique titles of no more than 48 characters at each date;
- writes `src/data/expanded-chronology.json`; and
- writes `expanded-chronology-report.json` for auditing.
