"""One board per idea: its three IdeaStills looks side by side, labelled, for the client to pick one look per idea.

Reads brand/edits/exomind-skin/stills/idea<N>_look<A|B|C>.png (rendered by brand/remotion/scripts/idea_stills.sh) and writes
brand/edits/exomind-skin/stills/board_idea<N>.png. Both are gitignored (BTL, Flora and practice imagery); BOARD.md is the committed text.
Usage: python brand/scripts/idea_boards.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

STILLS = Path(__file__).resolve().parents[1] / "edits" / "exomind-skin" / "stills"
TITLES = {
    1: "Idea 1  Stress to skin",
    2: "Idea 2  The coil to the prefrontal cortex",
    3: "Idea 3  Neuroplasticity",
    4: "Idea 4  Total skin health",
    5: "Idea 5  The visit and her sessions",
    6: "Idea 6  Classic treatments vs beyond",
}
LOOKS = {
    1: ["A  Flat chain on the room canvas", "B  Trace on the condition image (Flora)", "C  Full-bleed type on navy"],
    2: ["A  Path traced on the Flora glass head", "B  Pulse on a real BTL frame", "C  Type-led, punched-in window"],
    3: ["A  Junctions ringed on neuro_anim", "B  Before / after windows + bars", "C  Document crop + highlighter"],
    4: ["A  Karaoke line on the room canvas", "B  Beside his own shot", "C  Stacked words on navy"],
    5: ["A  Table, rows wiped as named", "B  Session timeline (Oct 30, Nov 05)", "C  Steps typed on session footage"],
    6: ["A  Two-column ledger", "B  Split: classic | the mind (Flora)", "C  Cited bars (Dalgard 2015)"],
}
W, H, GAP, PAD, HEAD, LAB = 960, 540, 24, 40, 90, 64


def font(px: int) -> ImageFont.FreeTypeFont:
    for name in ("arial.ttf", "Arial.ttf", "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(name, px)
        except OSError:
            continue
    return ImageFont.load_default()


def main() -> None:
    for n, title in TITLES.items():
        board = Image.new("RGB", (PAD * 2 + 3 * W + 2 * GAP, PAD + HEAD + H + LAB + PAD), "#f4f6f8")
        d = ImageDraw.Draw(board)
        d.text((PAD, PAD), title, fill="#202532", font=font(44))
        for k, look in enumerate("ABC"):
            im = Image.open(STILLS / f"idea{n}_look{look}.png").convert("RGB").resize((W, H), Image.LANCZOS)
            x = PAD + k * (W + GAP)
            board.paste(im, (x, PAD + HEAD))
            d.text((x, PAD + HEAD + H + 18), LOOKS[n][k], fill="#373737", font=font(30))
        out = STILLS / f"board_idea{n}.png"
        board.save(out)
        print(out)


if __name__ == "__main__":
    main()
