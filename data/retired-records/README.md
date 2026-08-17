# Retired catalog records

Catalog records are append-only by default. A protected record may disappear only when a JSON retirement record in this directory documents the decision.

Use one lowercase kebab-case file per retired record:

```json
{
  "id": "replace-old-image-2026-08-17",
  "record_type": "images",
  "record_id": "old-image-id",
  "action": "replace",
  "reason": "The earlier image identified a sibling configuration rather than the exact target.",
  "evidence_source_ids": ["exact-model-official-source"],
  "replacement": {
    "record_type": "images",
    "record_id": "exact-model-primary-image"
  },
  "reviewed_at": "2026-08-17"
}
```

`action` is `replace` when another active record supersedes the old one and `retire` only when no honest replacement exists. Evidence sources and replacements must remain active. A retirement does not permit an image target or active bike to lose its protected image or price coverage.
