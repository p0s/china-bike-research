#!/usr/bin/env python3
"""Convert existing reviewed WebP assets; prepare first, then verify/apply references."""
import argparse
import hashlib
import importlib.util
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STAGE = ROOT / ".research/avif-conversion"
spec = importlib.util.spec_from_file_location("avif_encoder", ROOT / "scripts/encode-avif.py")
encoder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(encoder)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def checked_paths(old, row):
    source = ROOT / old.lstrip("/")
    target = ROOT / row["path"].lstrip("/")
    staged = STAGE / row["staged"]
    for file, boundary in ((source, ROOT / "assets"), (target, ROOT / "assets"), (staged, STAGE)):
        if not file.resolve().is_relative_to(boundary.resolve()) or file.is_symlink():
            raise ValueError("unsafe conversion manifest path")
    if source.suffix != ".webp" or target.suffix != ".avif" or staged.suffix != ".avif":
        raise ValueError("unexpected conversion manifest format")
    return source, target, staged


def prepare():
    STAGE.mkdir(parents=True, exist_ok=True)
    manifest = STAGE / "manifest.json"
    rows = json.loads(manifest.read_text()) if manifest.exists() else {}
    sources = sorted((ROOT / "assets").rglob("*.webp"))
    for index, source in enumerate(sources):
        old = "/" + source.relative_to(ROOT).as_posix()
        if old in rows:
            row = rows[old]
            source, _, staged = checked_paths(old, row)
            if digest(source) != row["input_sha256"] or digest(staged) != row["sha256"]:
                raise ValueError("prepared image changed: " + old)
            continue
        source_bytes = source.stat().st_size
        quotation = bool(re.search(r"/sourced/(xhs|taobao|xianyu)/", old))
        sourced = "/sourced/" in old
        card = "-card-" in source.name
        cap = (40_000 if card else 88_000) if quotation else ((100_000 if card else 400_000) if sourced else None)
        try:
            payload, data = encoder.encode(source, max_bytes=min(source_bytes, cap or source_bytes), quality_minimum=50)
        except ValueError as error:
            if not str(error).startswith("cannot meet"):
                raise
            # Keep the quality floor rather than forcing every already-small file smaller.
            payload, data = encoder.encode(source, max_bytes=cap, quality_minimum=45)
        if sourced:
            name = re.sub(r"^[a-f0-9]{16}", data["sha256"][:16], source.stem) + ".avif"
        else:
            name = source.stem + "-" + data["sha256"][:10] + ".avif"
        target = source.with_name(name)
        staged = data["sha256"] + ".avif"
        (STAGE / staged).write_bytes(payload)
        rows[old] = {**data, "path": "/" + target.relative_to(ROOT).as_posix(), "staged": staged,
                     "input_bytes": source_bytes, "input_sha256": digest(source)}
        temporary = manifest.with_suffix(".tmp")
        temporary.write_text(json.dumps(rows, indent=2) + "\n")
        temporary.replace(manifest)
        if (index + 1) % 100 == 0:
            print(json.dumps({"converted": index + 1, "total": len(sources)}), flush=True)
    print(json.dumps({"files": len(rows), "before": sum(r["input_bytes"] for r in rows.values()),
                      "after": sum(r["bytes"] for r in rows.values()),
                      "larger_files": sum(r["bytes"] > r["input_bytes"] for r in rows.values())}), flush=True)


def apply():
    rows = json.loads((STAGE / "manifest.json").read_text())
    # Preflight the complete transaction before touching source or references.
    targets = set()
    for old, row in rows.items():
        source, target, staged = checked_paths(old, row)
        if digest(source) != row["input_sha256"] or digest(staged) != row["sha256"]:
            raise ValueError("input or prepared output changed: " + old)
        if target.exists() or target.resolve() in targets:
            raise ValueError("refusing to overwrite " + str(target.relative_to(ROOT)))
        targets.add(target.resolve())

    def lookup(value):
        if not isinstance(value, str):
            return None
        return rows.get(value if value.startswith('/') else '/' + value)

    def rewrite(value):
        if isinstance(value, list):
            return [rewrite(x) for x in value]
        if isinstance(value, str):
            match = lookup(value)
            return (match["path"] if value.startswith('/') else match["path"].lstrip('/')) if match else value
        if not isinstance(value, dict):
            return value
        matched = next((lookup(value[key]) for key in ("url", "path", "local_path") if lookup(value.get(key))), None)
        result = {key: (item if key in {"audit_corrections", "source"} else rewrite(item)) for key, item in value.items()}
        if matched:
            for key in ("bytes", "sha256", "width", "height", "quality", "format"):
                if key in result:
                    result[key] = matched[key]
            if result.get("type") == "image/webp":
                result["type"] = "image/avif"
            if "file" in result:
                result["file"] = Path(matched["path"]).name
        return result

    json_files = list((ROOT / "data/images").glob("*.json")) + list((ROOT / "data/groupsets").glob("*.json"))
    json_files += [ROOT / "content/blog-images.json", ROOT / "assets/branding/provenance.json"]
    updates = {}
    for path in json_files:
        before = json.loads(path.read_text())
        after = rewrite(before)
        if before != after:
            updates[path] = json.dumps(after, ensure_ascii=False, indent=2) + "\n"
    # Only active code/test references are rewritten; dated evidence stays immutable.
    pattern = re.compile("|".join(re.escape(p.lstrip("/")) for p in rows))
    by_relative = {old.lstrip("/"): row for old, row in rows.items()}
    for directory in ("src", "scripts", "tests"):
        for path in (ROOT / directory).rglob("*"):
            if path.suffix not in {".mjs", ".js", ".cjs", ".py"}:
                continue
            before = path.read_text()
            if path.name == "check-privacy.mjs":
                # The existing owner-approved hash allowlist keeps exact file identities.
                lines = before.splitlines(keepends=True)
                for i, line in enumerate(lines):
                    match = pattern.search(line)
                    if match:
                        row = by_relative[match.group()]
                        lines[i] = line.replace(match.group(), row["path"].lstrip("/")).replace(row["input_sha256"], row["sha256"])
                after = "".join(lines)
            else:
                after = pattern.sub(lambda m: by_relative[m.group()]["path"].lstrip("/"), before)
            if after != before:
                updates[path] = after
    for row in rows.values():
        (ROOT / row["path"].lstrip("/")).write_bytes((STAGE / row["staged"]).read_bytes())
    for path, text in updates.items():
        path.write_text(text)
    for old in rows:
        (ROOT / old.lstrip("/")).unlink()
    report = {"schema_version": 1, "converted_files": len(rows),
              "before_bytes": sum(r["input_bytes"] for r in rows.values()),
              "after_bytes": sum(r["bytes"] for r in rows.values()),
              "assets": [{"input_path": old, **{k: v for k, v in row.items() if k != "staged"}} for old, row in rows.items()]}
    (STAGE / "applied-report.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({k: v for k, v in report.items() if k != "assets"}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["prepare", "apply"])
    args = parser.parse_args()
    prepare() if args.action == "prepare" else apply()
