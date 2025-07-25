import {
  Scene,
  MeshBuilder,
  Mesh,
  StandardMaterial,
  Color3
} from "@babylonjs/core";

import type { BlockDefinition } from "../types/BlockDefination"; // or inline if not separate

export class BlockLibrary {
  private static blocks = new Map<string, BlockDefinition>();

  public static register(def: BlockDefinition): void {
    const normalized = this.normalizeTextures(def);
    this.blocks.set(def.id, normalized);
  }

  public static get(id: string): BlockDefinition {
    const block = this.blocks.get(id);
    if (!block) throw new Error(`Block '${id}' not registered`);
    return block;
  }

  // 🆕 Create mesh for a block (basic cube)
  public static createMesh(id: string, scene: Scene): Mesh {
    const block = this.get(id);

    const mesh = MeshBuilder.CreateBox(id, { size: 1 }, scene); // 1x1x1
    mesh.isPickable = true;

    if (block.collider === false) {
      mesh.checkCollisions = false;
    }

    // ✅ Simple gray color material
const mat = new StandardMaterial(`${id}-mat`, scene);
if (block.color) {
  const [r, g, b] = block.color;
  mat.diffuseColor = new Color3(r, g, b);
} else {
  mat.diffuseColor = new Color3(0.5, 0.5, 0.5); // default gray
}
mesh.material = mat;


    return mesh;
  }

  private static normalizeTextures(def: BlockDefinition): BlockDefinition {
    const tex = def.textures as any;

    if (typeof tex === "string") return def;

    const expanded: Record<string, string> = { ...tex };

    if ("side" in tex && tex.side) {
      for (const face of ["left", "right", "front", "back"]) {
        if (!expanded[face]) expanded[face] = tex.side;
      }
      delete expanded["side"];
    }

    return {
      ...def,
      textures: expanded
    };
  }
}
