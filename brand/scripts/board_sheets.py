"""Contact sheets of the board (brand/board/img) for reading every block by eye: 12 per sheet, id under each."""
import pathlib
from PIL import Image, ImageDraw, ImageSequence
B = pathlib.Path(__file__).resolve().parents[1] / "board"
files = sorted((B / "img").iterdir(), key=lambda p: list((B / "keys.txt").read_text().split()).index(p.name.split("_")[0]))
T, C = 380, 4
for s in range(0, len(files), 12):
    chunk = files[s:s + 12]
    S = Image.new("RGB", (T * C, (T + 24) * ((len(chunk) + C - 1) // C)), (255, 255, 255))
    d = ImageDraw.Draw(S)
    for i, f in enumerate(chunk):
        im = Image.open(f)
        if getattr(im, "is_animated", False): im = next(ImageSequence.Iterator(im))
        im = im.convert("RGB"); im.thumbnail((T - 8, T - 8))
        x, y = (i % C) * T, (i // C) * (T + 24)
        S.paste(im, (x + (T - im.width) // 2, y + (T - im.height) // 2))
        d.text((x + 6, y + T + 4), f.name.split("_")[0], fill=(0, 0, 0))
    S.save(B / "sheets" / f"sheet_{s // 12 + 1}.jpg", quality=85)
print(len(files), "images ->", (len(files) + 11) // 12, "sheets")
