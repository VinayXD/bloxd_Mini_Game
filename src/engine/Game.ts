// Game.ts
import {
  Engine,
  Scene,
  Vector3,
  HemisphericLight,
  UniversalCamera,
  KeyboardEventTypes,
  CubeTexture,
} from "@babylonjs/core";

import { Clouds } from "./Clouds";
import "@babylonjs/loaders/glTF";

import { WorldGenerator } from "./WorldGenerator";

import "@babylonjs/inspector";
import "@babylonjs/loaders";
import { CharacterController } from "./CharacterController"; // Make sure the path matches




export async function createGame(canvas: HTMLCanvasElement) {
  const engine = new Engine(canvas, true);
  const scene = new Scene(engine);

  // === LIGHT ===
  const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);

  // === WORLD ===
  const world = new WorldGenerator(scene);
  world.generateTerrain();

  // === SKY ENVIRONMENT ===
  const environmentTexture = CubeTexture.CreateFromPrefilteredData("/env/sky2.env", scene);
  scene.environmentTexture = environmentTexture;
  scene.createDefaultSkybox(environmentTexture, true, 1000);
  scene.environmentIntensity = 1;

  // === CLOUDS ===
  const clouds = Clouds.getInstance(scene);

  // === FREE CAMERA ===
  const freeCam = new UniversalCamera("FreeCam", new Vector3(0, 5, -10), scene);
  freeCam.speed = 0.5;
  freeCam.angularSensibility = 500;
  scene.activeCamera = freeCam;
  scene.activeCamera.attachControl(canvas, true);

  // Inside Character Controller():
const player = await CharacterController.load(scene);
scene.activeCamera = player.thirdPersonCam;
player.thirdPersonCam.attachControl(canvas, true);



  // === CAMERA MODE TOGGLE ===
  scene.onKeyboardObservable.add((kbInfo) => {
    if (kbInfo.type === KeyboardEventTypes.KEYDOWN) {
      // Tab and P toggle logic removed since no controller is loaded
    }
  });

  // === RENDER LOOP ===
  engine.runRenderLoop(() => {
    player.thirdPersonCam.target.copyFrom(player.root.position);

    scene.render();
  });

  window.addEventListener("resize", () => {
    engine.resize();
  });

   scene.debugLayer.show();
}
