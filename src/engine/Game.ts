import {
  Engine,
  Scene,
  Vector3,
  HemisphericLight,
  UniversalCamera,
  CubeTexture,
  Color3
} from "@babylonjs/core";

import "@babylonjs/loaders/glTF";
import "@babylonjs/loaders";
import "@babylonjs/inspector";

import { Clouds } from "./Clouds";
import { CharacterController } from "./CharacterController";

import { registerAllBlocks } from "../DraftScript/BlockRegistry";
import { BlockLibrary } from "../DraftScript/BlockLibrary";
import { BlockPlacer } from "./BlockPlacer";
import { VoxelChunk } from "./VoxelChunk";
import { VoxelWorld } from "./VoxelWorld";

const voxelWorld = new VoxelWorld();

export async function createGame(canvas: HTMLCanvasElement) {
  const engine = new Engine(canvas, true);
  const scene = new Scene(engine);

  // === LIGHT ===
  //new HemisphericLight("light", new Vector3(0, 20, 0), scene);

  // === REGISTER BLOCK TYPES ===
  registerAllBlocks();

  // === PLACE PYRAMID OF STONE BLOCKS ===
  const chunk = new VoxelChunk(scene, new Vector3(0, 0, 0));
  voxelWorld.addChunk(chunk, 0, 0, 0);

  const stoneId = BlockLibrary.getNumericId("stone");
  const levels = 4;

  for (let y = 0; y < levels; y++) {
    const size = levels - y;
    for (let x = -size; x <= size; x++) {
      for (let z = -size; z <= size; z++) {
        const px = x + 8;
        const py = y;
        const pz = z + 8;
        if (px >= 0 && px < 16 && pz >= 0 && pz < 16) {
          chunk.setBlock(px, py, pz, stoneId);
        }
      }
    }
  }

  chunk.rebuildMesh();

  // === DEBUG BLOCK OUTLINE (Optional) ===
  const blockOutline = BlockLibrary.createBlockOutline(scene, 1);
  blockOutline.isVisible = false;

  // === SKY ENVIRONMENT ===
  const environmentTexture = CubeTexture.CreateFromPrefilteredData("/env/sky2.env", scene);
  scene.environmentTexture = environmentTexture;
  scene.createDefaultSkybox(environmentTexture, true, 1000);
  scene.environmentIntensity = 1;

  // === CLOUDS ===
  Clouds.getInstance(scene);

  // === TEMP CAMERA ===
  const freeCam = new UniversalCamera("FreeCam", new Vector3(0, 5, -10), scene);
  freeCam.speed = 0.5;
  freeCam.angularSensibility = 500;
  scene.activeCamera = freeCam;
  scene.activeCamera.attachControl(canvas, true);

  // === PLAYER ===
  const player = await CharacterController.load(scene);
  player.setVoxelWorld(voxelWorld); // Inject voxel world for math-based collision
  scene.activeCamera = player.thirdPersonCam;
  player.thirdPersonCam.attachControl(canvas, true);
  new BlockPlacer(scene, player, voxelWorld);


  // === RENDER LOOP ===
  engine.runRenderLoop(() => {
    player.thirdPersonCam.target.copyFrom(player.root.position);
    scene.render();
  });

  window.addEventListener("resize", () => engine.resize());

  // Dev tools
  //scene.debugLayer.show();
}
