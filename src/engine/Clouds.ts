import {
  Scene,
  StandardMaterial,
  Color3,
  Vector3,
  Vector4,
  Mesh,
  VertexData,
  MeshBuilder
} from "@babylonjs/core";

export class Clouds {
  private static instance: Clouds | null = null;
  private scene: Scene;
  private cloudMesh: Mesh | null = null;

  private gridWidth = 64;
  private gridDepth = 64;
  private cellSize = 4;

  private height = 50;
  private speed = 0.01;
  private range = 200;

  private constructor(scene: Scene) {
    this.scene = scene;
    this.spawnOptimizedClouds();
    this.animateCloudMesh();
  }

  public static getInstance(scene: Scene): Clouds {
    if (!Clouds.instance) {
      Clouds.instance = new Clouds(scene);
    }
    return Clouds.instance;
  }

  private createCloudMaterial(): StandardMaterial {
    const mat = new StandardMaterial("cloudMat", this.scene);
    mat.emissiveColor = new Color3(1, 1, 1);
    mat.alpha = 0.2;
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    return mat;
  }

  private spawnOptimizedClouds() {
    const mat = this.createCloudMaterial();
    const sizeX = this.gridWidth;
    const sizeZ = this.gridDepth;
    const cell = this.cellSize;

    let grid: number[][] = Array.from({ length: sizeX }, () =>
      Array.from({ length: sizeZ }, () => Math.random() < 0.45 ? 1 : 0)
    );

    for (let step = 0; step < 3; step++) {
      const newGrid: number[][] = JSON.parse(JSON.stringify(grid));

      for (let x = 0; x < sizeX; x++) {
        for (let z = 0; z < sizeZ; z++) {
          const neighbors = this.countAliveNeighbors(grid, x, z);
          if (grid[x][z] === 1) {
            newGrid[x][z] = neighbors >= 4 ? 1 : 0;
          } else {
            newGrid[x][z] = neighbors >= 5 ? 1 : 0;
          }
        }
      }

      grid = newGrid;
    }

    const positions: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    let indexOffset = 0;

    const addFace = (face: number[][], nx: number, ny: number, nz: number) => {
      const normal = [nx, ny, nz];
      const base = positions.length / 3;
      face.forEach(([x, y, z]) => positions.push(x, y, z));
      normals.push(...normal, ...normal, ...normal, ...normal);
      uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    };

    const half = cell / 2;

    for (let x = 0; x < sizeX; x++) {
      for (let z = 0; z < sizeZ; z++) {
        if (grid[x][z] !== 1) continue;
        const worldX = (x - sizeX / 2) * cell;
        const worldY = this.height;
        const worldZ = (z - sizeZ / 2) * cell;

        const hasLeft = x > 0 && grid[x - 1][z] === 1;
        const hasRight = x < sizeX - 1 && grid[x + 1][z] === 1;
        const hasBack = z > 0 && grid[x][z - 1] === 1;
        const hasFront = z < sizeZ - 1 && grid[x][z + 1] === 1;

        const px = worldX + half;
        const nx = worldX - half;
        const py = worldY + half;
        const ny = worldY - half;
        const pz = worldZ + half;
        const nz = worldZ - half;

        if (!hasRight) addFace([
          [px, ny, nz], [px, ny, pz], [px, py, pz], [px, py, nz]
        ], 1, 0, 0);

        if (!hasLeft) addFace([
          [nx, ny, pz], [nx, ny, nz], [nx, py, nz], [nx, py, pz]
        ], -1, 0, 0);

        if (!hasFront) addFace([
          [nx, ny, pz], [px, ny, pz], [px, py, pz], [nx, py, pz]
        ], 0, 0, 1);

        if (!hasBack) addFace([
          [px, ny, nz], [nx, ny, nz], [nx, py, nz], [px, py, nz]
        ], 0, 0, -1);

        addFace([
          [nx, py, nz], [px, py, nz], [px, py, pz], [nx, py, pz]
        ], 0, 1, 0);

        addFace([
          [nx, ny, pz], [px, ny, pz], [px, ny, nz], [nx, ny, nz]
        ], 0, -1, 0);
      }
    }

    const vertexData = new VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.normals = normals;
    vertexData.uvs = uvs;

    const mesh = new Mesh("cloudMesh", this.scene);
    vertexData.applyToMesh(mesh);
    mesh.material = mat;
    this.cloudMesh = mesh;
  }

  private animateCloudMesh() {
    this.scene.onBeforeRenderObservable.add(() => {
      if (this.cloudMesh) {
        this.cloudMesh.position.x += this.speed;
        if (this.cloudMesh.position.x > this.range / 2) {
          this.cloudMesh.position.x = -this.range / 2;
        }
      }
    });
  }

  private countAliveNeighbors(grid: number[][], x: number, z: number): number {
    const sizeX = this.gridWidth;
    const sizeZ = this.gridDepth;
    let count = 0;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dz === 0) continue;
        const nx = x + dx;
        const nz = z + dz;
        if (nx >= 0 && nx < sizeX && nz >= 0 && nz < sizeZ) {
          if (grid[nx][nz] === 1) count++;
        }
      }
    }

    return count;
  }

  public dispose() {
    if (this.cloudMesh) {
      this.cloudMesh.dispose();
      this.cloudMesh = null;
    }
    Clouds.instance = null;
  }
}