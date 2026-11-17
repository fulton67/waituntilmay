import { Composition, staticFile } from "remotion";
import { LAB_DUR, Oct14Lab, type LabProps } from "./Lab";

// Oct14Lab: the devices on placeholder media (1080x1920, 24 fps: brand/motion/RULES.md). Points come from the placeholder's
// points.json, the same schema as the real face track. NOT FOR POSTING until patient consent = yes.
export const Oct14Root: React.FC = () => (
  <>
    <Composition id="Oct14Lab" component={Oct14Lab} width={1080} height={1920} fps={24} durationInFrames={288} defaultProps={{ item: "pip" } as LabProps}
      calculateMetadata={async ({ props }) => ({
        durationInFrames: LAB_DUR[props.item],
        props: { ...props, points: props.points ?? (await (await fetch(staticFile("oct14/placeholder/points.json"))).json()) },
      })} />
  </>
);
