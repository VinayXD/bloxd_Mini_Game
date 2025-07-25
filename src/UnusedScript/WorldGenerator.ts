import { Scene, Matrix , Vector3,Mesh} from "@babylonjs/core";
import { createNoise2D } from "simplex-noise";
import { BlockLibrary } from "./BlockLibrary"; 
import { InstancedMesh } from "@babylonjs/core";




export class WorldGenerator {
  private scene: Scene;
  private noise2D = createNoise2D();

  constructor(scene: Scene) {
    this.scene = scene;
    BlockLibrary.init(scene); // 👈 Initialize shared assets
  }
  public  heightMap: number[][] = [];
  public blockPositions: Vector3[] = [];
  public generateTerrain(width = 30, depth = 30, blockSize = 1, maxHeight = 8) {
    const halfWidth = width / 2;
    const halfDepth = depth / 2;
    const scale = 0.1;

    const instanceMatrices: Matrix[] = [];
    const outlineMatrices: Matrix[] = [];

    

    for (let x = 0; x < width; x++) {
      this.heightMap[x] = [];
      for (let z = 0; z < depth; z++) {
        const noiseVal = this.noise2D(x * scale, z * scale);
        const height = Math.floor(((noiseVal + 1) / 2) * maxHeight);
        this.heightMap[x][z] = height;
      }
    }

    for (let x = 0; x < width; x++) {
      for (let z = 0; z < depth; z++) {
        const h = this.heightMap[x][z];
        for (let y = 0; y < h; y++) {
          if (!this.isExposed(x, y, z, this.heightMap, width, depth)) continue;

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
  public isSolid(x: number, y: number, z: number): boolean {
  if (x < 0 || x >= this.heightMap.length) return false;
  if (z < 0 || z >= this.heightMap[0].length) return false;
  return y < this.heightMap[x][z]; // Any block below height is solid
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

private activeColliders: InstancedMesh[] = [];
private colliderRadius = 5; // radius in world units

public updateCollidersAroundPlayer(playerPos: Vector3) {
  // Dispose old colliders
  this.activeColliders.forEach(c => c.dispose());
  this.activeColliders = [];

  for (const pos of this.blockPositions) {
    if (Vector3.DistanceSquared(pos, playerPos) <= this.colliderRadius ** 2) {
      const instance = BlockLibrary.baseBlock.createInstance("colliderBlock");
      instance.position.copyFrom(pos);
      instance.checkCollisions = true;
      instance.isVisible = true;
      this.activeColliders.push(instance);
    }
  }
}

}
