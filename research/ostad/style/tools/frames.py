"""M1: decode EVERY frame at native fps (ffmpeg -fps_mode passthrough; no -r, no sampling) and count them against ffprobe
-count_frames. Output frames.json: fps, frame_count (ffprobe), decoded (our count), size, duration, and per-frame mean luma as
a decode fingerprint (one row per frame)."""
from common import frames, run


def m1(ref, vid, path, P):
    luma = [round(float(f.mean()), 2) for _, f in frames(path, gray=True)]
    return {"fps": P["fps"], "frame_count": P["frame_count"], "decoded": len(luma), "width": P["width"], "height": P["height"],
            "duration": P["duration"], "match": len(luma) == P["frame_count"], "rows": luma}


if __name__ == "__main__":
    run("frames.json", m1)
