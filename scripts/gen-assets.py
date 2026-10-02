#!/usr/bin/env python3
"""ツイッタラー世論調査 v2 — OGP画像・アイコン生成（PIL）

生成物:
  public/og.png        1200x630 OGPカード
  app/icon.png         512x512 ファビコン
  app/apple-icon.png   180x180 Apple touch icon

実行: python3 scripts/gen-assets.py
"""
import math
import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, "public")
APP = os.path.join(ROOT, "app")

FONT_CANDIDATES = [
    "/usr/share/fonts/noto-cjk/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/noto-cjk/NotoSansCJK-Medium.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJKjp-Bold.otf",
    "/usr/share/fonts/truetype/noto/NotoSansJP-Bold.otf",
]

INK = (11, 15, 22, 255)
PANEL2 = (26, 33, 48, 255)
TXT = (233, 237, 245, 255)
MUT = (139, 152, 173, 255)
XBLUE = (29, 155, 240, 255)
LIKE = (249, 24, 128, 255)
DISLIKE = (139, 92, 246, 255)


def get_font(size: int) -> ImageFont.FreeTypeFont:
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            for index in range(0, 5):
                try:
                    f = ImageFont.truetype(path, size, index=index)
                    # 日本語グリフが実在するか簡易チェック（豆腐回避）
                    try:
                        mask = f.getmask("好")
                        if mask.size[0] > 0 and mask.size[1] > 0:
                            return f
                    except Exception:
                        continue
                except Exception:
                    continue
    raise RuntimeError("日本語フォントが見つかりません。FONT_CANDIDATESを確認してください")


def heart_points(cx: float, cy: float, size: float):
    pts = []
    for i in range(0, 361, 3):
        a = math.radians(i)
        x = 16 * math.sin(a) ** 3
        y = 13 * math.cos(a) - 5 * math.cos(2 * a) - 2 * math.cos(3 * a) - math.cos(4 * a)
        pts.append((cx + x * size / 32.0, cy - y * size / 32.0))
    return pts


def radial_glow(img: Image.Image, cx: int, cy: int, radius: int, color, alpha: int = 110):
    glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(glow)
    steps = 28
    for i in range(steps, 0, -1):
        r = radius * i / steps
        a = int(alpha * max(0.0, 1 - i / steps) ** 1.6)
        if a <= 0:
            continue
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*color[:3], a))
    img.alpha_composite(glow)


def make_og():
    W, H = 1200, 630
    img = Image.new("RGBA", (W, H), INK)
    radial_glow(img, 1010, -60, 560, LIKE, 120)
    radial_glow(img, 140, 700, 580, DISLIKE, 120)
    d = ImageDraw.Draw(img)

    f_logo = get_font(46)
    f_title = get_font(64)
    f_sub = get_font(30)
    f_url = get_font(26)

    # ロゴ（ハート）＋サイト名
    d.polygon(heart_points(120, 130, 128), fill=LIKE)
    d.text((200, 104), "ツイッタラー世論調査", font=f_logo, fill=TXT)

    # タイトル
    d.text((80, 240), "あのツイッタラーのこと、", font=f_title, fill=TXT)
    d.text((80, 330), "好き？嫌い？", font=f_title, fill=LIKE)

    # サブタイトル
    d.text((82, 436), "X全体のツイッタラーを@IDで検索して誰でも追加、", font=f_sub, fill=MUT)
    d.text((82, 476), "好き嫌い投票・8項目評価・コメントが書き込める匿名サイト。", font=f_sub, fill=MUT)

    # 結果バー（装飾）
    bar_x, bar_y, bar_w, bar_h = 82, 540, 560, 18
    like_w = int(bar_w * 0.68)
    d.rounded_rectangle([bar_x, bar_y, bar_x + like_w, bar_y + bar_h], radius=9, fill=LIKE)
    d.rounded_rectangle(
        [bar_x + like_w + 6, bar_y, bar_x + bar_w, bar_y + bar_h], radius=9, fill=DISLIKE
    )

    # URL
    d.text((W - 80 - d.textlength("tsuittara-yoron.hikamers.app", font=f_url), 556),
           "tsuittara-yoron.hikamers.app", font=f_url, fill=XBLUE)

    img.convert("RGB").save(os.path.join(PUBLIC, "og.png"), "PNG")
    print("wrote public/og.png")


def gradient_square(size: int, c1, c2) -> Image.Image:
    img = Image.new("RGB", (size, size))
    for y in range(size):
        t = y / (size - 1)
        r = int(c1[0] + (c2[0] - c1[0]) * t)
        g = int(c1[1] + (c2[1] - c1[1]) * t)
        b = int(c1[2] + (c2[2] - c1[2]) * t)
        for x in range(size):
            img.putpixel((x, y), (r, g, b))
    return img


def make_icon(size: int, out_path: str):
    img = gradient_square(size, (249, 24, 128), (124, 58, 237)).convert("RGBA")
    d = ImageDraw.Draw(img)
    # 角丸マスク
    mask = Image.new("L", (size, size), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.22), fill=255)
    img.putalpha(mask)
    # 白ハート
    d.polygon(heart_points(size / 2, size * 0.44, size * 0.62), fill=(255, 255, 255, 255))
    img.save(out_path, "PNG")
    print(f"wrote {out_path}")


if __name__ == "__main__":
    os.makedirs(PUBLIC, exist_ok=True)
    make_og()
    make_icon(512, os.path.join(APP, "icon.png"))
    make_icon(180, os.path.join(APP, "apple-icon.png"))
    print("done")
