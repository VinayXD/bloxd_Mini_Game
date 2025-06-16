import {
  ArcRotateCamera,
  UniversalCamera,
  Scene,
  Vector3,
  Engine,
  HemisphericLight,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Quaternion,
  KeyboardEventTypes
} from "@babylonjs/core";

import { PlayerController } from "./PlayerController";

export function createGame(canvas: HTMLCanvasElement) {
  const engine = new Engine(canvas, true);
  const scene = new Scene(engine);

  // === LIGHT ===
  const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);

  // === GROUND (Optional)
  const ground = MeshBuilder.CreateGround("ground", { width: 20, height: 20 }, scene);

  // === PLAYER ===
  const player = MeshBuilder.CreateCapsule("player", {
    height: 2,
    radius: 0.5,
  }, scene);
  player.position.y = 1;

  const playerMat = new StandardMaterial("playerMat", scene);
  playerMat.diffuseColor = new Color3(1, 0, 0); // red
  player.material = playerMat;
  player.rotationQuaternion = Quaternion.Identity();

  // === CAMERAS ===

  // Third-person camera
  const thirdPersonCam = new ArcRotateCamera(
    "ThirdPersonCam",
    Math.PI / 2,
    Math.PI / 3,
    10,
    player.position,
    scene
  );
  thirdPersonCam.lowerRadiusLimit = 6;
  thirdPersonCam.upperRadiusLimit = 15;
  thirdPersonCam.setPosition(new Vector3(10, 10, -10));
  thirdPersonCam.setTarget(player.position);

  // Free camera
  const freeCam = new UniversalCamera("FreeCam", new Vector3(0, 5, -10), scene);
  freeCam.speed = 0.5;
  freeCam.angularSensibility = 500;

  // === CAMERA STATE ===
  let isThirdPerson = true;
  scene.activeCamera = thirdPersonCam;
  thirdPersonCam.attachControl(canvas, true);

  // === PLAYER CONTROLLER ===
  const controller = new PlayerController(player, scene);
  controller.setEnabled(true); // Enable controller in third-person

  // === CAMERA FOLLOW PLAYER ===
  scene.onBeforeRenderObservable.add(() => {
    if (isThirdPerson) {
      thirdPersonCam.setTarget(player.position);
    }
  });

  // === TAB KEY TOGGLE CAMERAS ===
  scene.onKeyboardObservable.add((kbInfo) => {
    if (kbInfo.type === KeyboardEventTypes.KEYDOWN && kbInfo.event.key === "Tab") {
      isThirdPerson = !isThirdPerson;

      // Detach current camera
      scene.activeCamera?.detachControl();

      // Switch cameras
      scene.activeCamera = isThirdPerson ? thirdPersonCam : freeCam;
      scene.activeCamera.attachControl(canvas, true);

      // Enable or disable player controls
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
}
