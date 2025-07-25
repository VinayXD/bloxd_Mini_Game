// BlockLibrary.ts
import {
  Scene,
  StandardMaterial,
  Color3,
  MeshBuilder,
  Mesh,
  Vector3,
} from "@babylonjs/core";

export class BlockLibrary {
  public static blockMaterial: StandardMaterial;
  public static outlineMaterial: StandardMaterial;
  public static baseBlock: Mesh;
  public static outlineBlock: Mesh;
  private static initialized = false;

  public static init(scene: Scene, blockSize = 1): void {
    if (this.initialized) return;

    // ✅ Base block material (basic diffuse, light-reactive)
    this.blockMaterial = new StandardMaterial("blockMat", scene);
    this.blockMaterial.diffuseColor = new Color3(0.4, 0, 0.4); // green
    this.blockMaterial.backFaceCulling = true;

    // ✅ Outline material (black lines, no lighting)
    this.outlineMaterial = new StandardMaterial("outlineMat", scene);
    this.outlineMaterial.emissiveColor = new Color3(0, 0, 0);
    this.outlineMaterial.disableLighting = true;

    // 🧱 Base block mesh (instanced cube)
    this.baseBlock = MeshBuilder.CreateBox("block", { size: blockSize }, scene);
    this.baseBlock.material = this.blockMaterial;
    this.baseBlock.isPickable = false;

    // 🧭 Outline block (lines only, no diagonals)
    this.outlineBlock = this.createBlockOutline(scene, blockSize * 1.01);
    this.outlineBlock.material = this.outlineMaterial;
    this.outlineBlock.isPickable = false;

    this.initialized = true;
  }

  // 🔳 Create custom cube edge lines (no diagonals)
  private static createBlockOutline(scene: Scene, size: number): Mesh {
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

    return MeshBuilder.CreateLineSystem("blockOutline", {
      lines: points,
      updatable: false,
    }, scene);
  }
}
