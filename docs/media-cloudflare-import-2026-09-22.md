# Reviewed media imported for the Cloudflare build

On 2026-09-22 the VPS `china-bike-media` public mount was read through the
approved VPS wrapper at `/srv/china-bike-media/public/media/xhs/`. It contained
only the optimized derivatives listed below (plus one XDS manifest); no raw
captures were copied. The source SHA-256 values matched the existing image
records before each derivative was copied into the repository. The records keep
their original XHS source IDs, credit, removal route, exact-model mapping and
privacy review; only the hosting mode changed from the approved media origin to
the bounded `source-attributed-rehost` path required for Cloudflare Static
Assets.

| Model slug | Source record(s) | Card derivative | Detail derivative |
| --- | --- | --- | --- |
| `giant-defy-advanced-sl1` | `public-giant-defy-advanced-sl1-2026-08-17` | `1eb911d3bce988eed9bd8586159c03681ce5584ca2807f55291258b81a3c3b66` · 17,254 B · 480×330 | `f097dc5700684877f0be1c7451ac6883e1e3fd909970546cac9beffff0d01a51` · 39,348 B · 800×550 |
| `merida-scultura-endurance-4000` | `public-merida-scultura-endurance-4000-2026-08-17` | `9f27de40fa770110869e975117c988c6a9f24f1ffb02d2c7ba092f78ef2c327d` · 13,124 B · 480×320 | `e7eb1f97cf4e209754247206c23ab0f20a047a3336ea5de1d8557117b7aa4b7b` · 51,582 B · 1200×800 |
| `pardus-robin-evo` | `public-pardus-robin-evo-photo-2026-08-20` | `4f91ff6b0c4cc8f2022c2ece72c4b81d71ced12a8bdda2d352aeff7c8f43c4ee` · 26,520 B · 480×600 | `49e14f1b967f00717e91dd4803ab483f2081140841af9ba7581ba30065880e7a` · 49,742 B · 720×900 |
| `pardus-spark-rs` | `public-pardus-spark-rs-build-2026-08-17` | `263dd375a26693461a5ab924c5f44e032ab4f231e3c269a16dd3f76667a335d1` · 38,814 B · 480×389 | `a0ed3c4fdd93602c0b15a0a0f7db6754a06b18229361a3d2e696fdde5de7fc1d` · 84,380 B · 920×745 |
| `pardus-uragano-evo` | `public-pardus-uragano-evo-build-2026-08-17` | `7d366937bdaecca1f35ae5a101483856cc0f9093b1c1008fd73292aac2d5aaa1` · 25,258 B · 480×640 | `925778505e41933897591f1b7a82895a790b8b8badd05082e6a4840e523e3c88` · 70,694 B · 1080×1440 |
| `xds-gt600` | `public-xds-gt600-retailer-build-2026-08-27` | `448f7d812db3aaaed18b24fab9e49717c06d53476eca863dddf3caf02479e0d8` · 35,626 B · 480×652 | `b06bac58cbf42c48d15f56af9f35efc601ea0df0c4810a57b2c3c816b85ca941` · 84,702 B · 1080×1467 |

The remaining public derivatives stay on their existing reviewed hosting
routes. No newly discovered or third-party original image was imported for
this migration. The Cloudflare build’s `npm run image:report` is the required
post-import check; any source or media change must keep this bounded inventory
and the current `SPEC.md` media contract intact.
