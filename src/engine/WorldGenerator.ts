import { Scene, Matrix } from "@babylonjs/core";
import { createNoise2D } from "simplex-noise";
import { BlockLibrary } from "./BlockLibrary"; // 👈 import

export class WorldGenerator {
  private scene: Scene;
  private noise2D = createNoise2D();

  constructor(scene: Scene) {
    this.scene = scene;
    BlockLibrary.init(scene); // 👈 Initialize shared assets
  }

  public generateTerrain(width = 30, depth = 30, blockSize = 1, maxHeight = 8) {
    const halfWidth = width / 2;
    const halfDepth = depth / 2;
    const scale = 0.1;

    const instanceMatrices: Matrix[] = [];
    const outlineMatrices: Matrix[] = [];

    const heightMap: number[][] = [];

    for (let x = 0; x < width; x++) {
      heightMap[x] = [];
      for (let z = 0; z < depth; z++) {
        const noiseVal = this.noise2D(x * scale, z * scale);
        const height = Math.floor(((noiseVal + 1) / 2) * maxHeight);
        heightMap[x][z] = height;
      }
    }

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
          outlineMatrices.push(matrix);
        }
      }
    }

    BlockLibrary.baseBlock.thinInstanceAdd(instanceMatrices);
    BlockLibrary.outlineBlock.thinInstanceAdd(outlineMatrices);
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
