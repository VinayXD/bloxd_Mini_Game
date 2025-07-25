// PhysicsGridManager.ts
import {
  Scene,
  Vector3,
  MeshBuilder,
  Mesh,
  PhysicsImpostor
} from "@babylonjs/core";

export class PhysicsGridManager {
  private scene: Scene;
  private blockSize: number;
  private radius: number;
  private height: number;

  private grid: Map<string, Mesh> = new Map();
  private playerLastCell: Vector3 = new Vector3(Number.NaN, Number.NaN, Number.NaN);

  constructor(scene: Scene, blockSize = 1, radius = 6, height = 3) {
    this.scene = scene;
    this.blockSize = blockSize;
    this.radius = radius;
    this.height = height;
  }

  // Call this every frame with player position
  public update(playerPosition: Vector3, isBlockSolid: (x: number, y: number, z: number) => boolean): void {
    const playerCell = this.toCellCoord(playerPosition);
    if (playerCell.equals(this.playerLastCell)) return;
    this.playerLastCell.copyFrom(playerCell);

    const newGrid = new Map<string, Mesh>();

    for (let dx = -this.radius; dx <= this.radius; dx++) {
      for (let dz = -this.radius; dz <= this.radius; dz++) {
        for (let dy = 0; dy < this.height; dy++) {
          const x = playerCell.x + dx;
          const y = dy;
          const z = playerCell.z + dz;

          if (!isBlockSolid(x, y, z)) continue;

          const key = `${x},${y},${z}`;

          if (this.grid.has(key)) {
            // Reuse existing collider
            newGrid.set(key, this.grid.get(key)!);
            this.grid.delete(key);
          } else {
            // Create new collider
            const mesh = MeshBuilder.CreateBox("physBox", {
              size: this.blockSize
            }, this.scene);

            mesh.position = new Vector3(
              x * this.blockSize,
              y * this.blockSize,
              z * this.blockSize
            );
            mesh.isVisible = true;
            mesh.physicsImpostor = new PhysicsImpostor(mesh, PhysicsImpostor.BoxImpostor, {
              mass: 0,
              restitution: 0
            }, this.scene);

            newGrid.set(key, mesh);
          }
        }
      }
    }

    // Dispose unused colliders
    for (const [key, mesh] of this.grid) {
      mesh.physicsImpostor?.dispose();
      mesh.dispose();
    }

    this.grid = newGrid;
  }

  private toCellCoord(position: Vector3): Vector3 {
    return new Vector3(
      Math.floor(position.x / this.blockSize),
      Math.floor(position.y / this.blockSize),
      Math.floor(position.z / this.blockSize)
    );
  }

  public dispose(): void {
    for (const mesh of this.grid.values()) {
      mesh.physicsImpostor?.dispose();
      mesh.dispose();
    }
    this.grid.clear();
  }
}