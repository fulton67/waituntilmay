// FAST LANE sound <-> spring (PLAYBOOK section 3). Two directions, one helper each:
//   sfxAtSettle(): sound follows the spring. A graphic's sound lands on the frame its spring FIRST reaches the target (within 0.5 %),
//                  not the frame it is released. make-reel writes that frame into the timeline; tools/sfx_check.py fails any sound
//                  more than 1 frame from it.
//   useAudioSpring(): motion follows the sound. An audio value per frame (his voice level, a beat, an emphasis word) sets the TARGET of
//                  a spring and the spring drives the graphic. Never map audio straight onto size or position.
import { useCurrentFrame, useVideoConfig } from "remotion";
import { chase, firstReach, type SpringName } from "./spring";

export const sfxAtSettle = (start: number, name: SpringName, fps = 24) => start + firstReach(name, fps);

/**
 * values: one number per composition frame (e.g. voice RMS 0..1 from make-reel's envelope.json). Each frame's value becomes the spring's
 * target from that frame on (piecewise-constant target, solved in closed form by superposition over a trailing window).
 * gain / floor shape the target only (target = gain * max(0, v - floor)); the motion itself is always the spring's.
 */
export const audioSpringAt = (frame: number, values: number[], name: SpringName = "float", fps = 24, gain = 1, floor = 0, window = 96) => {
  if (!values.length) return 0;
  const tgt = (i: number) => gain * Math.max(0, (values[Math.max(0, Math.min(values.length - 1, i))] ?? 0) - floor);
  const f0 = Math.max(0, frame - window);
  const keys: [number, number][] = [[-1e9, tgt(f0 - 1)]];
  for (let i = f0; i <= frame; i++) keys.push([i, tgt(i)]);
  return chase(frame, keys, name, fps);
};

export const useAudioSpring = (values: number[], name: SpringName = "float", opts: { gain?: number; floor?: number } = {}) => {
  const frame = useCurrentFrame(), { fps } = useVideoConfig();
  return audioSpringAt(frame, values, name, fps, opts.gain ?? 1, opts.floor ?? 0);
};
