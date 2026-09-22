# Blog photos and mascot

Real model images stay on their original manufacturer or retailer hosts. The photo mappings in [the manifest](../../content/blog-images.json) select existing catalog image/source records; captions name the model, credit the owner and explain any different build. The same photos appear in headers and within the relevant articles. Social previews use the real cover image.

The five local WebP files are the original China Bikes red panda mascot: a general mechanic plus pumping, measuring, assembling and packing poses. They were created with OpenAI's built-in image-generation tool on 2026-09-22. Final generation and edit prompts, source hashes, localized descriptions, dimensions, byte counts and derivative hashes are recorded in the manifest.

The mascot is a separate decorative image beside each unmodified product image. It never covers a bicycle or represents a specification. No third-party photo is downloaded or combined into a new bitmap. Public captions focus on the pictured bike and its source; generation provenance remains in the source manifest.

Mascot files are optimized with `cwebp -q 80 -resize 480 0 -metadata none`, preserving alpha. The privacy checker pins the approved file hashes. A failed mascot hides independently; a failed photo hides its visual area while preserving model/source links, captions and article content.
