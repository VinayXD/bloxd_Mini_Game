// Game.ts
import {
  Engine,
  Scene,
  Vector3,
  HemisphericLight,
  UniversalCamera,
  KeyboardEventTypes,
  CubeTexture
} from "@babylonjs/core";

import { Clouds } from "./Clouds";




import { WorldGenerator } from "./WorldGenerator";
import { PlayerController } from "./PlayerController";

import "@babylonjs/inspector";
import "@babylonjs/loaders";

export async function createGame(canvas: HTMLCanvasElement) {
  const engine = new Engine(canvas, true);
  const scene = new Scene(engine);

  // === LIGHT ===
  new HemisphericLight("light", new Vector3(0, 1, 0), scene);

  // === WORLD ===
  const world = new WorldGenerator(scene);
  world.generateTerrain();

// === SKY ENVIRONMENT ===
const environmentTexture = CubeTexture.CreateFromPrefilteredData("/env/sky2.env", scene);
scene.environmentTexture = environmentTexture;
scene.createDefaultSkybox(environmentTexture, true, 1000);
scene.environmentIntensity = 1; // Default is 1.0, try 0.1 to 0.5




// ... Clouds
const clouds = Clouds.getInstance(scene);


  // === FREE CAMERA ===
  const freeCam = new UniversalCamera("FreeCam", new Vector3(0, 5, -10), scene);
  freeCam.speed = 0.5;
  freeCam.angularSensibility = 500;

  // === LOAD PLAYER WITH CAMERA + ANIMATION ===
  const controller = await PlayerController.getInstance(scene);

  // === CAMERA CONTROL ===
  let isThirdPerson = true;
  scene.activeCamera = controller.thirdPersonCam;
  scene.activeCamera.attachControl(canvas, true);
  controller.setEnabled(true);

  scene.onKeyboardObservable.add((kbInfo) => {
    if (kbInfo.type === KeyboardEventTypes.KEYDOWN && kbInfo.event.key === "Tab") {
      isThirdPerson = !isThirdPerson;

      scene.activeCamera?.detachControl();
      scene.activeCamera = isThirdPerson ? controller.thirdPersonCam : freeCam;
      scene.activeCamera.attachControl(canvas, true);
      controller.setEnabled(isThirdPerson);
    }
  });

  // === RENDER LOOP ===
  engine.runRenderLoop(() => {
    scene.render();
  });

  window.addEventListener("resize", () => {
    engine.resize();
  });

  // Optional: Uncomment to open inspector
  // scene.debugLayer.show();
}
