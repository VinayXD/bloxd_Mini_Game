import {
  Scene,
  PointerEventTypes,
  Vector3,
  Matrix,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  RayHelper,
  Ray,
} from "@babylonjs/core";

import { CharacterController } from "./CharacterController";
import { BlockLibrary } from "../DraftScript/BlockLibrary";
import { VoxelWorld } from "./VoxelWorld";

export class BlockPlacer {
  private scene: Scene;
  private player: CharacterController;
  private outlineMesh: Mesh;
  private rayHelper?: RayHelper;
  private voxelWorld:VoxelWorld;
  constructor(scene: Scene, player: CharacterController,  voxelWorld: VoxelWorld) {
    this.scene = scene;
    this.player = player;
    this.outlineMesh = this.createOutlineMesh();
    this.voxelWorld = voxelWorld;
    this.setupPlacementHandler();
    this.setupOutlineUpdater();
  }

  private createOutlineMesh(): Mesh {
    const mesh = MeshBuilder.CreateBox("ghostBlock", { size: 1.01 }, this.scene);

    const mat = new StandardMaterial("ghostMat", this.scene);
    mat.diffuseColor = new Color3(0, 0, 0);
    mat.alpha = 0.1;
    mat.backFaceCulling = false;
    mat.disableLighting = true;
    mesh.material = mat;

    mesh.isPickable = false;
    mesh.isVisible = false;

    return mesh;
  }

  private setupOutlineUpdater(): void {
    this.scene.onBeforeRenderObservable.add(() => {
      const target = this.getPlacementPosition();
      if (target) {
        this.outlineMesh.position.copyFrom(target);
        this.outlineMesh.isVisible = true;
      } else {
        this.outlineMesh.isVisible = false;
      }
    });
  }

  private getPlacementPosition(): Vector3 | null {
    const camera = this.player.getActiveCamera();
    const ray = this.scene.createPickingRay(
      this.scene.getEngine().getRenderWidth() / 2,
      this.scene.getEngine().getRenderHeight() / 2,
      Matrix.Identity(),
      camera
    );

    // 🧪 Debug ray
    if (this.rayHelper) {
      this.rayHelper.hide();
      this.rayHelper.dispose();
    }
    this.rayHelper = new RayHelper(ray);
    this.rayHelper.show(this.scene, new Color3(1, 1, 1));
    setTimeout(() => {
      this.rayHelper?.hide();
      this.rayHelper?.dispose();
      this.rayHelper = undefined;
    }, 100);

    const hit = this.scene.pickWithRay(ray, (mesh) =>
      mesh.name.startsWith("block") || mesh.name.startsWith("base")
    );

    if (hit?.hit && hit.pickedPoint) {
      const normal = hit.getNormal(true);
      if (!normal) return null;

      const hitPoint = hit.pickedPoint;
      return new Vector3(
        Math.floor(hitPoint.x + normal.x * 0.5) + 0.5,
        Math.floor(hitPoint.y + normal.y * 0.5) + 0.5,
        Math.floor(hitPoint.z + normal.z * 0.5) + 0.5
      );
    } else {
      const standing = this.player.getStandingBlockInfo?.();
      const standingMesh = standing?.mesh;

      if (standingMesh) {
        const blockPos = standingMesh.position.clone();
        const cameraForward = camera.getForwardRay().direction.normalize();

        const abs = new Vector3(
          Math.abs(cameraForward.x),
          Math.abs(cameraForward.y),
          Math.abs(cameraForward.z)
        );

        if (abs.x >= abs.y && abs.x >= abs.z) {
          blockPos.x += cameraForward.x > 0 ? 1 : -1;
        } else if (abs.z >= abs.y && abs.z >= abs.x) {
          blockPos.z += cameraForward.z > 0 ? 1 : -1;
        } else {
          blockPos.y += 1;
        }

        return new Vector3(
          Math.floor(blockPos.x) + 0.5,
          Math.floor(blockPos.y) + 0.5,
          Math.floor(blockPos.z) + 0.5
        );
      }
    }

    return null;
  }

  private setupPlacementHandler(): void {
    this.scene.onPointerObservable.add((pointerInfo) => {
  if (pointerInfo.type !== PointerEventTypes.POINTERDOWN) return;

  const event = pointerInfo.event as PointerEvent;
  console.log("🖱️ Pointer event type:", event.button);

  if (event.button !== 2) {
    console.log("ℹ️ Not a right-click. Ignoring.");
    return;
  }

  console.log("✅ Right-click detected!");

  const placePos = this.getPlacementPosition();
  console.log("🎯 Placement position:", placePos);

  if (!placePos) {
    console.warn("❌ No valid placement position found.");
    return;
  }

  const maxRange = 6;
  const cameraPos = this.player.getActiveCamera().position;
  const distance = Vector3.Distance(cameraPos, placePos);
  console.log("📏 Distance to placement:", distance);

  if (distance > maxRange) {
    console.warn("🚫 Block too far to place.");
    return;
  }

  // Overlap prevention
  const playerCollider = this.player.getColliderMesh?.();
  if (playerCollider) {
    const blockHalf = 0.5;
    const blockMin = placePos.subtract(new Vector3(blockHalf, blockHalf, blockHalf));
    const blockMax = placePos.add(new Vector3(blockHalf, blockHalf, blockHalf));

    const colliderBox = playerCollider.getBoundingInfo().boundingBox;
    const colliderMin = colliderBox.minimumWorld;
    const colliderMax = colliderBox.maximumWorld;

    const torsoMinY = colliderMin.y + (colliderMax.y - colliderMin.y) * 0.4;

    const isDangerousOverlap =
      blockMax.x >= colliderMin.x && blockMin.x <= colliderMax.x &&
      blockMax.z >= colliderMin.z && blockMin.z <= colliderMax.z &&
      blockMax.y >= torsoMinY;

    if (isDangerousOverlap) {
      console.warn("🚫 Block would intersect upper body — placement cancelled.");
      return;
    }
  }

  // World logic
  const world = this.voxelWorld;
  if (!world) {
    console.warn("❌ No voxel world provided.");
    return;
  }

  const x = Math.floor(placePos.x);
  const y = Math.floor(placePos.y);
  const z = Math.floor(placePos.z);

  console.log("🧮 Grid Position:", x, y, z);

  const chunk = world.getChunkAtWorld(x, y, z);
  if (!chunk) {
    console.warn("❌ No chunk found at placement location.");
    return;
  }
  console.log("✅ Chunk found");

  const CHUNK_SIZE = chunk.size;

  const localX = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  const localY = ((y % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  const localZ = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

  console.log("📦 Local Chunk Pos:", localX, localY, localZ);

  try {
    const blockId = BlockLibrary.getNumericId("stone");
    console.log("🧱 Block ID (base):", blockId);

    chunk.setBlock(localX, localY, localZ, blockId);
    chunk.addBlockInstance(localX, localY, localZ, blockId);

    console.log("✅ Block placed and chunk rebuilt.");
  } catch (err) {
    console.error("❌ Error placing block:", err);
  }
});

  }
}
