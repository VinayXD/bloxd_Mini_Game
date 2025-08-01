import { Scene, Vector3, Mesh, MeshBuilder } from "@babylonjs/core";
import { Color3, StandardMaterial, Texture } from "@babylonjs/core";
import { BlockLibrary } from "../DraftScript/BlockLibrary";

const CHUNK_SIZE = 16;

export class VoxelChunk {
  static BlockLibrary = BlockLibrary;
  readonly size = CHUNK_SIZE;
  blocks: Uint8Array = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE);
  mesh?: Mesh;
  scene: Scene;
  chunkPosition: Vector3;
  private static sharedOutlineMesh: Mesh | null = null;

  constructor(scene: Scene, chunkPosition: Vector3) {
    this.scene = scene;
    this.chunkPosition = chunkPosition;
  }

  private index(x: number, y: number, z: number): number {
    return x + this.size * (y + this.size * z);
  }

  setBlock(x: number, y: number, z: number, blockId: number): void {
    if (!this.inBounds(x, y, z)) return;
    this.blocks[this.index(x, y, z)] = blockId;
  }

  getBlock(x: number, y: number, z: number): number {
    if (!this.inBounds(x, y, z)) return 0;
    return this.blocks[this.index(x, y, z)];
  }

  private inBounds(x: number, y: number, z: number): boolean {
    return x >= 0 && y >= 0 && z >= 0 && x < this.size && y < this.size && z < this.size;
  }

  public isBlockSolid(x: number, y: number, z: number): boolean {
    const id = this.getBlock(x, y, z);
    const def = BlockLibrary.getByNumericId(id);
    return !!def && def.collider !== false;
  }

  public addBlockInstance(x: number, y: number, z: number, id: number): void {
  const def = BlockLibrary.getByNumericId(id);
  if (!def) return;

  const blockPos = new Vector3(
    x + this.chunkPosition.x * this.size + 0.5,
    y + this.chunkPosition.y * this.size + 0.5,
    z + this.chunkPosition.z * this.size + 0.5
  );

  // ===== Shared block template =====
  let sharedBlock = this.scene.getMeshByName(`block-template-${id}`) as Mesh | null;
  if (!sharedBlock) {
    sharedBlock = MeshBuilder.CreateBox(`block-template-${id}`, { size: 1 }, this.scene);
    sharedBlock.isVisible = false;
    sharedBlock.checkCollisions = true;

    const mat = new StandardMaterial(`mat-${id}`, this.scene);
mat.disableLighting = true; // 💡 Ignore scene lighting
mat.emissiveColor = new Color3(1, 1, 1); // Always fully visible

if (def.color) {
  const color = Color3.FromArray(def.color);
  mat.diffuseColor = color;
  mat.emissiveColor = color.clone(); // Optional: match the block's color
}

if (typeof def.textures === "string" && def.textures !== "") {
  const texture = new Texture(def.textures, this.scene);
  mat.diffuseTexture = texture;
  mat.emissiveTexture = texture; // ✅ Use texture as self-lit
}

    sharedBlock.material = mat;
  }

  const blockInstance = sharedBlock.createInstance(`block-${x}-${y}-${z}`);
  blockInstance.position.copyFrom(blockPos);
  blockInstance.checkCollisions = true;

  // ===== Outline instancing =====
  if (!VoxelChunk.sharedOutlineMesh) {
    VoxelChunk.sharedOutlineMesh = VoxelChunk.createBlockOutline(this.scene, 1);
    VoxelChunk.sharedOutlineMesh.name = "block-outline-template";
    VoxelChunk.sharedOutlineMesh.isVisible = false;
  }

  const outlineInstance = VoxelChunk.sharedOutlineMesh.createInstance(`outline-${x}-${y}-${z}`);
  outlineInstance.parent = blockInstance;
  outlineInstance.position.set(0, 0, 0); // local to parent
  outlineInstance.isVisible = true;
  outlineInstance.isPickable = false;
}


  public rebuildMesh(): void {
    if (this.mesh) {
      this.mesh.dispose();
      this.mesh = undefined;
    }

    // Dispose all instances in the chunk
    const baseName = `${this.chunkPosition.x},${this.chunkPosition.y},${this.chunkPosition.z}`;
    const toRemove = this.scene.meshes.filter(m =>
      m.name.includes(baseName) || m.name.startsWith("block-") || m.name.startsWith("outline-")
    );

    for (const mesh of toRemove) {
      if (mesh !== VoxelChunk.sharedOutlineMesh && !mesh.name.startsWith("block-template")) {
        mesh.dispose();
      }
    }

    let total = 0;

    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        for (let z = 0; z < this.size; z++) {
          const id = this.getBlock(x, y, z);
          if (id === 0) continue;
          this.addBlockInstance(x, y, z, id);
          total++;
        }
      }
    }

    console.log(`✅ Chunk rebuilt with ${total} block instances`);
  }

  private static createBlockOutline(scene: Scene, size: number): Mesh {
    const s = size / 2;

    const points = [
      [new Vector3(-s, -s, -s), new Vector3(s, -s, -s)],
      [new Vector3(s, -s, -s), new Vector3(s, -s, s)],
      [new Vector3(s, -s, s), new Vector3(-s, -s, s)],
      [new Vector3(-s, -s, s), new Vector3(-s, -s, -s)],
      [new Vector3(-s, s, -s), new Vector3(s, s, -s)],
      [new Vector3(s, s, -s), new Vector3(s, s, s)],
      [new Vector3(s, s, s), new Vector3(-s, s, s)],
      [new Vector3(-s, s, s), new Vector3(-s, s, -s)],
      [new Vector3(-s, -s, -s), new Vector3(-s, s, -s)],
      [new Vector3(s, -s, -s), new Vector3(s, s, -s)],
      [new Vector3(s, -s, s), new Vector3(s, s, s)],
      [new Vector3(-s, -s, s), new Vector3(-s, s, s)],
    ];

    const outline = MeshBuilder.CreateLineSystem("blockOutline", {
      lines: points,
      updatable: false,
    }, scene);

    outline.isPickable = false;
    outline.visibility = 0.5;
    outline.color = new Color3(0, 0, 0);
    outline.isVisible = false;

    return outline;
  }
}
