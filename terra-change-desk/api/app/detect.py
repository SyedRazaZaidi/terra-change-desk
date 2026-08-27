from __future__ import annotations

import base64

import cv2
import numpy as np


def load_bgr(path) -> np.ndarray:
    data = np.fromfile(str(path), dtype=np.uint8)
    frame = cv2.imdecode(data, cv2.IMREAD_COLOR)
    if frame is None:
        raise FileNotFoundError(path)
    return frame


def greenness(bgr: np.ndarray) -> float:
    b, g, r = cv2.split(bgr.astype(np.float32))
    return float(np.mean((g - r) / (g + r + 1e-3)))


def _classify_patch(before: np.ndarray, after: np.ndarray) -> str:
    mb = before.reshape(-1, 3).mean(axis=0)
    ma = after.reshape(-1, 3).mean(axis=0)
    d = ma - mb
    sat = float(ma.max() - ma.min())
    if d[0] > 14 and d[1] < 10:
        return "water"
    if sat < 30 and ma.mean() > 58:
        return "built"
    if d[1] < -8 or d[2] > 10:
        return "veg_loss"
    return "other"


def detect_change(
    before: np.ndarray,
    after: np.ndarray,
    threshold: int = 28,
) -> dict:
    if before.shape[:2] != after.shape[:2]:
        after = cv2.resize(after, (before.shape[1], before.shape[0]))
    b = cv2.GaussianBlur(before, (5, 5), 0)
    a = cv2.GaussianBlur(after, (5, 5), 0)
    diff = cv2.absdiff(b, a)
    gray = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
    gray = cv2.morphologyEx(gray, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    t = int(np.clip(threshold, 8, 80))
    _, mask = cv2.threshold(gray, t, 255, cv2.THRESH_BINARY)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    changed = float(np.count_nonzero(mask)) / float(mask.size)
    hist, _ = np.histogram(gray, bins=10, range=(0, 255))
    n, _labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    blob_rows: list[dict] = []
    composition = {"veg_loss": 0.0, "water": 0.0, "built": 0.0, "other": 0.0}
    min_area = 80
    for i in range(1, n):
        x, y, w, h, area = (int(v) for v in stats[i])
        if area < min_area:
            continue
        y1, x1 = min(before.shape[0], y + h), min(before.shape[1], x + w)
        kind = _classify_patch(before[y:y1, x:x1], after[y:y1, x:x1])
        blob_rows.append({"id": i, "x": x, "y": y, "w": w, "h": h, "area_px": area, "kind": kind})
        composition[kind] = composition.get(kind, 0.0) + area
    pixels = float(mask.size)
    composition = {k: round(v / pixels * 100.0, 2) for k, v in composition.items()}
    largest = max((row["area_px"] for row in blob_rows), default=0)
    heat = cv2.applyColorMap(gray, cv2.COLORMAP_INFERNO)
    overlay = after.copy()
    color = np.zeros_like(after)
    color[:, :] = (36, 72, 220)
    color_mask = cv2.bitwise_and(color, color, mask=mask)
    overlay = cv2.addWeighted(overlay, 0.62, color_mask, 0.55, 0)
    labeled = overlay.copy()
    tint = {"veg_loss": (40, 90, 220), "water": (200, 140, 40), "built": (180, 180, 180), "other": (90, 200, 220)}
    for row in blob_rows:
        c = tint.get(row["kind"], (90, 200, 220))
        cv2.rectangle(labeled, (row["x"], row["y"]), (row["x"] + row["w"], row["y"] + row["h"]), c, 2)
        cv2.putText(
            labeled,
            row["kind"].replace("_", " "),
            (row["x"], max(14, row["y"] - 4)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.42,
            c,
            1,
            cv2.LINE_AA,
        )
    g0, g1 = greenness(before), greenness(after)
    return {
        "change_pct": round(changed * 100, 2),
        "mask": mask,
        "overlay": overlay,
        "labeled": labeled,
        "heat": heat,
        "histogram": [int(v) for v in hist.tolist()],
        "blobs": len(blob_rows),
        "blob_boxes": blob_rows,
        "largest_px": int(largest),
        "threshold": t,
        "greenness_before": round(g0, 4),
        "greenness_after": round(g1, 4),
        "composition": composition,
    }


def briefing_text(name: str, kind: str, result: dict, area_km2: float) -> str:
    pct = result["change_pct"]
    loss = round(area_km2 * pct / 100.0, 1)
    comp = result["composition"]
    dominant = max(comp, key=comp.get) if comp else "other"
    story = {
        "deforest": "Look for brown roads and clearings that were canopy. Linear scars are logging, not autumn.",
        "flood": "Look for water that was not there — fields becoming lake.",
        "urban": "Look for hard rectangles: roofs and lots where vegetation used to be.",
        "haze": "Bright patches that come and go are usually cloud. Dismiss unless the ground itself moved.",
    }.get(kind, "Compare the two dates. Confirm only real land-cover change.")
    verdict = (
        "This is large enough to brief — confirm or dismiss with a reason."
        if pct >= 8
        else "Small signal. Treat as a watch, not a headline, until you confirm."
    )
    return (
        f"{name}: {pct:.1f}% of the frame moved ({loss} km² of {area_km2:.0f} km²). "
        f"{result['blobs']} patches. Dominant guess: {dominant.replace('_', ' ')}. "
        f"Greenness {result['greenness_before']:.2f} → {result['greenness_after']:.2f}. {story} {verdict}"
    )


def encode_jpeg_b64(frame: np.ndarray, quality: int = 82) -> str:
    if frame.ndim == 2:
        frame = cv2.cvtColor(frame, cv2.COLOR_GRAY2BGR)
    ok, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
    if not ok:
        return ""
    return base64.b64encode(buf.tobytes()).decode("ascii")
