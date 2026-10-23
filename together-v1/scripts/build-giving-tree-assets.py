"""Cut the generated Giving Tree artwork into transparent, anchored layers.

Source art is generated on a flat magenta backdrop. Each layer is keyed out,
colour-unmixed at the edges, and growth sheets are split into frames that share
one canvas size and a bottom-centre ground anchor so stages swap without jumping.

Usage: python3 scripts/build-giving-tree-assets.py <source-dir>
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else "/opt/cursor/artifacts/assets")
OUT = Path(__file__).resolve().parent.parent / "public" / "giving-tree"
OUT.mkdir(parents=True, exist_ok=True)


def key_out(path: Path, lo: float = 70.0, hi: float = 150.0) -> np.ndarray:
    rgb = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    h, w, _ = rgb.shape
    patches = [rgb[:12, :12], rgb[:12, -12:], rgb[-12:, :12], rgb[-12:, -12:]]
    bg = np.median(np.concatenate([p.reshape(-1, 3) for p in patches]), axis=0)
    dist = np.sqrt(((rgb - bg) ** 2).sum(axis=2))
    # Magenta-ness: red and blue both well above green marks background spill.
    spill = np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1]
    alpha = np.clip((dist - lo) / (hi - lo), 0, 1)
    alpha = np.where(spill > 120, np.minimum(alpha, 0.0), alpha)
    # Choke one pixel so the anti-aliased backdrop halo is dropped.
    choked = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)))
    alpha = np.asarray(Image.fromarray(choked).filter(ImageFilter.GaussianBlur(0.6))).astype(np.float32) / 255
    a = alpha[..., None]
    safe = np.maximum(a, 1e-3)
    color = np.clip((rgb - (1 - a) * bg) / safe, 0, 255)
    # Pull any remaining pink fringe toward neutral.
    fringe = (alpha < 0.95) & (color[..., 0] > color[..., 1]) & (color[..., 2] > color[..., 1])
    m = np.minimum(color[..., 0], color[..., 2])
    color[..., 0] = np.where(fringe, color[..., 0] - (m - color[..., 1]) * 0.6, color[..., 0])
    color[..., 2] = np.where(fringe, color[..., 2] - (m - color[..., 1]) * 0.8, color[..., 2])
    rgba = np.dstack([np.clip(color, 0, 255), alpha * 255]).astype(np.uint8)
    return rgba


def bbox(alpha: np.ndarray, thresh: int = 24):
    ys, xs = np.where(alpha > thresh)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def save(rgba: np.ndarray, name: str, max_w: int | None = None) -> None:
    img = Image.fromarray(rgba, "RGBA")
    if max_w and img.width > max_w:
        img = img.resize((max_w, round(img.height * max_w / img.width)), Image.LANCZOS)
    img.save(OUT / name, "WEBP", quality=90, method=6)
    print(name, img.size)


def single(src: str, name: str, pad: int = 6, max_w: int | None = None) -> None:
    rgba = key_out(SRC / src)
    x0, y0, x1, y1 = bbox(rgba[..., 3])
    h, w = rgba.shape[:2]
    rgba = rgba[max(0, y0 - pad):min(h, y1 + pad), max(0, x0 - pad):min(w, x1 + pad)]
    save(rgba, name, max_w)


def columns(alpha: np.ndarray, min_gap: int = 12):
    occupied = (alpha > 24).sum(axis=0) > 1
    spans, start, gap = [], None, 0
    for x, on in enumerate(occupied):
        if on:
            if start is None:
                start = x
            gap = 0
        elif start is not None:
            gap += 1
            if gap >= min_gap:
                spans.append((start, x - gap + 1))
                start, gap = None, 0
    if start is not None:
        spans.append((start, len(occupied)))
    return [s for s in spans if s[1] - s[0] > 8]


def sheet(src: str, prefix: str, expected: int, scale: float = 1.0, lo: float = 70.0, hi: float = 150.0) -> None:
    rgba = key_out(SRC / src, lo, hi)
    alpha = rgba[..., 3]
    spans = columns(alpha)
    if len(spans) != expected:
        raise SystemExit(f"{src}: expected {expected} sprites, found {len(spans)}: {spans}")
    boxes = []
    for x0, x1 in spans:
        ys = np.where((alpha[:, x0:x1] > 24).any(axis=1))[0]
        boxes.append((x0, ys.min(), x1, ys.max() + 1))
    top = min(b[1] for b in boxes)
    bottom = max(b[3] for b in boxes)
    width = max(b[2] - b[0] for b in boxes) + 16
    height = bottom - top + 8
    for i, (x0, y0, x1, y1) in enumerate(boxes):
        canvas = np.zeros((height, width, 4), dtype=np.uint8)
        piece = rgba[y0:y1, x0:x1]
        ox = (width - (x1 - x0)) // 2
        oy = (y0 - top) + 4
        canvas[oy:oy + piece.shape[0], ox:ox + piece.shape[1]] = piece
        img = Image.fromarray(canvas, "RGBA")
        if scale != 1.0:
            img = img.resize((round(width * scale), round(height * scale)), Image.LANCZOS)
        img.save(OUT / f"{prefix}-{i}.webp", "WEBP", quality=90, method=6)
        print(f"{prefix}-{i}.webp", img.size)


if __name__ == "__main__":
    bg = Image.open(SRC / "garden-bg.jpg").convert("RGB")
    bg.save(OUT / "garden-bg.webp", "WEBP", quality=88, method=6)
    print("garden-bg.webp", bg.size)
    single("soil-mound.jpg", "soil-mound.webp", max_w=900)
    single("gt-watering-can.jpg", "watering-can.webp", max_w=520)
    single("gt-scoop.jpg", "fertilizer-scoop.webp", max_w=420)
    single("gt-coin.jpg", "coin.webp", max_w=160)
    single("gt-sign.jpg", "sign.webp", max_w=420)
    sheet("plant-sheet.jpg", "plant", 5)
    sheet("tree-sheet.jpg", "tree", 6, scale=1.5, lo=34.0, hi=80.0)


def thumbnail() -> None:
    """Card thumbnail composed from the same layers the game uses."""
    bg = Image.open(OUT / "garden-bg.webp").convert("RGBA")
    w, h = bg.size
    tree = Image.open(OUT / "tree-5.webp")
    tree = tree.resize((int(w * 0.34), int(w * 0.34 * tree.height / tree.width)), Image.LANCZOS)
    bg.alpha_composite(tree, (int(w * 0.6 - tree.width / 2), int(h * 0.62 - tree.height)))
    mound = Image.open(OUT / "soil-mound.webp")
    mound = mound.resize((int(w * 0.42), int(w * 0.42 * mound.height / mound.width)), Image.LANCZOS)
    bg.alpha_composite(mound, (int(w * 0.24 - mound.width / 2), int(h * 1.03 - mound.height)))
    plant = Image.open(OUT / "plant-4.webp")
    plant = plant.resize((int(w * 0.27), int(w * 0.27 * plant.height / plant.width)), Image.LANCZOS)
    bg.alpha_composite(plant, (int(w * 0.24 - plant.width / 2), int(h * 0.86 - plant.height)))
    bg.convert("RGB").resize((960, 540), Image.LANCZOS).save(OUT / "thumb.webp", "WEBP", quality=86, method=6)
    print("thumb.webp")


if __name__ == "__main__":
    thumbnail()
