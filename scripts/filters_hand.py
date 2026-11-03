"""Hand-written plain English for the ffmpeg video filters worth knowing.

ffmpeg's own help is written for someone who already knows what the filter
does: `lagfun` is "slowly update darker pixels", which is true and tells you
nothing. These are the ~80 filters this work actually reaches for, each with a
plain name, one sentence about what it does to the picture, and for each
option a plain label, a one-line hint, and - for anything with a slider - what
the two ends of that slider mean in words rather than in numbers.

Every other filter in the build is generated from the help text by
scripts/build_filter_plain.py and flagged `"hand": false`, so the rough ones
are visibly rough.

Shape of an entry:

    "name": (plain name, group, one sentence, {option: (...)})

and of an option:

    "flag": (plain label, hint, low end in words, high end in words)

The last two are None for an option that is not a slider - a string, an
expression, a list of coordinates, a preset name.
"""

GROUPS = [
    "Color",
    "Blur & sharpen",
    "Distort & warp",
    "Time (speed, echo, repeat)",
    "Edges & shapes",
    "Glitch & noise",
    "Cut & crop",
    "Everything else",
]

HAND = {
    # ------------------------------------------------------------ Color
    "hue": (
        "Shift the colours", "Color",
        "Turns every colour around the colour wheel, and can drain the "
        "colour out or push it past life.",
        {"h": ("Colour shift", "Degrees around the colour wheel. 180 swaps "
               "every colour for its opposite.", "unchanged", "all the way round"),
         "s": ("Colour strength", "1 is as shot. 0 is grey.",
               "grey", "screaming"),
         "b": ("Brightness", "Lifts or drops the whole picture.",
               "darker", "brighter"),
         "H": ("Colour shift in radians", "The same dial as Colour shift, in "
               "radians instead of degrees.", None, None)},
    ),
    "eq": (
        "Brightness, contrast, colour", "Color",
        "The four ordinary picture controls in one filter: how bright, how "
        "contrasty, how colourful, how gamma'd.",
        {"brightness": ("Brightness", "Adds light to everything equally.",
                        "black", "blown out"),
         "contrast": ("Contrast", "1 is as shot. Below 1 goes flat, above 1 "
                      "goes hard. Negative inverts.", "flat grey", "hard"),
         "saturation": ("Colour strength", "0 is black and white.",
                        "black and white", "garish"),
         "gamma": ("Mid-tone lift", "Moves the middle greys without moving "
                   "black or white.", "heavy mids", "washed mids"),
         "gamma_r": ("Red mid-tones", "Mid-tone lift, red only.",
                     "less red in the mids", "more red in the mids"),
         "gamma_g": ("Green mid-tones", "Mid-tone lift, green only.",
                     "less green in the mids", "more green in the mids"),
         "gamma_b": ("Blue mid-tones", "Mid-tone lift, blue only.",
                     "less blue in the mids", "more blue in the mids"),
         "gamma_weight": ("How much the mid-tone lift spares the highlights",
                          "At 0 the bright end is left alone.",
                          "highlights untouched", "highlights follow")},
    ),
    "colorbalance": (
        "Push colours in the shadows, mids and highlights", "Color",
        "Tints the dark, middle and bright parts of the picture separately - "
        "cold shadows and warm highlights, or the other way round.",
        {"rs": ("Red in the shadows", "Negative pushes towards cyan.",
                "cyan shadows", "red shadows"),
         "gs": ("Green in the shadows", "Negative pushes towards magenta.",
                "magenta shadows", "green shadows"),
         "bs": ("Blue in the shadows", "Negative pushes towards yellow.",
                "yellow shadows", "blue shadows"),
         "rm": ("Red in the mid-tones", "Negative pushes towards cyan.",
                "cyan mids", "red mids"),
         "gm": ("Green in the mid-tones", "Negative pushes towards magenta.",
                "magenta mids", "green mids"),
         "bm": ("Blue in the mid-tones", "Negative pushes towards yellow.",
                "yellow mids", "blue mids"),
         "rh": ("Red in the highlights", "Negative pushes towards cyan.",
                "cyan highlights", "red highlights"),
         "gh": ("Green in the highlights", "Negative pushes towards magenta.",
                "magenta highlights", "green highlights"),
         "bh": ("Blue in the highlights", "Negative pushes towards yellow.",
                "yellow highlights", "blue highlights"),
         "pl": ("Keep the brightness", "On, a colour push does not change how "
                "bright the picture reads.", None, None)},
    ),
    "curves": (
        "Draw the tone curve", "Color",
        "Bends brightness through a curve you draw - the Photoshop curves "
        "box - for the whole picture or one colour at a time.",
        {"preset": ("Ready-made look", "Eleven canned curves, from "
                    "`vintage` to `negative`.", None, None),
         "master": ("Curve for everything", "Points as `0/0 0.5/0.6 1/1`; "
                    "the first number is in, the second is out.", None, None),
         "red": ("Red curve", "Same point list, red channel only.",
                 None, None),
         "green": ("Green curve", "Same point list, green channel only.",
                   None, None),
         "blue": ("Blue curve", "Same point list, blue channel only.",
                  None, None),
         "all": ("Curve applied to every channel", "Shorthand for setting "
                 "red, green and blue to the same points.", None, None),
         "psfile": ("Load a Photoshop .acv file", "A curve exported from "
                    "Photoshop.", None, None),
         "plot": ("Write the curve out as a picture", "Saves a gnuplot of "
                  "what the curve looks like.", None, None),
         "interp": ("How the points are joined", "Natural is a smooth "
                    "spline; pchip will not overshoot.", None, None)},
    ),
    "colorlevels": (
        "Set black, white and gamma per channel", "Color",
        "Says which input value becomes black and which becomes white, per "
        "colour channel - the levels box, and the quickest route to a crushed "
        "or bleached look.",
        {"rimin": ("Red black point", "Anything darker than this goes to "
                   "black.", "nothing crushed", "most of the red crushed"),
         "gimin": ("Green black point", "Anything darker goes to black.",
                   "nothing crushed", "most of the green crushed"),
         "bimin": ("Blue black point", "Anything darker goes to black.",
                   "nothing crushed", "most of the blue crushed"),
         "rimax": ("Red white point", "Anything brighter goes to full red.",
                   "all red blown", "nothing blown"),
         "gimax": ("Green white point", "Anything brighter goes to full green.",
                   "all green blown", "nothing blown"),
         "bimax": ("Blue white point", "Anything brighter goes to full blue.",
                   "all blue blown", "nothing blown"),
         "romin": ("Darkest red the output may reach", "Lifts the floor, so "
                   "black is never black.", "true black", "milky"),
         "gomin": ("Darkest green the output may reach", "Lifts the floor.",
                   "true black", "milky"),
         "bomin": ("Darkest blue the output may reach", "Lifts the floor.",
                   "true black", "milky"),
         "romax": ("Brightest red the output may reach", "Drops the ceiling.",
                   "dim", "full"),
         "gomax": ("Brightest green the output may reach", "Drops the ceiling.",
                   "dim", "full"),
         "bomax": ("Brightest blue the output may reach", "Drops the ceiling.",
                   "dim", "full")},
    ),
    "colorchannelmixer": (
        "Rebuild each colour out of the others", "Color",
        "Writes each output channel as a recipe of all the input channels - "
        "how you put red into the greens, or swap two channels outright.",
        {"rr": ("Red from red", "1 keeps red as it was.", "no red", "double red"),
         "rg": ("Red from green", "Pours green into the red channel.",
                "none", "all of it"),
         "rb": ("Red from blue", "Pours blue into the red channel.",
                "none", "all of it"),
         "gr": ("Green from red", "Pours red into the green channel.",
                "none", "all of it"),
         "gg": ("Green from green", "1 keeps green as it was.",
                "no green", "double green"),
         "gb": ("Green from blue", "Pours blue into the green channel.",
                "none", "all of it"),
         "br": ("Blue from red", "Pours red into the blue channel.",
                "none", "all of it"),
         "bg": ("Blue from green", "Pours green into the blue channel.",
                "none", "all of it"),
         "bb": ("Blue from blue", "1 keeps blue as it was.",
                "no blue", "double blue"),
         "pc": ("Keep the brightness", "Stops the mix from changing how "
                "bright the picture reads.", None, None),
         "pa": ("How hard to hold the brightness", "0 lets it drift, 1 holds "
                "it.", "let it drift", "hold it")},
    ),
    "colortemperature": (
        "Warm or cool the picture", "Color",
        "Moves the whole picture along the warm-to-cold axis, in kelvin, the "
        "way a white balance dial does.",
        {"temperature": ("Colour temperature", "Low is orange, high is blue.",
                         "candlelight orange", "shade blue"),
         "mix": ("How much of it to use", "Blends the warmed picture back "
                 "over the original.", "none", "all of it"),
         "pl": ("Keep the brightness", "Stops warming from also darkening.",
                "ignore brightness", "hold brightness")},
    ),
    "colorize": (
        "Paint the picture one colour", "Color",
        "Throws away the original colour and tints the whole frame a single "
        "hue, keeping the light and dark.",
        {"hue": ("Which colour", "Degrees around the colour wheel.",
                 "red", "back to red"),
         "saturation": ("How strong the colour is", "0 leaves it grey.",
                        "grey", "full colour"),
         "lightness": ("Lightness", "Lifts or drops the tint.",
                       "dark", "light"),
         "mix": ("How much of it to use", "Blends back over the original.",
                 "original", "fully tinted")},
    ),
    "vibrance": (
        "Boost the quiet colours only", "Color",
        "Pushes the colours that are already weak and leaves the strong ones "
        "alone, so skin and sky do not go plastic.",
        {"intensity": ("Strength", "Negative drains instead of boosting.",
                       "drained", "lurid"),
         "rbal": ("Red share", "How much of the push lands on red.",
                  "spare red", "push red"),
         "gbal": ("Green share", "How much of the push lands on green.",
                  "spare green", "push green"),
         "bbal": ("Blue share", "How much of the push lands on blue.",
                  "spare blue", "push blue"),
         "rlum": ("Red's weight in brightness", "How much red counts towards "
                  "how bright a pixel reads.", "none", "all"),
         "glum": ("Green's weight in brightness", "How much green counts.",
                  "none", "all"),
         "blum": ("Blue's weight in brightness", "How much blue counts.",
                  "none", "all"),
         "alternate": ("Use the other formula", "A second way of computing "
                       "it; try both.", None, None)},
    ),
    "huesaturation": (
        "Hue and saturation, per colour range", "Color",
        "Turns and strengthens the colours, with switches for which colour "
        "families it is allowed to touch.",
        {"hue": ("Colour shift", "Degrees around the wheel.",
                 "all the way back", "all the way round"),
         "saturation": ("Colour strength", "Negative inverts the colours.",
                        "inverted", "screaming"),
         "intensity": ("How hard", "Scales the whole effect.",
                       "nothing", "everything"),
         "colors": ("Which colours to touch", "Any of red, yellow, green, "
                    "cyan, blue, magenta.", None, None),
         "strength": ("Falloff", "How far past the chosen colours it bleeds.",
                      "tight", "everything"),
         "rw": ("Red's weight in brightness", "Part of the brightness "
                "formula.", "none", "all"),
         "gw": ("Green's weight in brightness", "Part of the brightness "
                "formula.", "none", "all"),
         "bw": ("Blue's weight in brightness", "Part of the brightness "
                "formula.", "none", "all"),
         "lightness": ("Keep the lightness", "Holds brightness while the "
                       "colour moves.", None, None)},
    ),
    "selectivecolor": (
        "Adjust one colour family at a time", "Color",
        "Photoshop's selective colour: pick the reds, or the neutrals, and "
        "move only those.",
        {"correction_method": ("How the correction is applied",
                               "Absolute or relative.", None, None),
         "reds": ("Reds", "Four numbers: cyan, magenta, yellow, black.",
                  None, None),
         "yellows": ("Yellows", "Four numbers: cyan, magenta, yellow, black.",
                     None, None),
         "greens": ("Greens", "Four numbers: cyan, magenta, yellow, black.",
                    None, None),
         "cyans": ("Cyans", "Four numbers: cyan, magenta, yellow, black.",
                   None, None),
         "blues": ("Blues", "Four numbers: cyan, magenta, yellow, black.",
                   None, None),
         "magentas": ("Magentas", "Four numbers.", None, None),
         "whites": ("Whites", "Four numbers.", None, None),
         "neutrals": ("Neutrals", "Four numbers; this is the one that fixes "
                      "a cast.", None, None),
         "blacks": ("Blacks", "Four numbers.", None, None),
         "psfile": ("Load a Photoshop file", "A selective colour preset.",
                    None, None)},
    ),
    "negate": (
        "Invert the picture", "Color",
        "Every value becomes its opposite - the photographic negative.",
        {"components": ("Which channels to invert", "Any of y, u, v, r, g, b, "
                        "a.", None, None),
         "negate_alpha": ("Invert the transparency too", "Usually off.",
                          None, None)},
    ),
    "monochrome": (
        "Black and white, with a filter over the lens", "Color",
        "Converts to grey as if through a coloured filter, so you choose "
        "which colours come out light and which come out dark.",
        {"cb": ("Blue-yellow of the filter", "Which end of that axis the "
                "lens filter sits at.", "yellow filter", "blue filter"),
         "cr": ("Red-green of the filter", "Which end of that axis.",
                "green filter", "red filter"),
         "size": ("How wide a colour range the filter catches",
                  "Small is a narrow filter.", "narrow", "wide"),
         "high": ("How much of the original brightness to keep",
                  "0 is pure filter.", "pure filter", "original brightness")},
    ),
    "exposure": (
        "Stops of exposure", "Color",
        "Opens or closes the lens after the fact, in stops, with a separate "
        "black-level dial.",
        {"exposure": ("Exposure", "In stops. +1 is twice the light.",
                      "closed down", "opened up"),
         "black": ("Black level", "Where black sits before the exposure.",
                   "crushed", "lifted")},
    ),
    "colorcontrast": (
        "Contrast between opposite colours", "Color",
        "Pushes red against cyan, yellow against blue, green against "
        "magenta - contrast in colour rather than in brightness.",
        {"rc": ("Red against cyan", "Negative goes the other way.",
                "towards cyan", "towards red"),
         "gm": ("Green against magenta", "Negative goes the other way.",
                "towards magenta", "towards green"),
         "by": ("Blue against yellow", "Negative goes the other way.",
                "towards yellow", "towards blue"),
         "rcw": ("How much of that lands in the mid-tones",
                 "Weight for red/cyan.", "edges only", "all mids"),
         "gmw": ("How much of that lands in the mid-tones",
                 "Weight for green/magenta.", "edges only", "all mids"),
         "byw": ("How much of that lands in the mid-tones",
                 "Weight for blue/yellow.", "edges only", "all mids"),
         "pl": ("Keep the brightness", "Holds how bright the picture reads.",
                "let it drift", "hold it")},
    ),
    "lutrgb": (
        "Rewrite red, green and blue by formula", "Color",
        "Give each channel an expression in terms of its own value, and every "
        "pixel is rewritten through it - the fastest way to a hard, graphic "
        "colour break.",
        {"r": ("Red formula", "Use `val` for the pixel's own red; e.g. "
               "`255-val`.", None, None),
         "g": ("Green formula", "Use `val` for the pixel's own green.",
               None, None),
         "b": ("Blue formula", "Use `val` for the pixel's own blue.",
               None, None),
         "a": ("Transparency formula", "Use `val` for alpha.", None, None)},
    ),
    "lutyuv": (
        "Rewrite brightness and colour by formula", "Color",
        "The same as rewriting red, green and blue by formula, but on "
        "brightness and the two colour channels, which is where posterising "
        "the light without touching the hue lives.",
        {"y": ("Brightness formula", "Use `val`; e.g. `val-128` for a "
               "contrast break.", None, None),
         "u": ("Blue-yellow formula", "Use `val`.", None, None),
         "v": ("Red-green formula", "Use `val`.", None, None),
         "a": ("Transparency formula", "Use `val`.", None, None)},
    ),
    "haldclut": (
        "Apply a lookup-table image", "Color",
        "Takes a second input that is a colour lookup table as a picture and "
        "remaps every colour through it - how a graded look travels as a "
        "file.",
        {"clut": ("When the table image is read", "Once on the first frame, "
                  "or every frame.", None, None),
         "interp": ("How the table is interpolated", "Nearest is hard, "
                    "tetrahedral is smooth.", None, None)},
    ),
    "pseudocolor": (
        "Map brightness to a false-colour palette", "Color",
        "Replaces grey with a ramp of colour - the heat-map look, and a way "
        "of seeing values you cannot see in grey.",
        {"c0": ("Formula for the first channel", "In terms of `val`.",
                None, None),
         "c1": ("Formula for the second channel", "In terms of `val`.",
                None, None),
         "c2": ("Formula for the third channel", "In terms of `val`.",
                None, None),
         "c3": ("Formula for the fourth channel", "In terms of `val`.",
                None, None),
         "index": ("Which channel drives it", "Usually brightness.",
                   "first channel", "last channel"),
         "preset": ("Ready-made palette", "magma, inferno, turbo and so on.",
                    None, None),
         "opacity": ("How strong the false colour is", "Blends back over the "
                     "original.", "original", "full false colour")},
    ),
    "swapuv": (
        "Swap the two colour channels", "Color",
        "Exchanges blue-yellow for red-green, which leaves the picture "
        "perfectly sharp and completely wrong.",
        {},
    ),
    "colorhold": (
        "Keep one colour, grey the rest", "Color",
        "Everything that is not near the colour you name goes to grey - the "
        "red-coat-in-a-grey-city shot.",
        {"color": ("The colour to keep", "A colour name or #rrggbb.",
                   None, None),
         "similarity": ("How close counts as that colour", "Small is picky.",
                        "exact only", "half the wheel"),
         "blend": ("Softness of the edge", "0 is a hard cut.",
                   "hard edge", "soft edge")},
    ),

    # -------------------------------------------------- Blur & sharpen
    "gblur": (
        "Soft blur", "Blur & sharpen",
        "The ordinary smooth, round blur - the one that looks like a lens out "
        "of focus.",
        {"sigma": ("How blurry", "The radius, roughly.",
                   "sharp", "unreadable"),
         "steps": ("How many passes", "More passes is rounder and slower.",
                   "rough", "round"),
         "planes": ("Which channels to blur", "A bitmask; 1 is brightness "
                    "only.", None, None),
         "sigmaV": ("How blurry vertically", "-1 means the same as "
                    "horizontally.", "sharp", "unreadable")},
    ),
    "boxblur": (
        "Square blur", "Blur & sharpen",
        "Averages a square of pixels, which blurs in straight lines and "
        "leaves a boxy, cheap, deliberate smear.",
        {"luma_radius": ("How far it smears the brightness",
                         "In pixels, or an expression.", "sharp", "mush"),
         "luma_power": ("How many times", "Repeating it rounds the square "
                        "off.", "boxy", "round"),
         "chroma_radius": ("How far it smears the colour", "In pixels.",
                           "sharp colour", "colour mush"),
         "chroma_power": ("How many times, for colour", "Repeat count.",
                          "boxy", "round"),
         "alpha_radius": ("How far it smears the transparency",
                          "In pixels.", "sharp", "mush"),
         "alpha_power": ("How many times, for transparency", "Repeat count.",
                         "boxy", "round")},
    ),
    "avgblur": (
        "Flat average blur", "Blur & sharpen",
        "Replaces every pixel with the flat average of a rectangle around "
        "it - faster and harder-edged than a soft blur.",
        {"sizeX": ("Width of the average", "In pixels.", "sharp", "mush"),
         "sizeY": ("Height of the average", "In pixels; 0 copies the width.",
                   "sharp", "mush"),
         "planes": ("Which channels", "A bitmask.", None, None)},
    ),
    "smartblur": (
        "Blur the flat parts, keep the edges", "Blur & sharpen",
        "Smooths skin and walls while leaving anything that looks like an "
        "edge alone - denoise that does not turn the picture to wax.",
        {"luma_radius": ("How far the brightness blur reaches",
                         "In pixels.", "sharp", "soft"),
         "luma_strength": ("How strong", "Negative sharpens instead.",
                           "sharpen", "smooth"),
         "luma_threshold": ("What counts as an edge",
                            "Positive blurs the flat parts only; negative "
                            "blurs the edges only.",
                            "edges only", "flat parts only"),
         "chroma_radius": ("How far the colour blur reaches", "In pixels.",
                           "sharp", "soft"),
         "chroma_strength": ("How strong, for colour", "Negative sharpens.",
                             "sharpen", "smooth"),
         "chroma_threshold": ("What counts as an edge, for colour",
                              "Same sign rule.",
                              "edges only", "flat parts only")},
    ),
    "unsharp": (
        "Sharpen", "Blur & sharpen",
        "Finds the difference between the picture and a blurred copy of it "
        "and adds that back, which reads as sharpness.",
        {"luma_msize_x": ("Sharpening width", "Odd numbers only.",
                          "fine detail", "broad halo"),
         "luma_msize_y": ("Sharpening height", "Odd numbers only.",
                          "fine detail", "broad halo"),
         "luma_amount": ("How much", "Negative blurs instead.",
                         "blurred", "crunchy"),
         "chroma_msize_x": ("Colour sharpening width", "Odd numbers only.",
                            "fine", "broad"),
         "chroma_msize_y": ("Colour sharpening height", "Odd numbers only.",
                            "fine", "broad"),
         "chroma_amount": ("How much, for colour", "Negative blurs.",
                           "blurred", "crunchy"),
         "alpha_msize_x": ("Transparency sharpening width", "Odd numbers.",
                           "fine", "broad"),
         "alpha_msize_y": ("Transparency sharpening height", "Odd numbers.",
                           "fine", "broad"),
         "alpha_amount": ("How much, for transparency", "Negative blurs.",
                          "blurred", "crunchy")},
    ),
    "dblur": (
        "Blur in one direction", "Blur & sharpen",
        "Smears along a line at the angle you choose - motion blur you aim.",
        {"angle": ("Which way it smears", "Degrees.",
                   "flat", "all the way round"),
         "radius": ("How far", "In pixels.", "sharp", "streaked"),
         "planes": ("Which channels", "A bitmask.", None, None)},
    ),
    "bilateral": (
        "Smooth without crossing edges", "Blur & sharpen",
        "Averages only pixels that are both near and similar, so flat areas "
        "go glassy and edges stay knife-sharp - the cartoon-skin look.",
        {"sigmaS": ("How far it looks", "In pixels.", "tiny", "wide"),
         "sigmaR": ("How different a pixel may be and still count",
                    "Small keeps more edges.",
                    "edges everywhere", "one flat colour"),
         "planes": ("Which channels", "A bitmask.", None, None)},
    ),
    "median": (
        "Replace each pixel with its neighbourhood's middle value",
        "Blur & sharpen",
        "Kills specks and single-pixel noise without softening edges, and "
        "turns photographs into something slightly painted.",
        {"radius": ("How far it looks", "In pixels.", "nothing", "painted"),
         "planes": ("Which channels", "A bitmask.", None, None),
         "radiusV": ("How far vertically", "0 copies the horizontal.",
                     "nothing", "painted"),
         "percentile": ("Which value to take", "0.5 is the median; 0 is the "
                        "darkest and 1 the brightest nearby pixel.",
                        "darkest nearby", "brightest nearby")},
    ),
    "hqdn3d": (
        "Denoise, across the frame and across time", "Blur & sharpen",
        "Removes grain by looking both around each pixel and at the same "
        "pixel in the frames before - clean, and it will smear real motion "
        "if pushed.",
        {"luma_spatial": ("Brightness smoothing within the frame",
                          "Higher is cleaner and softer.",
                          "grainy", "plastic"),
         "chroma_spatial": ("Colour smoothing within the frame",
                            "Higher is cleaner.", "grainy", "plastic"),
         "luma_tmp": ("Brightness smoothing across frames",
                      "High values smear anything that moves.",
                      "no smear", "ghosting"),
         "chroma_tmp": ("Colour smoothing across frames",
                        "High values smear colour.", "no smear", "ghosting")},
    ),
    "nlmeans": (
        "Denoise by finding the same patch elsewhere", "Blur & sharpen",
        "Looks for patches that resemble each patch and averages them, which "
        "is the cleanest denoise here and much the slowest.",
        {"s": ("Strength", "Higher is cleaner and flatter.",
               "grainy", "flat"),
         "p": ("Patch size", "Odd numbers.", "fine", "coarse"),
         "pc": ("Patch size for colour", "Odd numbers; 0 copies.",
                "fine", "coarse"),
         "r": ("How far away to look for a matching patch",
               "Odd numbers; the slow dial.", "near", "far"),
         "rc": ("How far to look, for colour", "Odd numbers; 0 copies.",
                "near", "far")},
    ),

    # ------------------------------------------------- Distort & warp
    "lenscorrection": (
        "Bend the picture like a lens", "Distort & warp",
        "Barrels or pincushions the frame around a point you choose - either "
        "to undo a wide lens or to put one on.",
        {"cx": ("Centre, across", "0 is the left edge, 1 the right.",
                "left edge", "right edge"),
         "cy": ("Centre, down", "0 is the top, 1 the bottom.",
                "top", "bottom"),
         "k1": ("How much it bows", "Negative barrels out, positive pinches "
                "in.", "bulging out", "pinched in"),
         "k2": ("How much it bows at the corners",
                "The second-order term; fixes what the first leaves.",
                "corners out", "corners in"),
         "i": ("How the pixels are filled in", "Nearest is hard, bilinear is "
               "smooth.", None, None),
         "fc": ("Colour of the empty corners", "A colour name or #rrggbb.",
                None, None)},
    ),
    "perspective": (
        "Pull the four corners", "Distort & warp",
        "Drags each corner of the frame to a new place, so a flat picture can "
        "be laid onto a wall, a screen or nothing in particular.",
        {"x0": ("Top-left, across", "In pixels.", "left", "right"),
         "y0": ("Top-left, down", "In pixels.", "top", "bottom"),
         "x1": ("Top-right, across", "In pixels.", "left", "right"),
         "y1": ("Top-right, down", "In pixels.", "top", "bottom"),
         "x2": ("Bottom-left, across", "In pixels.", "left", "right"),
         "y2": ("Bottom-left, down", "In pixels.", "top", "bottom"),
         "x3": ("Bottom-right, across", "In pixels.", "left", "right"),
         "y3": ("Bottom-right, down", "In pixels.", "top", "bottom"),
         "interpolation": ("How the pixels are filled in",
                           "Linear is smooth, cubic is sharper.", None, None),
         "sense": ("Which way to read the corners",
                   "Whether those are where the corners go, or where they "
                   "came from.", None, None),
         "eval": ("When the corners are worked out",
                  "Once, or every frame so they can move.", None, None)},
    ),
    "rotate": (
        "Turn the picture", "Distort & warp",
        "Rotates the frame by any angle, and the angle can be an expression, "
        "so it can keep turning.",
        {"angle": ("Angle", "In radians; `t` is the time in seconds, so "
                   "`t*0.5` spins.", None, None),
         "out_w": ("Output width", "An expression; `iw` is the input width.",
                   None, None),
         "out_h": ("Output height", "An expression; `ih` is the input "
                   "height.", None, None),
         "fillcolor": ("Colour behind the corners",
                       "A colour name, or `none` to leave it clear.",
                       None, None),
         "bilinear": ("Smooth the rotation", "Off is hard and aliased, which "
                      "is sometimes what you want.", None, None)},
    ),
    "displace": (
        "Push every pixel using two other videos", "Distort & warp",
        "Two extra inputs say, per pixel, how far to move it sideways and "
        "how far up - a displacement map, and the most controllable warp "
        "here.",
        {"edge": ("What happens at the edges",
                  "Blank, smear, wrap or mirror.", None, None)},
    ),
    "remap": (
        "Rebuild the frame from a coordinate map", "Distort & warp",
        "Two extra inputs give, per output pixel, which input pixel to take - "
        "so any rearrangement of the frame at all is just a map.",
        {"format": ("Colour format to work in", "Colour or grey.",
                    None, None),
         "fill": ("Colour where the map points nowhere",
                  "A colour name or #rrggbb.", None, None)},
    ),
    "geq": (
        "Write every pixel with a formula", "Distort & warp",
        "You give an expression per channel and it is evaluated for every "
        "pixel of every frame - `X`, `Y`, `T` and `p(x,y)` are in scope, "
        "which makes it the one filter that can do anything and the one that "
        "is slowest at it.",
        {"lum_expr": ("Brightness formula",
                      "e.g. `p(X,Y+10*sin(X/20+T))` to ripple.", None, None),
         "cb_expr": ("Blue-yellow formula", "Same variables.", None, None),
         "cr_expr": ("Red-green formula", "Same variables.", None, None),
         "alpha_expr": ("Transparency formula", "Same variables.",
                        None, None),
         "red_expr": ("Red formula", "Use these instead of brightness and "
                      "colour to work in RGB.", None, None),
         "green_expr": ("Green formula", "Same variables.", None, None),
         "blue_expr": ("Blue formula", "Same variables.", None, None),
         "interpolation": ("How in-between pixels are read",
                           "Nearest is hard, bilinear is smooth.",
                           None, None)},
    ),
    "zoompan": (
        "Zoom and pan over the frame", "Distort & warp",
        "A slow push into the picture, with the zoom and the centre given as "
        "expressions so they can move over time.",
        {"zoom": ("How far in", "1 is no zoom; `z` is the last frame's zoom, "
                  "so `z+0.001` creeps.", None, None),
         "x": ("Centre, across", "An expression in pixels.", None, None),
         "y": ("Centre, down", "An expression in pixels.", None, None),
         "d": ("How many frames each input frame lasts",
               "1 keeps the timing.", "pass through", "hold a long time"),
         "s": ("Output size", "e.g. `1280x720`.", None, None),
         "fps": ("Output frame rate", "e.g. `24`.", None, None)},
    ),
    "pixelize": (
        "Big pixels", "Distort & warp",
        "Averages the frame into blocks - the censorship mosaic, and the "
        "cheapest route to something that looks compressed.",
        {"width": ("Block width", "In pixels.", "fine", "a few huge blocks"),
         "height": ("Block height", "In pixels.",
                    "fine", "a few huge blocks"),
         "mode": ("How each block is filled", "Its average, or the single "
                  "pixel at its middle.", None, None),
         "planes": ("Which channels", "A bitmask.", None, None)},
    ),
    "scroll": (
        "Slide the picture, wrapping round", "Distort & warp",
        "Moves the frame sideways or up and down a little every frame, and "
        "what leaves one edge comes back in the other.",
        {"horizontal": ("How fast sideways", "Fraction of the width per "
                        "frame.", "left fast", "right fast"),
         "vertical": ("How fast up and down",
                      "Fraction of the height per frame.",
                      "up fast", "down fast"),
         "hpos": ("Starting position across", "0 to 1.",
                  "left edge", "right edge"),
         "vpos": ("Starting position down", "0 to 1.", "top", "bottom")},
    ),
    "transpose": (
        "Rotate by a quarter turn", "Distort & warp",
        "Turns the frame 90 degrees, with a choice of which way and whether "
        "to flip it on the way.",
        {"dir": ("Which way", "Four combinations of quarter turn and flip.",
                 None, None),
         "passthrough": ("Leave some shapes alone",
                         "Skip portrait or landscape frames.", None, None)},
    ),
    "hflip": ("Flip left to right", "Distort & warp",
              "Mirrors the frame horizontally.", {}),
    "vflip": ("Flip top to bottom", "Distort & warp",
              "Mirrors the frame vertically.", {}),
    "swaprect": (
        "Exchange two rectangles", "Distort & warp",
        "Picks up one rectangle of the frame and swaps it with another - a "
        "clean, deliberate glitch that keeps every pixel.",
        {"w": ("Width of both rectangles", "An expression.", None, None),
         "h": ("Height of both rectangles", "An expression.", None, None),
         "x1": ("First rectangle, across", "An expression.", None, None),
         "y1": ("First rectangle, down", "An expression.", None, None),
         "x2": ("Second rectangle, across", "An expression.", None, None),
         "y2": ("Second rectangle, down", "An expression.", None, None)},
    ),
    "tile": (
        "Lay frames out in a grid", "Distort & warp",
        "Collects consecutive frames into one big contact sheet.",
        {"layout": ("Grid size", "e.g. `4x3`.", None, None),
         "nb_frames": ("How many frames to take", "0 fills the grid.",
                       "fill the grid", "many"),
         "margin": ("Border around the whole grid", "In pixels.",
                    "none", "wide"),
         "padding": ("Gap between tiles", "In pixels.", "none", "wide"),
         "color": ("Colour of the gaps", "A colour name.", None, None),
         "overlap": ("How many frames each grid shares with the last",
                     "For a rolling grid.", "none", "almost all"),
         "init_padding": ("Blank tiles before the first frame",
                          "Starts the grid part-full.", "none", "many")},
    ),

    # --------------------------------------- Time (speed, echo, repeat)
    "setpts": (
        "Rewrite when each frame happens", "Time (speed, echo, repeat)",
        "Changes each frame's timestamp by a formula, which is how you speed "
        "up, slow down or reverse time without touching a single pixel - "
        "`0.5*PTS` is double speed.",
        {"expr": ("Timestamp formula",
                  "`PTS` is the frame's own time; `N` is its number; "
                  "`0.5*PTS` is twice as fast.", None, None)},
    ),
    "fps": (
        "Force a frame rate", "Time (speed, echo, repeat)",
        "Drops or repeats whole frames until the stream runs at the rate you "
        "ask for, which is how a 30fps clip becomes a 24fps one.",
        {"fps": ("Frames per second", "e.g. `24`.", None, None),
         "start_time": ("Start the count from this time", "In seconds.",
                        None, None),
         "round": ("How a frame's new time is rounded",
                   "Near is the usual choice.", None, None),
         "eof_action": ("What to do with the last frame",
                        "Round it, or pass it through.", None, None)},
    ),
    "framerate": (
        "Change frame rate by blending", "Time (speed, echo, repeat)",
        "Builds the missing frames by fading between the two nearest ones "
        "instead of repeating - smoother than forcing a rate, and it "
        "ghosts.",
        {"fps": ("Frames per second", "e.g. `60`.", None, None),
         "interp_start": ("Where blending begins", "Of 255.",
                          "blend early", "blend late"),
         "interp_end": ("Where blending ends", "Of 255.",
                        "blend early", "blend late"),
         "scene": ("Cut detection", "Above this difference it cuts instead "
                   "of blending.", "blend through cuts", "never blend"),
         "flags": ("Extra switches", "e.g. scene change detection.",
                   None, None)},
    ),
    "minterpolate": (
        "Invent the in-between frames", "Time (speed, echo, repeat)",
        "Estimates how things moved and builds new frames along that motion - "
        "real slow motion, and when it guesses wrong the picture tears in a "
        "way that is worth having on purpose.",
        {"fps": ("Frames per second to reach", "e.g. `60`.", None, None),
         "mi_mode": ("How the new frames are made",
                     "Duplicate, blend, or follow the motion.", None, None),
         "mc_mode": ("How motion is compensated",
                     "Per block, or overlapped and smoother.", None, None),
         "me_mode": ("Which direction motion is estimated in",
                     "Forwards, backwards or both.", None, None),
         "me": ("Motion search method", "Several, trading speed for "
                "accuracy.", None, None),
         "mb_size": ("Block size for the motion search", "In pixels.",
                     "fine and slow", "coarse and fast"),
         "search_param": ("How far the motion search looks", "In pixels.",
                          "short moves only", "long moves"),
         "vsbmc": ("Use variable-size blocks",
                   "Slower, and better on edges.", None, None),
         "scd": ("Cut detection", "Stops it interpolating across a cut.",
                 None, None),
         "scd_threshold": ("How different a frame must be to count as a cut",
                           "Low cuts often.",
                           "everything is a cut", "nothing is")},
    ),
    "tblend": (
        "Blend each frame with the one before", "Time (speed, echo, repeat)",
        "Combines every frame with its predecessor using any of the Photoshop "
        "blend modes - the trail, the smear and the strobe all live here.",
        {"c0_mode": ("Blend mode for the first channel",
                     "difference, screen, multiply and thirty more.",
                     None, None),
         "c1_mode": ("Blend mode for the second channel", "Same list.",
                     None, None),
         "c2_mode": ("Blend mode for the third channel", "Same list.",
                     None, None),
         "c3_mode": ("Blend mode for the fourth channel", "Same list.",
                     None, None),
         "all_mode": ("Blend mode for every channel",
                      "Sets all four at once.", None, None),
         "c0_opacity": ("How much of the blend to keep, first channel",
                        "1 is all of it.", "previous frame", "blended"),
         "c1_opacity": ("How much, second channel", "1 is all of it.",
                        "previous frame", "blended"),
         "c2_opacity": ("How much, third channel", "1 is all of it.",
                        "previous frame", "blended"),
         "c3_opacity": ("How much, fourth channel", "1 is all of it.",
                        "previous frame", "blended"),
         "all_opacity": ("How much, every channel", "Sets all four at once.",
                         "previous frame", "fully blended"),
         "c0_expr": ("Formula instead of a mode, first channel",
                     "`A` is this frame, `B` the last.", None, None),
         "c1_expr": ("Formula, second channel", "`A` and `B`.", None, None),
         "c2_expr": ("Formula, third channel", "`A` and `B`.", None, None),
         "c3_expr": ("Formula, fourth channel", "`A` and `B`.", None, None),
         "all_expr": ("Formula, every channel", "`A` and `B`.", None, None)},
    ),
    "lagfun": (
        "Let the bright parts linger", "Time (speed, echo, repeat)",
        "Bright pixels fade out slowly while dark ones update at once, so "
        "anything light leaves a comet tail behind it.",
        {"decay": ("How long the tail lasts", "Close to 1 almost never "
                   "fades.", "no tail", "never fades"),
         "planes": ("Which channels", "A bitmask.", None, None)},
    ),
    "tmix": (
        "Average the last few frames", "Time (speed, echo, repeat)",
        "Mixes a run of consecutive frames into one, which smooths motion "
        "into a long-exposure blur and quietens grain.",
        {"frames": ("How many frames to average", "More is smoother.",
                    "no mixing", "long exposure"),
         "weights": ("Weight per frame", "e.g. `1 2 3` to favour the newest.",
                     None, None),
         "scale": ("Overall scale", "0 works it out from the weights.",
                   None, None),
         "planes": ("Which channels", "A bitmask.", None, None)},
    ),
    "shuffleframes": (
        "Put the frames in an order you choose", "Time (speed, echo, repeat)",
        "Takes a window of frames and re-emits them in whatever order you "
        "list - stutters, repeats and little reversals, exactly placed.",
        {"mapping": ("The order", "e.g. `0 2 1 3`; a negative number drops "
                     "that frame.", None, None)},
    ),
    "random": (
        "Shuffle frames at random", "Time (speed, echo, repeat)",
        "Holds a few frames in a bag and plays them back in random order, so "
        "time stays roughly right and stops being continuous.",
        {"frames": ("How many frames in the bag", "Bigger scrambles "
                    "further.", "almost in order", "scrambled"),
         "seed": ("Which shuffle", "-1 is a new one each run; any other "
                  "number repeats exactly.", None, None)},
    ),
    "loop": (
        "Repeat a run of frames", "Time (speed, echo, repeat)",
        "Holds a number of frames and plays them again, as many times as you "
        "ask.",
        {"loop": ("How many times", "-1 is forever.",
                  "once", "many times"),
         "size": ("How many frames in the loop", "In frames.",
                  "one frame", "a long loop"),
         "start": ("Where the loop begins", "Frame number.",
                   "the beginning", "later")},
    ),
    "reverse": (
        "Play backwards", "Time (speed, echo, repeat)",
        "Holds the whole clip in memory and plays it last frame first, so it "
        "needs a short clip.",
        {},
    ),
    "framestep": (
        "Keep every Nth frame", "Time (speed, echo, repeat)",
        "Throws away all but one frame in N, which makes a stutter without "
        "changing how long the clip runs.",
        {"step": ("Keep one frame in", "2 keeps half of them.",
                  "keep everything", "keep almost nothing")},
    ),
    "trim": (
        "Keep part of the clip", "Time (speed, echo, repeat)",
        "Drops everything before and after the piece you name.",
        {"start": ("Start", "In seconds.", None, None),
         "end": ("End", "In seconds.", None, None),
         "start_pts": ("Start, in stream units", "Timebase units.",
                       None, None),
         "end_pts": ("End, in stream units", "Timebase units.", None, None),
         "duration": ("How long to keep", "In seconds.", None, None),
         "start_frame": ("Start, by frame number", "Frame count.",
                         None, None),
         "end_frame": ("End, by frame number", "Frame count.", None, None)},
    ),
    "tpad": (
        "Add frames before or after", "Time (speed, echo, repeat)",
        "Pads the clip with held or blank frames at either end, which is how "
        "you make room for something to arrive.",
        {"start": ("How many frames before", "Frame count.",
                   "none", "many"),
         "stop": ("How many frames after", "-1 pads until the other inputs "
                  "end.", "none", "many"),
         "start_mode": ("What the frames before are",
                        "Blank, or the first frame held.", None, None),
         "stop_mode": ("What the frames after are",
                       "Blank, or the last frame held.", None, None),
         "start_duration": ("How long before, in time", "In seconds.",
                            None, None),
         "stop_duration": ("How long after, in time", "In seconds.",
                           None, None),
         "color": ("Colour of the blank frames", "A colour name.",
                   None, None)},
    ),
    "deflicker": (
        "Even out brightness flicker", "Time (speed, echo, repeat)",
        "Averages how bright each frame is over a window and pushes them all "
        "towards it, which takes the pulse out of timelapse and old film.",
        {"size": ("How many frames to average over", "Bigger is steadier.",
                  "nothing", "very steady"),
         "mode": ("How the average is taken",
                  "Arithmetic, geometric, median and others.", None, None),
         "bypass": ("Measure but do not change anything",
                    "For reading the numbers.", None, None)},
    ),

    # ------------------------------------------------ Edges & shapes
    "edgedetect": (
        "Find the edges", "Edges & shapes",
        "Throws away the picture and keeps the outlines - white lines on "
        "black, or the original drawn over as a sketch.",
        {"high": ("How strong a line has to be to be kept",
                  "The upper threshold.", "every speck", "only hard edges"),
         "low": ("How strong a line has to be to be followed",
                 "The lower threshold; lines are traced between the two.",
                 "trace everything", "trace almost nothing"),
         "mode": ("What comes out", "Wires, colour mix, or a canny-only "
                  "pass.", None, None),
         "planes": ("Which channels", "A bitmask.", None, None)},
    ),
    "sobel": (
        "Edges, with direction", "Edges & shapes",
        "The classic gradient operator - brighter where the picture changes "
        "faster, and it keeps which way it changed.",
        {"planes": ("Which channels", "A bitmask.", None, None),
         "scale": ("How bright the result is", "Multiplies the gradient.",
                   "faint", "blinding"),
         "delta": ("Lift added to the result", "Shifts the whole thing up.",
                   "black background", "grey background")},
    ),
    "prewitt": (
        "Edges, slightly softer", "Edges & shapes",
        "The same idea as the classic gradient operator with a gentler "
        "kernel, so it is quieter on noise.",
        {"planes": ("Which channels", "A bitmask.", None, None),
         "scale": ("How bright the result is", "Multiplies the gradient.",
                   "faint", "blinding"),
         "delta": ("Lift added to the result", "Shifts it up.",
                   "black background", "grey background")},
    ),
    "roberts": (
        "Edges, finest and noisiest", "Edges & shapes",
        "A two-by-two gradient: the sharpest edge lines here, and the one "
        "that picks up every speck of grain with them.",
        {"planes": ("Which channels", "A bitmask.", None, None),
         "scale": ("How bright the result is", "Multiplies the gradient.",
                   "faint", "blinding"),
         "delta": ("Lift added to the result", "Shifts it up.",
                   "black background", "grey background")},
    ),
    "erosion": (
        "Shrink the bright shapes", "Edges & shapes",
        "Every pixel takes the darkest value near it, so light shapes pull "
        "in and thin lines disappear.",
        {"coordinates": ("Which neighbours count", "A bitmask of the eight "
                         "around each pixel.", None, None),
         "threshold0": ("How far the first channel may move",
                        "Caps the change.", "no change", "full erosion"),
         "threshold1": ("How far the second channel may move", "Caps it.",
                        "no change", "full erosion"),
         "threshold2": ("How far the third channel may move", "Caps it.",
                        "no change", "full erosion"),
         "threshold3": ("How far the fourth channel may move", "Caps it.",
                        "no change", "full erosion")},
    ),
    "dilation": (
        "Grow the bright shapes", "Edges & shapes",
        "Every pixel takes the brightest value near it, so light shapes "
        "swell and highlights bleed - the opposite of shrinking them.",
        {"coordinates": ("Which neighbours count", "A bitmask of the eight "
                         "around each pixel.", None, None),
         "threshold0": ("How far the first channel may move", "Caps it.",
                        "no change", "full dilation"),
         "threshold1": ("How far the second channel may move", "Caps it.",
                        "no change", "full dilation"),
         "threshold2": ("How far the third channel may move", "Caps it.",
                        "no change", "full dilation"),
         "threshold3": ("How far the fourth channel may move", "Caps it.",
                        "no change", "full dilation")},
    ),
    "morpho": (
        "Shrink, grow, open or close with a shape you supply",
        "Edges & shapes",
        "Takes a second input as the brush and applies it as a morphological "
        "operation, which is shrinking and growing with the shape of your "
        "choosing.",
        {"mode": ("Which operation", "erode, dilate, open, close, gradient, "
                  "tophat, blackhat.", None, None),
         "planes": ("Which channels", "A bitmask.", None, None),
         "structure": ("When the brush is read",
                       "Once, or every frame.", None, None)},
    ),
    "convolution": (
        "Apply a kernel by hand", "Edges & shapes",
        "You type a 3x3, 5x5 or 7x7 matrix per channel and it is run over "
        "every pixel - emboss, sharpen, any edge operator, written out.",
        {"0m": ("Matrix for the first channel",
                "e.g. `0 -1 0 -1 5 -1 0 -1 0` sharpens.", None, None),
         "1m": ("Matrix for the second channel", "Same shape.", None, None),
         "2m": ("Matrix for the third channel", "Same shape.", None, None),
         "3m": ("Matrix for the fourth channel", "Same shape.", None, None),
         "0rdiv": ("Divide the first channel's result",
                   "0 works it out from the matrix.", None, None),
         "1rdiv": ("Divide the second channel's result", "0 is automatic.",
                   None, None),
         "2rdiv": ("Divide the third channel's result", "0 is automatic.",
                   None, None),
         "3rdiv": ("Divide the fourth channel's result", "0 is automatic.",
                   None, None),
         "0bias": ("Lift for the first channel", "Added afterwards.",
                   "no lift", "grey lift"),
         "1bias": ("Lift for the second channel", "Added afterwards.",
                   "no lift", "grey lift"),
         "2bias": ("Lift for the third channel", "Added afterwards.",
                   "no lift", "grey lift"),
         "3bias": ("Lift for the fourth channel", "Added afterwards.",
                   "no lift", "grey lift"),
         "0mode": ("How the first channel's matrix is read",
                   "Square, row, column.", None, None)},
    ),
    "gradfun": (
        "Smooth out banding", "Edges & shapes",
        "Finds the flat gradients where 8-bit video shows steps and dithers "
        "across them, so a sky stops looking like contour lines.",
        {"strength": ("How much to smooth", "Higher removes more banding.",
                      "banding stays", "heavily smoothed"),
         "radius": ("How far to look for the gradient", "In pixels.",
                    "tight", "wide")},
    ),
    "drawbox": (
        "Draw a rectangle", "Edges & shapes",
        "Puts a box on the picture, filled or outlined, at a position that "
        "can be an expression and so can move.",
        {"x": ("Left edge", "An expression in pixels.", None, None),
         "y": ("Top edge", "An expression in pixels.", None, None),
         "width": ("Width", "An expression; 0 is the whole frame.",
                   None, None),
         "height": ("Height", "An expression; 0 is the whole frame.",
                    None, None),
         "color": ("Colour", "A colour name, or `invert`.", None, None),
         "thickness": ("Line thickness", "`fill` fills the box.", None, None),
         "replace": ("Replace rather than draw over",
                     "Writes the colour in, alpha and all.", None, None),
         "box_source": ("Take the box from side data",
                        "e.g. detected faces.", None, None)},
    ),
    "drawgrid": (
        "Draw a grid", "Edges & shapes",
        "Rules lines across the frame at whatever spacing you give.",
        {"x": ("First line, across", "An expression in pixels.", None, None),
         "y": ("First line, down", "An expression in pixels.", None, None),
         "width": ("Cell width", "An expression in pixels.", None, None),
         "height": ("Cell height", "An expression in pixels.", None, None),
         "color": ("Colour", "A colour name, or `invert`.", None, None),
         "thickness": ("Line thickness", "In pixels.", "hairline", "heavy"),
         "replace": ("Replace rather than draw over", "Writes it in.",
                     None, None)},
    ),

    # ------------------------------------------------- Glitch & noise
    "noise": (
        "Add grain", "Glitch & noise",
        "Puts noise into the picture, per channel, and can hold the same "
        "noise still or give every frame a new one.",
        {"all_seed": ("Which noise", "A number; the same number gives the "
                      "same grain.", None, None),
         "all_strength": ("How much grain", "0 to 100.",
                          "clean", "snow"),
         "all_flags": ("What kind of grain", "a averages over time, p makes "
                       "a pattern, t is temporal, u is uniform.",
                       None, None),
         "c0_seed": ("Which noise, first channel", "A number.", None, None),
         "c0_strength": ("How much grain, first channel", "0 to 100.",
                         "clean", "snow"),
         "c0_flags": ("What kind, first channel", "Same letters.",
                      None, None),
         "c1_strength": ("How much grain, second channel", "0 to 100.",
                         "clean", "snow"),
         "c2_strength": ("How much grain, third channel", "0 to 100.",
                         "clean", "snow"),
         "c3_strength": ("How much grain, fourth channel", "0 to 100.",
                         "clean", "snow")},
    ),
    "rgbashift": (
        "Pull the colour channels apart", "Glitch & noise",
        "Moves red, green, blue and transparency by different amounts, which "
        "is the chromatic-aberration fringe and the cheapest convincing "
        "glitch in the list.",
        {"rh": ("Red, sideways", "In pixels.", "left", "right"),
         "rv": ("Red, up and down", "In pixels.", "up", "down"),
         "gh": ("Green, sideways", "In pixels.", "left", "right"),
         "gv": ("Green, up and down", "In pixels.", "up", "down"),
         "bh": ("Blue, sideways", "In pixels.", "left", "right"),
         "bv": ("Blue, up and down", "In pixels.", "up", "down"),
         "ah": ("Transparency, sideways", "In pixels.", "left", "right"),
         "av": ("Transparency, up and down", "In pixels.", "up", "down"),
         "edge": ("What happens at the edges", "Smear or wrap.",
                  None, None)},
    ),
    "chromashift": (
        "Slide the colour off the picture", "Glitch & noise",
        "Moves the two colour channels without moving the brightness, so the "
        "picture stays sharp and the colour sits beside it - the "
        "mis-registered print look.",
        {"cbh": ("Blue-yellow, sideways", "In pixels.", "left", "right"),
         "cbv": ("Blue-yellow, up and down", "In pixels.", "up", "down"),
         "crh": ("Red-green, sideways", "In pixels.", "left", "right"),
         "crv": ("Red-green, up and down", "In pixels.", "up", "down"),
         "edge": ("What happens at the edges", "Smear or wrap.",
                  None, None)},
    ),
    "datascope": (
        "Show the numbers in the pixels", "Glitch & noise",
        "Prints each pixel's actual values over the picture as text, which "
        "turns the frame into a readable table and looks like a debugger "
        "because it is one.",
        {"size": ("Output size", "e.g. `hd720`.", None, None),
         "x": ("Which part of the frame to read, across", "In pixels.",
               "left edge", "right edge"),
         "y": ("Which part to read, down", "In pixels.", "top", "bottom"),
         "mode": ("How the numbers are drawn",
                  "mono, colour, or coloured text.", None, None),
         "axis": ("Draw the coordinates round the edge",
                  "Rulers along the top and side.", None, None),
         "opacity": ("How solid the text is", "Over the picture.",
                     "invisible", "solid"),
         "format": ("Number base", "Decimal or hexadecimal.", None, None),
         "components": ("Which channels to print", "A bitmask.", None, None)},
    ),
    # named pixscope, not pixelscope - the generator's --check caught it
    "pixscope": (
        "Magnify a few pixels", "Glitch & noise",
        "Blows up a small rectangle of the frame to fill the screen with its "
        "individual pixels and their values.",
        {"x": ("Where to look, across", "0 to 1 across the frame.",
               "left edge", "right edge"),
         "y": ("Where to look, down", "0 to 1 down the frame.",
               "top", "bottom"),
         "w": ("How many pixels across", "Count.", "a few", "many"),
         "h": ("How many pixels down", "Count.", "a few", "many"),
         "o": ("How solid the numbers are", "Over the magnified pixels.",
               "invisible", "solid"),
         "wx": ("Where the readout sits, across", "0 to 1.",
                "left", "right"),
         "wy": ("Where the readout sits, down", "0 to 1.", "top", "bottom")},
    ),
    "shufflepixels": (
        "Scramble the pixels", "Glitch & noise",
        "Moves pixels or blocks around inside the frame at random, keeping "
        "every one of them - so the picture is destroyed and nothing is "
        "lost.",
        {"direction": ("Scramble or unscramble",
                       "The same seed undoes it.", None, None),
          "mode": ("What gets moved", "Whole blocks, rows, columns or "
                   "single pixels.", None, None),
         "width": ("Block width", "In pixels.", "fine", "coarse"),
         "height": ("Block height", "In pixels.", "fine", "coarse"),
         "seed": ("Which scramble", "-1 is a new one each run.",
                  None, None)},
    ),
    "shuffleplanes": (
        "Swap the channels round", "Glitch & noise",
        "Sends any input channel to any output channel - brightness into "
        "red, colour into brightness - which is wrong in a way no colour "
        "filter can be.",
        {"map0": ("What the first channel becomes", "Index of the input "
                  "channel.", None, None),
         "map1": ("What the second channel becomes", "Index.", None, None),
         "map2": ("What the third channel becomes", "Index.", None, None),
         "map3": ("What the fourth channel becomes", "Index.", None, None)},
    ),
    "extractplanes": (
        "Split the channels into separate videos", "Glitch & noise",
        "Sends each channel out as its own grey video, so they can be "
        "filtered apart and put back together differently.",
        {"planes": ("Which channels to pull out", "Any of y, u, v, r, g, b, "
                    "a.", None, None)},
    ),
    "bitplanenoise": (
        "Show how noisy each bit is", "Glitch & noise",
        "Measures one bit-plane of the picture and can show it, which is how "
        "you see compression and watermarking rather than guess at it.",
        {"bitplane": ("Which bit", "1 is the least significant.",
                      "finest bit", "coarsest bit"),
         "filter": ("Show it instead of just measuring",
                    "Replaces the picture with the bit-plane.", None, None)},
    ),
    "photosensitivity": (
        "Hold back the flashes", "Glitch & noise",
        "Watches for sudden brightness and colour changes across frames and "
        "damps them, which is the opposite of a glitch and sometimes what a "
        "glitch needs beside it.",
        {"frames": ("How many frames to watch", "The window.",
                    "short memory", "long memory"),
         "threshold": ("How much change is too much", "Lower is stricter.",
                       "everything is a flash", "nothing is"),
         "skip": ("Pixels to skip when measuring", "Higher is faster.",
                  "every pixel", "a coarse sample"),
         "bypass": ("Measure but change nothing", "For reading the numbers.",
                    None, None)},
    ),
    "oscilloscope": (
        "Read the values along a line", "Glitch & noise",
        "Draws a waveform of the pixel values along any line you place "
        "across the frame - an instrument that happens to look like one.",
        {"x": ("Centre of the line, across", "0 to 1.", "left", "right"),
         "y": ("Centre of the line, down", "0 to 1.", "top", "bottom"),
         "s": ("Length of the line", "0 to 1 of the frame.",
               "a point", "the whole frame"),
         "t": ("Angle of the line", "0 to 1, a full turn.",
               "flat", "all the way round"),
         "o": ("How solid the trace is", "Over the picture.",
               "invisible", "solid"),
         "tx": ("Where the trace is drawn, across", "0 to 1.",
                "left", "right"),
         "ty": ("Where the trace is drawn, down", "0 to 1.",
                "top", "bottom"),
         "tw": ("Width of the trace box", "0 to 1.", "narrow", "wide"),
         "th": ("Height of the trace box", "0 to 1.", "short", "tall"),
         "c": ("Which channels to trace", "A bitmask.", None, None),
         "g": ("Draw the graticule", "The grid behind the trace.",
               None, None),
         "st": ("Show the statistics", "Numbers beside the trace.",
                None, None),
         "sc": ("Show the cursor", "Marks where the line is.", None, None)},
    ),
    "waveform": (
        "The video waveform monitor", "Glitch & noise",
        "Plots how much of each brightness the frame contains, column by "
        "column - the broadcast scope, and the only honest way to see "
        "whether the blacks are black.",
        {"mode": ("Which way the plot runs", "Column or row.", None, None),
         "intensity": ("How bright the trace is", "Low is a faint trace.",
                       "faint", "solid"),
         "mirror": ("Flip the plot", "Puts black at the bottom.",
                    None, None),
         "display": ("How channels are shown",
                     "Overlaid, stacked, or side by side.", None, None),
         "components": ("Which channels", "A bitmask.", None, None),
         "envelope": ("Draw the outer limits", "Marks the extremes.",
                      None, None),
         "filter": ("Which kind of waveform",
                    "lowpass, flat, aflat, chroma, colour and others.",
                    None, None),
         "graticule": ("Draw the reference lines", "The IRE grid.",
                       None, None),
         "opacity": ("How solid the trace is", "0 to 1.",
                     "invisible", "solid"),
         "scale": ("Which scale to label it in",
                   "digital, millivolts, IRE.", None, None)},
    ),
    "vectorscope": (
        "See where the colours sit", "Glitch & noise",
        "Plots the frame's colours on the colour wheel, so a cast or an "
        "illegal colour is a shape rather than an opinion.",
        {"mode": ("Which plot", "grey, colour, 2-colour, 3-colour and "
                  "others.", None, None),
         "x": ("Which channel on the horizontal", "Channel index.",
               None, None),
         "y": ("Which channel on the vertical", "Channel index.",
               None, None),
         "intensity": ("How bright the plot is", "0 to 1.",
                       "faint", "solid"),
         "envelope": ("Draw the outer limits", "Marks the extremes.",
                      None, None),
         "graticule": ("Draw the reference targets",
                       "The colour-bar boxes.", None, None),
         "opacity": ("How solid the plot is", "0 to 1.",
                     "invisible", "solid"),
         "colorspace": ("Which standard to plot against",
                        "601 or 709.", None, None)},
    ),
    "limiter": (
        "Clamp every value into a range", "Glitch & noise",
        "Anything below the floor becomes the floor and anything above the "
        "ceiling becomes the ceiling - legal-range clipping, and a hard "
        "poster effect if you squeeze it.",
        {"min": ("Floor", "Values below this are raised.",
                 "nothing clamped", "everything white"),
         "max": ("Ceiling", "Values above this are lowered.",
                 "everything black", "nothing clamped"),
         "planes": ("Which channels", "A bitmask.", None, None)},
    ),

    # ----------------------------------------------------- Cut & crop
    "crop": (
        "Cut a rectangle out of the frame", "Cut & crop",
        "Keeps the piece of the picture you name and throws away the rest; "
        "the position can be an expression, so the crop can move.",
        {"w": ("Width", "An expression; `iw` is the input width.",
               None, None),
         "h": ("Height", "An expression; `ih` is the input height.",
               None, None),
         "x": ("Left edge", "An expression; `(iw-ow)/2` centres it.",
               None, None),
         "y": ("Top edge", "An expression; `(ih-oh)/2` centres it.",
               None, None),
         "keep_aspect": ("Keep the shape", "Adjusts the pixel aspect "
                         "instead of the frame.", None, None),
         "exact": ("Crop exactly", "Even where that lands off a chroma "
                   "boundary.", None, None)},
    ),
    "cropdetect": (
        "Find the black bars", "Cut & crop",
        "Watches the picture and reports the crop that would remove the "
        "letterbox, without changing anything itself.",
        {"limit": ("How dark counts as black", "0 is pure black only.",
                   "only pure black", "anything dim"),
         "round": ("Round the result to a multiple of",
                   "16 keeps encoders happy.", "exact", "coarse"),
         "reset_count": ("Start again every N frames",
                         "0 never resets.", "never reset", "reset often"),
         "skip": ("Frames to ignore at the start", "Frame count.",
                  "none", "many"),
         "mode": ("What to look for", "Black bars, or any flat border.",
                  None, None)},
    ),
    "pad": (
        "Put the frame on a bigger canvas", "Cut & crop",
        "Grows the frame and places the picture inside it, which is how a "
        "letterbox or a border is made.",
        {"width": ("Canvas width", "An expression; `iw` is the input width.",
                   None, None),
         "height": ("Canvas height", "An expression; `ih` is the input "
                    "height.", None, None),
         "x": ("Where the picture sits, across", "An expression.",
               None, None),
         "y": ("Where the picture sits, down", "An expression.",
               None, None),
         "color": ("Canvas colour", "A colour name or #rrggbb.",
                   None, None),
         "eval": ("When the sizes are worked out",
                  "Once, or every frame.", None, None),
         "aspect": ("Canvas shape", "Sets the size from a ratio instead.",
                    None, None)},
    ),
    "scale": (
        "Resize", "Cut & crop",
        "Changes the frame's size, with a choice of how the new pixels are "
        "worked out - and `neighbor` is the one that keeps hard blocks hard "
        "instead of interpolating them away.",
        {"w": ("Width", "An expression; -2 keeps the shape and stays even.",
               None, None),
         "h": ("Height", "An expression; -2 keeps the shape.", None, None),
         "flags": ("How the pixels are worked out",
                   "`neighbor` is hard, `bicubic` is smooth, `lanczos` is "
                   "sharp.", None, None),
         "in_color_matrix": ("Input colour standard", "e.g. bt709.",
                             None, None),
         "out_color_matrix": ("Output colour standard", "e.g. bt709.",
                              None, None),
         "in_range": ("Input range", "Full or limited.", None, None),
         "out_range": ("Output range", "Full or limited.", None, None),
         "force_original_aspect_ratio": ("Keep the shape",
                                         "Fit inside or cover.", None, None),
         "eval": ("When the size is worked out", "Once, or every frame.",
                  None, None)},
    ),
    "fillborders": (
        "Fill the edge pixels in", "Cut & crop",
        "Replaces a band around the edge with a smear, a mirror or a flat "
        "colour, which is how you hide a dirty edge from a bad transfer.",
        {"left": ("How many pixels on the left", "Count.",
                  "none", "a wide band"),
         "right": ("How many pixels on the right", "Count.",
                   "none", "a wide band"),
         "top": ("How many pixels at the top", "Count.",
                 "none", "a wide band"),
         "bottom": ("How many pixels at the bottom", "Count.",
                    "none", "a wide band"),
         "mode": ("What to fill with",
                  "smear, mirror, fixed colour, reflect, wrap, fade, "
                  "margins.", None, None),
         "color": ("Fill colour", "When the mode is a fixed colour.",
                   None, None)},
    ),
    "setsar": (
        "Declare the pixel shape", "Cut & crop",
        "Says how wide a pixel is relative to its height, without touching "
        "any pixel - how anamorphic footage is told to un-squeeze itself.",
        {"sar": ("Pixel aspect ratio", "e.g. `1/1` or `16/15`.",
                 None, None),
         "max": ("Largest denominator to use", "When it has to approximate.",
                 None, None)},
    ),
    "setdar": (
        "Declare the frame shape", "Cut & crop",
        "Says what shape the whole frame should display as, and the pixel "
        "shape is worked out from it.",
        {"dar": ("Frame aspect ratio", "e.g. `16/9`.", None, None),
         "max": ("Largest denominator to use", "When it has to approximate.",
                 None, None)},
    ),
}
