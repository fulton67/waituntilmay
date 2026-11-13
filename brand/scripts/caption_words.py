"""Word onsets for the captions, measured on the delivered audio (v3: client "the captions are laggy").
Aligns every caption word (props captions, output seconds) to a faster-whisper transcript of the edit's own audio (output seconds,
scripts/video_transcribe.py run on public/<slug>/audio.m4a), in order, by normalised spelling; a word the recogniser split or merged
takes the onset of its neighbours (interpolated). Writes edits/<slug>/yt_words.json: [[onset_s, ...] per caption], read by
remotion/scripts/prepare.cjs into props_yt.json, where OstadYT cuts each word on at its onset frame.
  python -I caption_words.py <props_yt.json> <out_transcript.json> <yt_words.json>"""
import json, re, sys
caps = json.load(open(sys.argv[1]))["spec"]["captions"]
W = [w for s in json.load(open(sys.argv[2]))["segments"] for w in s["words"]]
n = lambda x: re.sub(r"[^a-z0-9]", "", x.lower())
out, j, hit, tot = [], 0, 0, 0
for c in caps:
    row = []
    for w in c["text"].split():
        tot += 1; k0 = None
        for k in range(j, min(j + 6, len(W))):
            if n(W[k]["w"]) == n(w) or (len(n(w)) > 3 and (n(W[k]["w"]).startswith(n(w)) or n(w).startswith(n(W[k]["w"])))):
                k0 = k; break
        if k0 is None: row.append(None)
        else: row.append(round(W[k0]["s"], 3)); j = k0 + 1; hit += 1
    out.append(row)
# fill gaps: first word = caption start if unknown; others interpolated between known neighbours (or the caption's span)
for c, row in zip(caps, out):
    if row[0] is None: row[0] = round(c["from"], 3)
    for i in range(1, len(row)):
        if row[i] is None:
            nxt = next((row[k] for k in range(i + 1, len(row)) if row[k] is not None), c["to"])
            row[i] = round(row[i - 1] + (nxt - row[i - 1]) / 2, 3)
        row[i] = max(row[i], row[i - 1])
json.dump(out, open(sys.argv[3], "w"))
print(f"{hit}/{tot} words matched -> {sys.argv[3]}")
