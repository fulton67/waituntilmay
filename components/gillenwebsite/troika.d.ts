// troika-three-text ships no types; drei types its own <Text>. Only what Rolodex.tsx uses of BatchedText.
declare module "troika-three-text" {
  import type { Mesh } from "three";
  /** draws every troika Text added to it in one call; members are kept in _members, not as children */
  export class BatchedText extends Mesh {
    _members: Map<Mesh, unknown>;
  }
}
