// troika-three-text ships no types; drei types its own <Text>. Only what the site uses of it.
declare module "troika-three-text" {
  import type { Mesh } from "three";
  /** draws every troika Text added to it in one call; members are kept in _members, not as children */
  export class BatchedText extends Mesh {
    _members: Map<Mesh, unknown>;
    /** polygon offset factor and units for the batch's material (troika sets them each frame) */
    depthOffset: number;
  }
  /** one SDF text mesh (VinylView.tsx: the gatefold panel's type) */
  export class Text extends Mesh {
    text: string;
    font: string;
    fontSize: number;
    anchorX: string | number;
    anchorY: string | number;
    textAlign: string;
    maxWidth: number;
    lineHeight: number | string;
    fillOpacity: number;
    color: number | string;
    overflowWrap: "normal" | "break-word";
    /** after a sync: the laid-out block's bounds in the text's own units, [minX, minY, maxX, maxY] */
    textRenderInfo: { blockBounds: [number, number, number, number] } | null;
    sync(cb?: () => void): void;
    dispose(): void;
  }
}
