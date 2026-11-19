import { Composition } from "remotion";
import { FluidGlassSphere, PALETTES } from "../components/FluidGlass";
import { AppArrow, AppEndCard, AppLoupe, AppSlider } from "./Apps";

// FluidGlass (research/ostad/style/fluid/README.md). 30 fps; the sphere loops are 8 s and seamless (time on a noise circle).
// Render with GPU WebGL: npx remotion render src/fluid/index.ts SpherePost out.mp4 --gl=angle --props='{"palette":"brand"}'
type SP = { palette: keyof typeof PALETTES };
const Sphere: React.FC<SP & { w: number; h: number }> = ({ palette, w, h }) => (
  <FluidGlassSphere width={w} height={h} palette={palette} cy={h * (h > 1500 ? 0.46 : 0.48)} r={w * (h > 1500 ? 0.4 : 0.36)} />
);
const SpherePost: React.FC<SP> = (p) => <Sphere {...p} w={1080} h={1350} />;
const SphereReel: React.FC<SP> = (p) => <Sphere {...p} w={1080} h={1920} />;

export const FluidRoot: React.FC = () => (
  <>
    <Composition id="SpherePost" component={SpherePost} width={1080} height={1350} fps={30} durationInFrames={240} defaultProps={{ palette: "ref" } as SP} />
    <Composition id="SphereReel" component={SphereReel} width={1080} height={1920} fps={30} durationInFrames={240} defaultProps={{ palette: "ref" } as SP} />
    <Composition id="AppLoupe" component={AppLoupe} width={1080} height={1350} fps={30} durationInFrames={120} />
    <Composition id="AppArrow" component={AppArrow} width={1080} height={1350} fps={30} durationInFrames={120} defaultProps={{ variant: "arrow" as "arrow" | "ring" }} />
    <Composition id="AppSlider" component={AppSlider} width={1080} height={1350} fps={30} durationInFrames={120} />
    <Composition id="AppEndCard" component={AppEndCard} width={1080} height={1350} fps={30} durationInFrames={120} defaultProps={{ palette: "paper" as keyof typeof PALETTES }} />
  </>
);
