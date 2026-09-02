#!/usr/bin/env python3
"""Static reference validator for Dora Fares Al Shamal frontend.

Checks every *.html file for broken local references (scripts, styles,
images, links) and inline <script> blocks. Does NOT require a server.

Usage:
    python tests/validate-refs.py
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HTML = sorted(ROOT.glob("*.html"))
IGNORED_LINK_PREFIXES = (
    "http://", "https://", "//", "data:", "#", "mailto:", "tel:",
    "javascript:",
)


def strip_fragment_query(url: str) -> str:
    return url.split("?")[0].split("#")[0]


def collect_refs(html_text: str, attr: str):
    pattern = re.compile(rf"{attr}\s*=\s*['\"]([^'\"]+)['\"]", re.IGNORECASE)
    return pattern.findall(html_text)


def main():
    errors = []
    inline_script_pages = []

    for page in HTML:
        text = page.read_text(encoding="utf-8", errors="ignore")

        # Detect inline <script> blocks (non src)
        if re.search(
            r'<script\s*(?![^>]*src=)(?![^>]*type\s*=\s*["\']application/ld\+json["\'])[^>]*>',
            text,
            re.IGNORECASE,
        ):
            inline_script_pages.append(page.name)

        # Scripts
        for src in collect_refs(text, "src"):
            if src.startswith(IGNORED_LINK_PREFIXES):
                continue
            clean = strip_fragment_query(src)
            if clean and not (ROOT / clean).exists():
                errors.append(f"{page.name}: missing script '{src}'")

        # Stylesheets / links
        for href in collect_refs(text, "href"):
            if href.startswith(IGNORED_LINK_PREFIXES):
                continue
            clean = strip_fragment_query(href)
            if not clean:
                continue
            target = ROOT / clean
            if not target.exists():
                # Anchor-only links to existing pages are OK
                if clean.endswith(".html") and not target.exists():
                    errors.append(f"{page.name}: missing link '{href}'")
                elif not clean.endswith(".html") and not target.exists():
                    errors.append(f"{page.name}: missing asset '{href}'")

    print(f"Checked {len(HTML)} HTML pages.")

    if inline_script_pages:
        print("\n⚠️  Pages with inline <script> blocks:")
        for p in inline_script_pages:
            print(f"  - {p}")
    else:
        print("\n✅ No inline <script> blocks found.")

    if errors:
        print(f"\n❌ {len(errors)} broken reference(s) found:")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)
    else:
        print("\n✅ No broken local references found.")
        sys.exit(0)


if __name__ == "__main__":
    main()
