"""Regenerate web/icon.png — clock face overlaid on dandelion, masked to flower silhouette.

Mirrors the koralle (light) theme of the app's Clock component:
  enamel #fffaf0, semi-transparent so the dandelion shows through
  bezel / numerals / ticks / hour hand: ink #5b2a1c
  minute hand: accent #e85a3c
  hand shape: the same Spitz pointer as drawSpitz() in web/index.html

Run from the repo root:

    pip3 install Pillow
    python3 tools/build_icon.py

Tweak knobs at the top of the file — R for size, ENAMEL alpha for transparency.
The script supersamples 4× then downsamples for clean edges, and uses the
dandelion's alpha channel as the final mask so the icon's silhouette is the
flower's irregular petal edge.
"""
from PIL import Image, ImageDraw, ImageFont
import math
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.path.join(ROOT, 'web', 'dandelion_single.png')
OUT  = os.path.join(ROOT, 'web', 'icon.png')
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'

# ── tunable knobs ────────────────────────────────────────────
ENAMEL   = (255, 250, 240, 74)    # white face — alpha controls how transparent
INK      = (91,  42,  28,  255)   # bezel, numerals, ticks, hour hand
ACCENT   = (232, 90,  60,  255)   # minute hand
TICKMINOR= (91,  42,  28,  102)
PIVOT    = (91,  42,  28,  255)
CAP_HI   = (255, 250, 240, 230)

W = H = 512
S = 4                             # supersample factor
WS, HS = W * S, H * S
CX, CY = WS / 2, HS / 2
R = 141 * S                       # clock radius — bump to grow, drop to shrink
SIZE = 2 * R                      # what the app's Clock component calls `size`

# ratios pulled directly from web/index.html Clock()
NUM_SIZE = round(SIZE * 0.075)
TICK_TOP = round(SIZE * 0.035)
MAJOR_T  = max(2 * S, round(SIZE * 0.013))
MINOR_T  = max(1 * S, round(SIZE * 0.006))
MAJOR_L  = round(SIZE * 0.06)
MINOR_L  = round(SIZE * 0.028)
HOUR_LEN = round(SIZE * 0.32)
MIN_LEN  = round(SIZE * 0.40)
HOUR_W   = max(5 * S, round(SIZE * 0.028))
MIN_W    = max(3 * S, round(SIZE * 0.018))
PIVOT_R  = round(SIZE * 0.0225)
BEZEL_W  = max(2, round(2 * S))

clock = Image.new('RGBA', (WS, HS), (0, 0, 0, 0))
d = ImageDraw.Draw(clock, 'RGBA')

d.ellipse((CX - R, CY - R, CX + R, CY + R), fill=ENAMEL)
d.ellipse((CX - R, CY - R, CX + R, CY + R), outline=INK, width=BEZEL_W)

# 60 ticks, major every 5
for i in range(60):
    major = (i % 5 == 0)
    rot = math.radians(i * 6 - 90)
    length = MAJOR_L if major else MINOR_L
    thick  = MAJOR_T if major else MINOR_T
    color  = INK if major else TICKMINOR
    outer_r = R - TICK_TOP
    inner_r = outer_r - length
    ux, uy = CX + outer_r * math.cos(rot), CY + outer_r * math.sin(rot)
    ix, iy = CX + inner_r * math.cos(rot), CY + inner_r * math.sin(rot)
    px, py = -math.sin(rot), math.cos(rot)
    half = thick / 2
    d.polygon([
        (ix + px * half, iy + py * half),
        (ux + px * half, uy + py * half),
        (ux - px * half, uy - py * half),
        (ix - px * half, iy - py * half),
    ], fill=color)

font = ImageFont.truetype(FONT, NUM_SIZE)
num_r = (R - TICK_TOP - MAJOR_L) - NUM_SIZE * 0.85
for i in range(1, 13):
    rot = math.radians(i * 30 - 90)
    nx = CX + num_r * math.cos(rot)
    ny = CY + num_r * math.sin(rot)
    d.text((nx, ny), str(i), font=font, fill=INK, anchor='mm')

# Spitz tapered pointer — same path as drawSpitz(w, L) in index.html:
#   M -b/2 0  L b/2 0  L w*0.28 -L*0.88  Q 0 -L  -w*0.28 -L*0.88  Z
def spitz_polygon(w, L, n_curve=18):
    b = w * 1.15
    pts = [(-b/2, 0), (b/2, 0), (w * 0.28, -L * 0.88)]
    p0, pc, p2 = (w * 0.28, -L * 0.88), (0, -L), (-w * 0.28, -L * 0.88)
    for k in range(1, n_curve):
        t = k / n_curve; u = 1 - t
        pts.append((u*u*p0[0] + 2*u*t*pc[0] + t*t*p2[0],
                    u*u*p0[1] + 2*u*t*pc[1] + t*t*p2[1]))
    pts.append(p2)
    return pts

def draw_hand(angle_deg, w, L, color):
    a = math.radians(angle_deg); cos, sin = math.cos(a), math.sin(a)
    d.polygon(
        [(CX + x*cos - y*sin, CY + x*sin + y*cos) for (x, y) in spitz_polygon(w, L)],
        fill=color,
    )

# 10:10 showcase pose
draw_hand(300, HOUR_W, HOUR_LEN, INK)
draw_hand(60,  MIN_W,  MIN_LEN,  ACCENT)

# Pivot cap with a tiny highlight
d.ellipse((CX - PIVOT_R, CY - PIVOT_R, CX + PIVOT_R, CY + PIVOT_R), fill=PIVOT)
hi_r, hi_off = PIVOT_R * 0.45, PIVOT_R * 0.3
d.ellipse((CX - hi_off - hi_r, CY - hi_off - hi_r,
           CX - hi_off + hi_r, CY - hi_off + hi_r), fill=CAP_HI)

clock_small = clock.resize((W, H), Image.LANCZOS)
dandelion = Image.open(SRC).convert('RGBA')
combined = Image.alpha_composite(dandelion, clock_small)

# Final alpha = dandelion alpha → clock is cropped to the flower silhouette.
r, g, b, _ = combined.split()
_, _, _, da = dandelion.split()
Image.merge('RGBA', (r, g, b, da)).save(OUT, optimize=True)

print(f'wrote {OUT}')
