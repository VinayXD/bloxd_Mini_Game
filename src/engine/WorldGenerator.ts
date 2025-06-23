import {
  Scene,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Matrix,
} from "@babylonjs/core";
import { createNoise2D } from "simplex-noise";

export class WorldGenerator {
  private scene!: Scene;
  private noise2D = createNoise2D();

  constructor(scene: Scene) {}

  public generateTerrain(width = 30, depth = 30, blockSize = 1, maxHeight = 8) {
    const halfWidth = width / 2;
    const halfDepth = depth / 2;
    const scale = 0.1;

    // Base block material (e.g., grass)
    const blockMat = new StandardMaterial("blockMat", this.scene);
    blockMat.diffuseColor = new Color3(0.4, 0.8, 0.4);

    // Base block mesh (for fill)
    const baseBlock = MeshBuilder.CreateBox("block", { size: blockSize }, this.scene);
    baseBlock.material = blockMat;
    baseBlock.isPickable = false;

    // Black wireframe outline material
    const outlineMat = new StandardMaterial("outlineMat", this.scene);
    outlineMat.emissiveColor = new Color3(0, 0, 0); // black
    // outlineMat.wireframe = true;
    //outlineMat.alpha = 1; // fully visible lines

    // Outline mesh (slightly bigger)
    const outlineBlock = MeshBuilder.CreateBox("outline", { size: blockSize * 1.01 }, this.scene);
    outlineBlock.material = outlineMat;
    outlineBlock.isPickable = false;

    const instanceMatrices: Matrix[] = [];
    const outlineMatrices: Matrix[] = [];

    // Create a height map first
    const heightMap: number[][] = [];

    for (let x = 0; x < width; x++) {
      heightMap[x] = [];
      for (let z = 0; z < depth; z++) {
        const noiseVal = this.noise2D(x * scale, z * scale);
        const height = Math.floor(((noiseVal + 1) / 2) * maxHeight);
        heightMap[x][z] = height;
      }
    }

    // Only create visible (exposed) blocks
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < depth; z++) {
        const h = heightMap[x][z];
        for (let y = 0; y < h; y++) {
          if (!this.isExposed(x, y, z, heightMap, width, depth)) continue;

          const matrix = Matrix.Translation(
            (x - halfWidth) * blockSize,
            y * blockSize,
            (z - halfDepth) * blockSize
          );
          instanceMatrices.push(matrix);
          outlineMatrices.push(matrix); // same positions
        }
      }
    }

    baseBlock.thinInstanceAdd(instanceMatrices);
    outlineBlock.thinInstanceAdd(outlineMatrices);
  }

  private isExposed(x: number, y: number, z: number, map: number[][], width: number, depth: number): boolean {
    const neighbors = [
      [x + 1, z],
      [x - 1, z],
      [x, z + 1],
      [x, z - 1],
    ];

    for (const [nx, nz] of neighbors) {
      if (nx < 0 || nx >= width || nz < 0 || nz >= depth) return true;
      if (map[nx][nz] <= y) return true;
    }

    return y === map[x][z] - 1;
  }
}
