// Game.ts
import {
  Engine,
  Scene,
  Vector3,
  HemisphericLight,
  UniversalCamera,
  CubeTexture,
} from "@babylonjs/core";

import "@babylonjs/loaders/glTF";
import "@babylonjs/loaders";
import "@babylonjs/inspector";

import { Clouds } from "./Clouds";
import { CharacterController } from "./CharacterController";

import { registerAllBlocks } from "../DraftScript/BlockRegistry";
import { BlockLibrary } from "../DraftScript/BlockLibrary";

export async function createGame(canvas: HTMLCanvasElement) {
  const engine = new Engine(canvas, true);
  const scene = new Scene(engine);

  // === LIGHT ===
  new HemisphericLight("light", new Vector3(0, 1, 0), scene);

  // === REGISTER BLOCK TYPES ===
  registerAllBlocks();

  // === PLACE TEST BLOCK ===
 // Parameters
const levels = 4; // Pyramid height
const blockSize = 1;

for (let y = 0; y < levels; y++) {
  const size = levels - y;

  for (let x = -size; x <= size; x++) {
    for (let z = -size; z <= size; z++) {
      const block = BlockLibrary.createMesh("base", scene);
      block.position.set(x * blockSize, y * blockSize + 0.5, z * blockSize); // 0.5 centers it
    }
  }
}

const block1 = BlockLibrary.createMesh("base",scene);
block1.position.set(0,8,0);





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
  scene.activeCamera = player.thirdPersonCam;
  player.thirdPersonCam.attachControl(canvas, true);

  // === RENDER LOOP ===
  engine.runRenderLoop(() => {
    player.thirdPersonCam.target.copyFrom(player.root.position);
    scene.render();
  });

  window.addEventListener("resize", () => engine.resize());

  // scene.debugLayer.show(); // Optional dev tools
}
