// src/engine/GreedyMesher.ts
import {
  Scene,
  Mesh,
  VertexData,
  
} from "@babylonjs/core";

export class GreedyMesher {
  private scene: Scene;
  private blockSize: number;

  constructor(scene: Scene, blockSize: number = 1) {
    this.scene = scene;
    this.blockSize = blockSize;
  }

  /**
   * @param voxelData A 3D array: voxelData[x][y][z] = 0 or 1 (air or block)
   */
  public mesh(voxelData: number[][][], material: any): Mesh {
    const vertices: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    let indexOffset = 0;

    const width = voxelData.length;
    const height = voxelData[0].length;
    const depth = voxelData[0][0].length;

    const directions = [
      { dir: [1, 0, 0], normal: [1, 0, 0] },
      { dir: [-1, 0, 0], normal: [-1, 0, 0] },
      { dir: [0, 1, 0], normal: [0, 1, 0] },
      { dir: [0, -1, 0], normal: [0, -1, 0] },
      { dir: [0, 0, 1], normal: [0, 0, 1] },
      { dir: [0, 0, -1], normal: [0, 0, -1] },
    ];

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        for (let z = 0; z < depth; z++) {
          if (voxelData[x][y][z] === 0) continue; // skip air

          for (const { dir, normal } of directions) {
            const nx = x + dir[0];
            const ny = y + dir[1];
            const nz = z + dir[2];
            const isOutside =
              nx < 0 || ny < 0 || nz < 0 ||
              nx >= width || ny >= height || nz >= depth;

            if (isOutside || voxelData[nx][ny][nz] === 0) {
              const baseX = x * this.blockSize;
              const baseY = y * this.blockSize;
              const baseZ = z * this.blockSize;

              // Simple face quad (2 triangles)
              const faceVerts = this.createFace(baseX, baseY, baseZ, dir, normal);
              for (const v of faceVerts.positions) vertices.push(...v);
              normals.push(...faceVerts.normals);
              indices.push(
                indexOffset,
                indexOffset + 1,
                indexOffset + 2,
                indexOffset,
                indexOffset + 2,
                indexOffset + 3
              );
              indexOffset += 4;
              uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
            }
          }
        }
      }
    }

    const mesh = new Mesh("greedyTerrain", this.scene);
    const vertexData = new VertexData();
    vertexData.positions = vertices;
    vertexData.indices = indices;
    vertexData.normals = normals;
    vertexData.uvs = uvs;
    vertexData.applyToMesh(mesh);
    mesh.material = material;
    return mesh;
  }

  private createFace(x: number, y: number, z: number, dir: number[], normal: number[]) {
    const s = this.blockSize / 2;
    const positions = [
      [x - s, y - s, z + s],
      [x + s, y - s, z + s],
      [x + s, y + s, z + s],
      [x - s, y + s, z + s],
    ];
    const normals = normal.concat(normal, normal, normal);
    return { positions, normals };
  }
}
