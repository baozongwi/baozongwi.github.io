#!/usr/bin/env python3
"""Batch convert Hugo TOML front matter (+++ ... +++) to YAML (--- ... ---).

Only modifies the front matter section at the very top of each file.
Body content (including code blocks with +++ or =) is left untouched.
Files already using YAML (starting with ---) are skipped.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT / "content" / "post"
ARCHETYPE_FILE = ROOT / "archetypes" / "default.md"


def convert_front_matter(content: str) -> str | None:
    """Convert TOML front matter to YAML. Returns None if no conversion needed."""
    if not content.startswith("+++\n"):
        return None

    # Find closing +++ on its own line
    closing_idx = content.find("\n+++\n", 4)
    if closing_idx == -1:
        return None

    # Extract sections
    fm_body = content[4:closing_idx + 1]  # front matter content (without delimiters)
    rest = content[closing_idx + 5:]       # everything after the closing delimiter

    # Convert key = value to key: value within front matter
    converted_lines = []
    for line in fm_body.split("\n"):
        # Match: key (optional spaces) = (at least one space) rest
        # e.g., "title= "value"" -> "title: "value""
        #        "title = "value"" -> "title: "value""
        converted = re.sub(r"^(\w[\w_-]*)\s*=\s+", r"\1: ", line)
        converted_lines.append(converted)

    return "---\n" + "\n".join(converted_lines) + "---" + rest


def process_file(filepath: Path, dry_run: bool = False) -> bool:
    """Process a single file. Returns True if modified."""
    try:
        original = filepath.read_text(encoding="utf-8")
    except Exception as e:
        print(f"  ERROR reading: {e}", file=sys.stderr)
        return False

    converted = convert_front_matter(original)
    if converted is None:
        return False

    if dry_run:
        print(f"  [DRY RUN] Would convert: {filepath}")
        return True

    try:
        filepath.write_text(converted, encoding="utf-8")
        return True
    except Exception as e:
        print(f"  ERROR writing: {e}", file=sys.stderr)
        return False


def main():
    dry_run = "--dry-run" in sys.argv

    targets = []

    # Archetype
    if ARCHETYPE_FILE.exists():
        targets.append(ARCHETYPE_FILE)

    # All content posts
    if CONTENT_DIR.exists():
        targets.extend(sorted(CONTENT_DIR.rglob("*.md")))

    total = 0
    converted = 0
    skipped_yaml = 0

    for fp in targets:
        total += 1
        content_start = fp.read_text(encoding="utf-8")[:10]

        if content_start.startswith("---"):
            skipped_yaml += 1
            print(f"  SKIP (already YAML): {fp.relative_to(ROOT)}")
            continue

        if not content_start.startswith("+++"):
            print(f"  SKIP (no front matter): {fp.relative_to(ROOT)}")
            continue

        if process_file(fp, dry_run=dry_run):
            converted += 1
            rel = fp.relative_to(ROOT)
            print(f"  CONVERTED: {rel}")

    mode = "[DRY RUN] " if dry_run else ""
    print(f"\n{mode}Summary: {total} found, {converted} converted, {skipped_yaml} already YAML, {total - converted - skipped_yaml} other")


if __name__ == "__main__":
    main()
