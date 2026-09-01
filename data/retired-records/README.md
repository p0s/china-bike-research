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

When exact evidence disproves one protected field or relationship on an otherwise active record, retire only that protected item:

```json
{
  "id": "retire-wrong-platform-source-2026-09-01",
  "record_type": "platforms",
  "record_id": "exact-platform-id",
  "action": "retire",
  "reason": "Exact-generation evidence proves the earlier source relationship belonged to a sibling generation.",
  "evidence_source_ids": ["exact-generation-source"],
  "protected_item": {
    "kind": "relationship",
    "value": "source_ids=wrong-sibling-source"
  },
  "reviewed_at": "2026-09-01"
}
```

`protected_item.kind` is `field` or `relationship`, and `value` must exactly match the protected coverage entry. The parent record must remain active and the retired item must be absent. This exception documents corrections; it cannot erase a whole record or weaken image and price target guarantees.
