import {
  Scene,
  MeshBuilder,
  Mesh,
  StandardMaterial,
  Color3,
  Texture,
  Vector3
} from "@babylonjs/core";

import type { BlockDefinition } from "../types/BlockDefination";

export class BlockLibrary {
  private static blocks = new Map<string, BlockDefinition>();
  private static numericMap: BlockDefinition[] = [];
  private static idToIndex = new Map<string, number>();


  public static register(def: BlockDefinition): void {
  const normalized = this.normalizeTextures(def);
  this.blocks.set(def.id, normalized);
  const id = this.numericMap.length;
  this.idToIndex.set(def.id, id);
  this.numericMap.push(normalized);
}
public static getByNumericId(id: number): BlockDefinition | undefined {
  return this.numericMap[id];
}

public static getNumericId(blockId: string): number {
  const index = this.idToIndex.get(blockId);
  if (index === undefined) {
    throw new Error(`Block '${blockId}' is not registered.`);
  }
  return index;
}


  public static get(id: string): BlockDefinition {
    const block = this.blocks.get(id);
    if (!block) throw new Error(`Block '${id}' not registered`);
    return block;
  }

  public static createMesh(id: string, scene: Scene): Mesh {
    const block = this.get(id);

    const mesh = MeshBuilder.CreateBox("block-" + id, { size: 1 }, scene);
    mesh.isPickable = true;
    mesh.checkCollisions = block.collider !== false;

    const mat = new StandardMaterial(`${id}-mat`, scene);
    mat.disableLighting = true;
    mat.emissiveColor = new Color3(0.5, 0.5, 0.5);

    if (block.color) {
      const [r, g, b] = block.color;
      mat.diffuseColor = new Color3(r, g, b);
      mat.emissiveColor = new Color3(r, g, b);
    } else {
      mat.diffuseColor = new Color3(0.5, 0.5, 0.5);
    }

    if (typeof block.textures === "string" && block.textures !== "") {
      mat.diffuseTexture = new Texture(block.textures, scene);
    }

    mesh.material = mat;

    const outline = this.createBlockOutline(scene, 1);
    outline.parent = mesh;
      if (block.collider) {
    const debugBox = MeshBuilder.CreateBox(`debug-collider-${id}`, { size: 1.01 }, scene);
    const debugMat = new StandardMaterial(`debugMat-${id}`, scene);
    debugMat.wireframe = true;
    debugMat.emissiveColor = new Color3(1, 0, 0); // Red wireframe
    debugBox.material = debugMat;

    debugBox.isPickable = false;
    debugBox.parent = mesh;
    debugBox.position.set(1, 1, 1); // Aligned with parent mesh
  }

    return mesh;
  }

  public static createBlockOutline(scene: Scene, size: number): Mesh {
    const s = size / 2;

    const points = [
      // Bottom square
      [new Vector3(-s, -s, -s), new Vector3(s, -s, -s)],
      [new Vector3(s, -s, -s), new Vector3(s, -s, s)],
      [new Vector3(s, -s, s), new Vector3(-s, -s, s)],
      [new Vector3(-s, -s, s), new Vector3(-s, -s, -s)],

      // Top square
      [new Vector3(-s, s, -s), new Vector3(s, s, -s)],
      [new Vector3(s, s, -s), new Vector3(s, s, s)],
      [new Vector3(s, s, s), new Vector3(-s, s, s)],
      [new Vector3(-s, s, s), new Vector3(-s, s, -s)],

      // Vertical lines
      [new Vector3(-s, -s, -s), new Vector3(-s, s, -s)],
      [new Vector3(s, -s, -s), new Vector3(s, s, -s)],
      [new Vector3(s, -s, s), new Vector3(s, s, s)],
      [new Vector3(-s, -s, s), new Vector3(-s, s, s)],
    ];

    const outline = MeshBuilder.CreateLineSystem("blockOutline", {
      lines: points,
      updatable: false,
    }, scene);

    outline.color = new Color3(0, 0, 0);
    outline.isPickable = false;
    outline.scaling.set(1, 1.01, 1);
    return outline;
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
