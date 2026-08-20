# China Bike Research media origin

This directory defines the isolated static media service deployed at
`china-bike-media.161-97-123-19.sslip.io` on the project's Contabo VPS.

Only the health response is tracked here. Optimized third-party media is added to a
temporary deployment copy under `public/media/xhs/`; it is intentionally ignored by
Git and must never enter repository history.

The container runs read-only as an unprivileged user, drops every Linux capability,
disables access logs, exposes only immutable WebP paths, and uses the existing
Coolify/Traefik network for HTTPS. It is separate from the JSON-only XHS snapshot
service.
