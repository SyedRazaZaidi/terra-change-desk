from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter


def _noise(h: int, w: int, scale: float, seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    small = rng.random((max(8, h // 18), max(8, w // 18))).astype(np.float32)
    img = cv2.resize(small, (w, h), interpolation=cv2.INTER_CUBIC)
    return np.clip(img * scale, 0, 1)


def _forest_base(h: int, w: int, seed: int) -> Image.Image:
    n = _noise(h, w, 1.0, seed)
    n2 = _noise(h, w, 1.0, seed + 7)
    g = (48 + n * 90 + n2 * 40).astype(np.uint8)
    r = (18 + n * 35).astype(np.uint8)
    b = (22 + n2 * 28).astype(np.uint8)
    rgb = np.dstack([r, g, b])
    img = Image.fromarray(rgb, "RGB")
    draw = ImageDraw.Draw(img, "RGBA")
    rng = np.random.default_rng(seed + 3)
    # meandering river so the pair reads as a real AOI, not noise
    pts = []
    for i in range(9):
        pts.append((int(w * (0.08 + i * 0.1)), int(h * (0.18 + rng.random() * 0.55))))
    draw.line(pts, fill=(28, 62, 88, 180), width=7)
    return ImageEnhance.Contrast(img).enhance(1.18)


def _paint_scar(img: Image.Image, kind: str, seed: int) -> Image.Image:
    w, h = img.size
    rng = np.random.default_rng(seed)
    overlay = img.copy()
    draw = ImageDraw.Draw(overlay, "RGBA")
    if kind == "deforest":
        color = (92, 58, 28, 210)
        for _ in range(5):
            x0 = int(rng.integers(int(w * 0.28), int(w * 0.72)))
            y0 = int(rng.integers(int(h * 0.22), int(h * 0.7)))
            x1 = min(w - 4, x0 + int(rng.integers(90, 220)))
            y1 = min(h - 4, y0 + int(rng.integers(40, 130)))
            draw.polygon([(x0, y0), (x1, y0 + 12), (x1 - 20, y1), (x0 - 30, y1 - 8)], fill=color)
        for _ in range(3):
            y = int(rng.integers(int(h * 0.3), int(h * 0.75)))
            draw.line(
                [(int(w * 0.2), y), (int(w * 0.85), y + int(rng.integers(-20, 20)))],
                fill=(70, 48, 24, 180),
                width=3,
            )
    elif kind == "flood":
        color = (32, 72, 128, 200)
        draw.ellipse([int(w * 0.18), int(h * 0.35), int(w * 0.88), int(h * 0.92)], fill=color)
        draw.polygon(
            [
                (int(w * 0.1), int(h * 0.55)),
                (int(w * 0.95), int(h * 0.48)),
                (int(w * 0.9), int(h * 0.95)),
                (int(w * 0.08), int(h * 0.9)),
            ],
            fill=(40, 90, 150, 160),
        )
    elif kind == "haze":
        for _ in range(6):
            x0 = int(rng.integers(20, w - 180))
            y0 = int(rng.integers(10, h - 120))
            x1 = x0 + int(rng.integers(120, 260))
            y1 = y0 + int(rng.integers(50, 110))
            draw.ellipse([x0, y0, x1, y1], fill=(235, 238, 242, 150))
    else:
        color = (90, 92, 98, 220)
        for i in range(14):
            x = int(w * 0.42) + (i % 5) * 38
            y = int(h * 0.28) + (i // 5) * 48
            draw.rectangle([x, y, x + 28, y + 36], fill=color)
        draw.rectangle([int(w * 0.4), int(h * 0.55), int(w * 0.92), int(h * 0.88)], fill=(70, 72, 78, 190))
    blended = Image.alpha_composite(img.convert("RGBA"), overlay.convert("RGBA")).convert("RGB")
    return blended.filter(ImageFilter.GaussianBlur(radius=0.6))


def write_pair(out_dir: Path, slug: str, kind: str, seed: int, size: tuple[int, int] = (960, 540)) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    w, h = size
    before = _forest_base(h, w, seed)
    if kind == "flood":
        arr = np.array(before)
        arr[..., 2] = np.clip(arr[..., 2].astype(int) + 18, 0, 255).astype(np.uint8)
        before = Image.fromarray(arr)
    after = _paint_scar(before, kind, seed + 21)
    before.save(out_dir / f"{slug}_before.png", optimize=True)
    after.save(out_dir / f"{slug}_after.png", optimize=True)


def generate_all(tiles_dir: Path) -> None:
    write_pair(tiles_dir, "rio_tapajos", "deforest", 11)
    write_pair(tiles_dir, "sindh_basin", "flood", 29)
    write_pair(tiles_dir, "delta_fringe", "urban", 47)
    write_pair(tiles_dir, "cusco_haze", "haze", 63)
