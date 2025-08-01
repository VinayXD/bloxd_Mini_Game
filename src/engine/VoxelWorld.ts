import { VoxelChunk } from "./VoxelChunk";

export class VoxelWorld {
  private chunks = new Map<string, VoxelChunk>();
  private readonly CHUNK_SIZE = 16;

  private getChunkKey(cx: number, cy: number, cz: number): string {
    return `${cx},${cy},${cz}`;
  }

  public addChunk(chunk: VoxelChunk, cx: number, cy: number, cz: number): void {
    const key = this.getChunkKey(cx, cy, cz);
    this.chunks.set(key, chunk);
  }

public getChunkAtWorld(x: number, y: number, z: number): VoxelChunk | undefined {
  const cx = Math.floor(x / this.CHUNK_SIZE);
  const cy = Math.floor(y / this.CHUNK_SIZE);
  const cz = Math.floor(z / this.CHUNK_SIZE);
 // console.log("🔍 Checking chunk at", cx, cy, cz);
  return this.chunks.get(this.getChunkKey(cx, cy, cz));
}


  public getBlock(x: number, y: number, z: number): number {
    const chunk = this.getChunkAtWorld(x, y, z);
    if (!chunk) return 0;
    const lx = x & (this.CHUNK_SIZE - 1);
    const ly = y & (this.CHUNK_SIZE - 1);
    const lz = z & (this.CHUNK_SIZE - 1);
    return chunk.getBlock(lx, ly, lz);
  }

  public isBlockSolid(x: number, y: number, z: number): boolean {
    const id = this.getBlock(x, y, z);
    if (id === 0) return false;
    const def = VoxelChunk.BlockLibrary.getByNumericId(id); // You may need to pass BlockLibrary
    return !!def && def.collider !== false;
  }
}
