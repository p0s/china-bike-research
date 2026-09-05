"""Capture public caption tracks into the ignored video corpus.

Run through the repository's isolated Browser Use wrapper. The script reads
only public page state and a caption URL already exposed by the player. It does
not download media, retain cookies or comments, cross a challenge, or retry a
Bilibili block. Normalization and matching remain separate offline steps.
"""

import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path


project_root = Path(os.environ.get("VIDEO_PROJECT_ROOT", os.getcwd())).resolve()
manifest_path = Path(os.environ.get("VIDEO_CAPTURE_MANIFEST", project_root / "scripts/video-pilot-manifest.json")).resolve()
corpus_root = Path(os.environ.get("VIDEO_CORPUS_ROOT", project_root / ".research" / "video-corpus")).resolve()
accessed_at = datetime.now(timezone.utc).date().isoformat()
retrieved_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def write_record(spec, state, status, caption_source="none", caption=None, note=""):
    platform = spec["platform"]
    video_id = spec["video_id"]
    channel = spec.get("channel_id", "unknown")
    title = (state.get("title") if isinstance(state, dict) else None) or spec.get("title") or video_id
    directory = corpus_root / platform / channel / video_id
    if directory.exists():
        raise FileExistsError("Existing capture is immutable; use a fresh VIDEO_CORPUS_ROOT for another run.")
    directory.mkdir(parents=True, exist_ok=True)
    record = {
        "platform": platform,
        "video_id": video_id,
        "url": spec["url"],
        "channel_id": channel,
        "title": title,
        "published_at": spec.get("published_at"),
        "accessed_at": accessed_at,
        "language": (state.get("language") if isinstance(state, dict) else None) or ("zh" if platform == "bilibili" else "en"),
        "caption_source": caption_source,
        "caption_kind": (state.get("kind") if isinstance(state, dict) else None) or "none",
        "status": status,
        "retrieved_at": retrieved_at,
        "caption_ui_status": state.get("caption_control") if isinstance(state, dict) else None,
        "note": note or "Public caption capture; automatic captions require exact-model verification.",
    }
    if spec.get("discovery_mentions"):
        record["discovery_mentions"] = spec["discovery_mentions"]
    (directory / "metadata.json").write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if caption:
        (directory / "captions-original.vtt").write_text(caption if caption.endswith("\n") else caption + "\n", encoding="utf-8")
    return {"id": video_id, "platform": platform, "status": status, "caption_source": caption_source, "caption_chars": len(caption or "")}


manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
for spec in manifest:
    if spec.get("platform") not in ("youtube", "bilibili") or not all(
        re.fullmatch(r"[A-Za-z0-9_-]+", str(spec.get(key, "")))
        for key in ("channel_id", "video_id")
    ):
        raise ValueError("Invalid capture path identity")
new_tab("about:blank")
results = []
for spec in manifest:
    if (corpus_root / spec["platform"] / spec.get("channel_id", "unknown") / spec["video_id"]).exists():
        raise FileExistsError("Use a fresh VIDEO_CORPUS_ROOT; existing captures must not be overwritten.")
    try:
        goto_url(spec["url"])
        if spec["platform"] == "youtube":
            wait_for_load()
            state = js("""(() => {
              const p=window.ytInitialPlayerResponse||{}; const vd=p.videoDetails||{};
              const tracks=p?.captions?.playerCaptionsTracklistRenderer?.captionTracks||[];
              const t=tracks.find(x=>x.languageCode==='en') || tracks[0] || null;
              return {title:document.title.replace(/\\s+- YouTube$/, ''), channelId:vd.channelId||null,
                videoId:vd.videoId||null, pageVideoId:new URL(location.href).searchParams.get('v'),
                language:t?.languageCode||null, kind:t?.kind||'standard', baseUrl:t?.baseUrl||null,
                caption_control:[...document.querySelectorAll('button')].map(x=>x.getAttribute('aria-label')||'').find(x=>/caption|subtitle/i.test(x))||null};
            })()""")
            if isinstance(state, str):
                state = json.loads(state)
            if (state.get("videoId") != spec["video_id"] or state.get("pageVideoId") != spec["video_id"]
                    or state.get("channelId") != spec.get("channel_id")):
                results.append(write_record(spec, {}, "failed", "none", None, "Player video/channel identity did not match the requested source; no captions fetched."))
                continue
            unavailable = "unavailable" in (state.get("caption_control") or "").lower()
            caption = None
            if state.get("baseUrl") and not unavailable:
                suffix = "&fmt=vtt" if "fmt=" not in state["baseUrl"] else ""
                caption = js(f"fetch({json.dumps(state['baseUrl'] + suffix)}).then(async r => r.ok ? r.text() : '')")
                if not isinstance(caption, str) or not caption.lstrip().startswith("WEBVTT"):
                    caption = None
            source = "automatic" if caption and state.get("kind") == "asr" else ("creator" if caption else "none")
            note = ("Public caption body captured from the identity-checked player; automatic captions require verification."
                    if caption else "Player reported captions unavailable; no transcript captured."
                    if unavailable else "No usable public caption body was returned.")
            results.append(write_record(spec, state, "captured" if caption else "no-captions", source, caption, note))
        else:
            state = js("""(() => ({title:document.title, body:(document.body?.innerText||'').slice(0,900)}))()""")
            if isinstance(state, str):
                state = json.loads(state)
            body = state.get("body") or ""
            blocked = "412" in body or "security" in body.lower() or "风控" in body
            note = "Direct Bilibili page was blocked before subtitle state was observable; no retry or bypass attempted." if blocked else "Subtitle state was not exposed by the public page."
            results.append(write_record(spec, state, "blocked" if blocked else "no-captions", "unknown", None, note))
            if blocked:
                break
    except Exception:
        results.append(write_record(spec, {}, "failed", "unknown", None, "Browser interaction failed; no error details or page data retained."))
        if spec["platform"] == "bilibili":
            break

print(json.dumps(results, ensure_ascii=False))
