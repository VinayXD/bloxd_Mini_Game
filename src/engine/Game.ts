import {
  UniversalCamera,
  Scene,
  Vector3,
  Engine,
  HemisphericLight,
  KeyboardEventTypes
} from "@babylonjs/core";

import { WorldGenerator } from "./WorldGenerator";
import { PlayerController } from "./PlayerController";

import "@babylonjs/inspector";
import "@babylonjs/loaders";

export async function createGame(canvas: HTMLCanvasElement) {
  
  const engine = new Engine(canvas, true);
  const scene = new Scene(engine);

  // === LIGHT ===
  const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);

  // === WORLD ===
  const world = new WorldGenerator(scene);
  world.generateTerrain();

  // === FREE CAM ===
  const freeCam = new UniversalCamera("FreeCam", new Vector3(0, 5, -10), scene);
  freeCam.speed = 0.5;
  freeCam.angularSensibility = 500;

  // === PLAYER + THIRD PERSON CAM ===
  const controller = await PlayerController.getInstance(scene);
  scene.activeCamera = controller.thirdPersonCam;

  // === CAMERA STATE SWITCH ===
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

  //scene.debugLayer.show();
}
