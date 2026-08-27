# Taobao listing evidence capture

Taobao search and category pages show the lowest price among any option in a listing. Treat that number only as a `listing_minimum_teaser`; it is not a price for a bike, frameset, groupset, or other specific package.

## Exact-price capture

Open one exact listing and select every option that changes the product or package. A publishable observation must preserve:

- canonical listing URL and listing ID;
- seller and listing title;
- every selected option label, in display order;
- selected SKU or option IDs when the page exposes them;
- the displayed price after all options are selected;
- normalized package contents and explicit omissions;
- condition, retail packaging, warranty, invoice, and shipping basis when shown;
- observation date and China time;
- a screenshot or exported page image showing the selected options and price.

If any selected option or package boundary is missing, keep the record as research evidence instead of publishing one product price. Do not infer an exact price from the listing overview, crossed-out price, coupon, installment amount, deposit, accessory option, or another SKU in the same listing.

## Specification-image capture

Prefer the original listing image bytes over screenshots. Save geometry charts, size tables, clearance diagrams, weight charts, aero/profile diagrams, package lists, and compatibility images when they support a useful atomic claim.

Keep an immutable manifest row for every file:

```json
{
  "listing_id": "exact Taobao listing ID",
  "canonical_url": "sanitized public listing URL",
  "seller_option_text": ["all", "selected", "labels"],
  "displayed_price_cny": 0,
  "observed_at": "YYYY-MM-DD",
  "filename": "original-file-name.ext",
  "mime_type": "image/jpeg",
  "width_px": 0,
  "height_px": 0,
  "bytes": 0,
  "sha256": "lowercase hex digest",
  "image_purpose": "geometry | size-chart | tire-clearance | weight | aero-profile | package | compatibility"
}
```

Do not transcode or overwrite the original. Derived crops and OCR may be stored separately and must point back to the original file hash. Remove account identifiers, order history, delivery addresses, chat messages, and other private state before archiving.

## Import boundary

An acquisition ZIP is evidence, not automatically publishable data. Validate archive bytes and hashes first, then map each supported claim to the exact model, generation, selected package, source, and observation date. Keep contradictory sources side by side; resolve the displayed value according to source exactness and recency without deleting older observations.

Process at most 10 exact models or 25 atomic gaps in one import batch. Stop after three distinct routes fail to resolve one purchase-relevant claim and move to the next gap.

An original Taobao listing image may be shown on the public site when its record identifies the exact listing and model, preserves the public source URL, seller or owner credit, observation date, descriptive alt text, and a failure fallback, and passes the privacy review. The visible image credit must link to the source. Attribution records provenance; it does not assert that the project owns the image or that the source granted a general redistribution license.
