# Analytics setup batch, 2026-10-04

The requested outcome is HTTPS-only public delivery, a fresh Search Console
sitemap submission, and useful bounded action context in GA4 and Umami.
The existing consent and advertising policy stays in force. The user subsequently
declined DPA contact setup; no terms or contact records are changed.

1. Enforce permanent HTTP-to-HTTPS redirects before content and analytics.
2. Resubmit the existing canonical sitemap once and read back Google's receipt.
3. Validate action context against built public catalog/source records. Record
   comparison size, interface language, public page path, and, for product links,
   exact catalog model, brand, destination hostname and source type.
4. Extend only the China Bikes contract in the existing private Umami gateway;
   retain the other sites' frozen payloads and the existing consent exclusions.
5. Run focused checks and each repository's final gate, deliver signed source,
   deploy the existing collectors/site, register GA event dimensions, and verify
   live redirects and delivery. Distinguish HTTP receipt from provider processing.

Done means live HTTPS redirects cover documents and assets; Google has accepted
the sitemap submission; both collectors receive validated public action context;
and consent, DNT/GPC, opt-out and ads-denied behavior still pass. Raw queries,
fragments, search text, selected model lists and arbitrary properties are excluded.

## Verified before source delivery

- Cloudflare Always Use HTTPS is enabled and remains enabled after a reload.
  HTTP requests to the catalog, a German model path with a query, a static asset
  and the sitemap return 301 to the equivalent HTTPS URL without cookies.
- Search Console accepted one resubmission of the existing canonical sitemap
  and shows an October 4 submission date. Fetch/indexing reports can still lag.
- GA saved six event dimensions and the standard `comparison_count` metric.
- The site gate passed: 476 tests, 885 generated pages and the SEO checks.
  The gateway gate passed; its deployed source hash matches signed source,
  and the recreated gateway is healthy with zero restarts.
- The site's new producer fields still need production deployment and receiver
  readback. Source validation and provider HTTP receipts are separate proof.
