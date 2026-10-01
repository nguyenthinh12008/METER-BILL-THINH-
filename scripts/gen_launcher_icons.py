"""Sinh icon app (mipmap ic_launcher/ic_launcher_round) khớp màu splash
(nen xanh #1D4ED8 + tia set vang #FACC15, cung hinh dang voi drawable/splash_bolt.xml).
Chi dung cho build native, khong phai code app — chay 1 lan roi thoi.
"""
from PIL import Image, ImageDraw

BG = (29, 78, 216, 255)  # #1D4ED8
BOLT = (250, 204, 21, 255)  # #FACC15

# Cung toa do voi drawable/splash_bolt.xml (viewport 108x108)
BOLT_POINTS = [
    (60, 28), (40, 58), (52, 58), (47, 82), (69, 49), (57, 49),
]

DENSITIES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

OUT_ROOT = "android/app/src/main/res"


def bolt_polygon(size: int):
    scale = size / 108
    return [(x * scale, y * scale) for x, y in BOLT_POINTS]


def make_icon(size: int, round_shape: bool) -> Image.Image:
    supersample = 4
    big = size * supersample
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    if round_shape:
        draw.ellipse([0, 0, big, big], fill=BG)
    else:
        radius = int(big * 0.16)
        draw.rounded_rectangle([0, 0, big, big], radius=radius, fill=BG)

    poly = [(x * supersample, y * supersample) for x, y in bolt_polygon(size)]
    draw.polygon(poly, fill=BOLT)

    return img.resize((size, size), Image.LANCZOS)


def main():
    for folder, size in DENSITIES.items():
        square = make_icon(size, round_shape=False)
        round_ = make_icon(size, round_shape=True)
        square.save(f"{OUT_ROOT}/{folder}/ic_launcher.png")
        round_.save(f"{OUT_ROOT}/{folder}/ic_launcher_round.png")
        print(f"{folder}: {size}x{size} ok")


if __name__ == "__main__":
    main()
