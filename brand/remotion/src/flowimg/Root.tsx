import { AbsoluteFill, Composition } from "remotion";
import { FlowingImage, type FlowPiece } from "../components/FlowingImage";

// The user's own gradients, moving (research/ostad/style/gradients/MOVING.md). Public dir = research/ostad/style/gradients/ref.
// npx remotion render src/flowimg/index.ts Flow out.mp4 --gl=angle --public-dir=../../research/ostad/style/gradients/ref \
//   --props='{"piece":"cardA","w":720,"h":1224,"sat":1}'
// 30 fps, 12 s loop = 360 frames; frame 360 would equal frame 0.
export const PIECES: Record<string, FlowPiece & { native: [number, number] }> = {
  // ref1: two rounded cards; each cropped just inside its rounded corners (inset 32 px clears the ~80 px corner radius)
  cardA: { src: "ref1_cards.jpg", crop: [83, 188, 422, 781], native: [678, 1186] },
  cardB: { src: "ref1_cards.jpg", crop: [569, 188, 909, 782], native: [680, 1188], line: { x1: 832, y1: 176, x2: 940, y2: 540, w: 10 } },
  // ref2: the vertical blue column, whole image
  column: { src: "ref2_column.jpg", crop: [0, 0, 372, 796], native: [744, 1592], anchor: [0.5, 0.8] }, // crops keep the violet base
  // ref3: the frosted tile; flow only well inside the tile, its edges and the ground stay still
  tile: { src: "ref3_tile.jpg", crop: [0, 0, 997, 976], native: [996, 976], pad: 60,
    inside: { x0: 139, y0: 153, x1: 891, y1: 895, r: 150, feather: 70 } },
};

type P = { piece: string; w: number; h: number; sat: number; debug?: boolean };
const Flow: React.FC<P> = ({ piece, w, h, sat, debug }) => {
  const pc = PIECES[piece];
  // the tile keeps the whole tile in frame (contain, the plain ground continues around it); everything else is cover-fit
  return <AbsoluteFill style={{ background: "#000" }}>
    <FlowingImage piece={pc} width={w} height={h} sat={sat} debug={debug} fit={pc.pad ? "contain" : "cover"} />
  </AbsoluteFill>;
};
// side-by-side check: left = amp 0 (the untouched source through the same pipeline), right = moving
const Compare: React.FC<P> = ({ piece, w, h }) => {
  const pc = PIECES[piece];
  return <AbsoluteFill style={{ background: "#000" }}>
    <FlowingImage piece={pc} width={w} height={h} amp={0} fit={pc.pad ? "contain" : "cover"} />
    <FlowingImage piece={pc} width={w} height={h} fit={pc.pad ? "contain" : "cover"} style={{ left: w + 16 }} />
  </AbsoluteFill>;
};

export const FlowRoot: React.FC = () => (
  <>
    <Composition id="Flow" component={Flow} width={720} height={1224} fps={30} durationInFrames={360}
      defaultProps={{ piece: "cardA", w: 726, h: 1234, sat: 1 } as P}
      calculateMetadata={({ props }) => ({ width: props.w, height: props.h })} />
    <Composition id="Compare" component={Compare} width={720} height={1224} fps={30} durationInFrames={360}
      defaultProps={{ piece: "cardB", w: 728, h: 1236, sat: 1 } as P}
      calculateMetadata={({ props }) => ({ width: props.w * 2 + 16, height: props.h })} />
  </>
);
