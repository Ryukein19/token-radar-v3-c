#!/usr/bin/env python3
"""Re-render the three Token Radar v3-c screenshots from the real dashboard.

Usage: python3 shoot.py <out-dir> <shots-dir>
  out-dir   : the main.ts output dir (has dashboard/ + data.js)
  shots-dir : where the three JPGs go (1-board.jpg, 2-detail.jpg, 3-filtered.jpg)

Uses the cached Playwright chromium-headless-shell + --screenshot, then PIL
to JPEG. Target: 1440x900, 300-350 KB each.
"""
import os
import subprocess
import sys
from PIL import Image

SHELL = os.path.expanduser(
    "~/.cache/ms-playwright/chromium_headless_shell-1255/"
    "chrome-headless-shell-linux64/chrome-headless-shell")
W, H = 1440, 900

VIEWS = [
    ("1-board.jpg", "index.html", "board (cover)"),
    ("2-detail.jpg", "index.html#detail=steakhouse-financial", "detail (Steakhouse)"),
    ("3-filtered.jpg", "index.html#tier=Watchlist", "filtered (Watchlist)"),
]


def shoot(url, png_path):
    cmd = [SHELL, "--headless", "--disable-gpu", "--no-sandbox",
           f"--window-size={W},{H}", "--hide-scrollbars",
           "--virtual-time-budget=8000", f"--screenshot={png_path}", url]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if r.returncode != 0 or not os.path.exists(png_path):
        raise RuntimeError(f"screenshot failed for {url}: {r.stderr[-500:]}")


def to_jpeg(png_path, jpg_path, quality=95, subsampling=2):
    im = Image.open(png_path).convert("RGB")
    im.save(jpg_path, "JPEG", quality=quality, subsampling=subsampling, optimize=True)
    return os.path.getsize(jpg_path)


def main():
    out_dir, shots_dir = sys.argv[1], sys.argv[2]
    os.makedirs(shots_dir, exist_ok=True)
    dash = os.path.abspath(os.path.join(out_dir, "dashboard"))
    for name, frag, label in VIEWS:
        url = f"file://{dash}/{frag}"
        png = os.path.join(shots_dir, name.replace(".jpg", ".png"))
        jpg = os.path.join(shots_dir, name)
        shoot(url, png)
        # Tune quality to land in 300-350 KB (dark flat UI compresses well;
        # q95 4:2:0 is the working point from the real PNG). Pick the first
        # candidate in range; else the largest that stays under the cap.
        best = None
        for q, sub in [(95, 2), (97, 2), (92, 2), (90, 0), (90, 2), (85, 2)]:
            size = to_jpeg(png, jpg, quality=q, subsampling=sub)
            if size <= 350_000 and (best is None or size > best[0]):
                best = (size, q, sub)
            if 300_000 <= size <= 350_000:
                break
        if best is None:  # every candidate over the cap (not seen on this page)
            size = to_jpeg(png, jpg, quality=75, subsampling=2)
        else:
            size = best[0]
            if size != os.path.getsize(jpg):
                to_jpeg(png, jpg, quality=best[1], subsampling=best[2])
        os.remove(png)
        im = Image.open(jpg)
        print(f"{name}: {label}: {im.size[0]}x{im.size[1]}, {size} bytes, q used")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
