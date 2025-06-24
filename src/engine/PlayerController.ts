import {
  ArcRotateCamera,
  KeyboardEventTypes,
  Scene,
  Vector3,
  Quaternion,
  SceneLoader,
  TransformNode,
  PointerEventTypes,
  Scalar

} from "@babylonjs/core";

import "@babylonjs/loaders";

import { PlayerAnimation } from "./PlayerAnimation";

let instance: PlayerController | null = null;

export class PlayerController {
  public readonly player: TransformNode;
  public readonly thirdPersonCam: ArcRotateCamera;
  public readonly animation: PlayerAnimation;

  private scene: Scene;
  private inputMap: Record<string, boolean> = {};
  private speed = 0.05;
  private enabled = true;

private walkSpeed = 0.05;
private sprintSpeed = 0.1;
private crouchSpeed = 0.025;

private isShiftPressed: boolean = false;
private isCrouching: boolean = false;

private strafeRotationTarget: number = 0;
  private strafeRotationCurrent: number = 0;
  private maxStrafeAngle = Math.PI / 4;
  private strafeSpeed = 0.1;

  private constructor(
    scene: Scene,
    player: TransformNode,
    camera: ArcRotateCamera,
    animation: PlayerAnimation
  ) {
    this.scene = scene;
    this.player = player;
    this.thirdPersonCam = camera;
    this.animation = animation;

    this.registerInput();
    this.registerUpdate();
    this.setupMouseCameraControl();

    console.log("🧍 Player mesh created:", this.player.name);
    console.log("📸 Third person cam created:", this.thirdPersonCam.name);
  }

  public static async getInstance(scene: Scene): Promise<PlayerController> {
    if (instance) return instance;

    const result = await SceneLoader.ImportMeshAsync("", "/models/", "ninja.glb", scene);

    if (result.skeletons.length > 0) {
      console.log("✅ Skeleton found!");
      console.log("Bones:", result.skeletons[0].bones.map(b => b.name));
    } else {
      console.log("❌ No skeleton or bones found in this .glb.");
    }

    result.animationGroups.forEach((group) => group.stop());

    const modelRoot = result.meshes[0] as TransformNode;

    modelRoot.position = new Vector3(0, 10, 0);
    modelRoot.rotationQuaternion = Quaternion.Identity();
    modelRoot.scaling = new Vector3(1, 1, 1);

    result.meshes.forEach((m) => {
      m.isVisible = true;
      m.setEnabled(true);
    });

    const camera = new ArcRotateCamera(
      "ThirdPersonCam",
      Math.PI / 2,
      Math.PI / 3,
      10,
      modelRoot.position,
      scene
    );
    camera.lowerRadiusLimit = 6;
    camera.upperRadiusLimit = 15;
    camera.setPosition(new Vector3(0, 10, -10));
    camera.inputs.clear(); // Disable default input
    camera.attachControl(false);

    const animation = new PlayerAnimation(scene, result.skeletons[0], result.animationGroups);

    instance = new PlayerController(scene, modelRoot, camera, animation);
    return instance;
  }

  public setEnabled(state: boolean) {
    this.enabled = state;
  }

private registerInput() {
  this.scene.onKeyboardObservable.add((kbInfo) => {
    const key = kbInfo.event.key.toLowerCase();

    if (kbInfo.type === KeyboardEventTypes.KEYDOWN) {
      this.inputMap[key] = true;

      if (key === "shift") this.isShiftPressed = true;
      if (key === "c") this.isCrouching = true;

    } else if (kbInfo.type === KeyboardEventTypes.KEYUP) {
      this.inputMap[key] = false;

      if (key === "shift") this.isShiftPressed = false;
      if (key === "c") this.isCrouching = false;
    }
  });
}


private registerUpdate() {
  this.scene.onBeforeRenderObservable.add(() => {
    if (!this.enabled) return;

    const forward = this.thirdPersonCam.getForwardRay().direction;
    const right = Vector3.Cross(forward, Vector3.Up()).normalize();

    let moveDir = Vector3.Zero();

    if (this.inputMap["w"] || this.inputMap["arrowup"]) moveDir = moveDir.add(forward);
    if (this.inputMap["s"] || this.inputMap["arrowdown"]) moveDir = moveDir.subtract(forward);
    if (this.inputMap["d"] || this.inputMap["arrowright"]) moveDir = moveDir.subtract(right);
    if (this.inputMap["a"] || this.inputMap["arrowleft"]) moveDir = moveDir.add(right);

    const isMoving = !moveDir.equals(Vector3.Zero());

    // 🏃 Set movement speed based on state
    if (this.isCrouching) {
      this.speed = this.crouchSpeed;
    } else if (isMoving && this.isShiftPressed) {
      this.speed = this.sprintSpeed;
    } else {
      this.speed = this.walkSpeed;
    }

    // 🚶 Apply movement
    if (isMoving) {
      moveDir.y = 0;
      moveDir.normalize();
      this.player.position.addInPlace(moveDir.scale(this.speed));
    }

    // 🎯 Get flat camera forward direction
    const camForward = this.thirdPersonCam.getForwardRay().direction;
    camForward.y = 0;
    camForward.normalize();

    // 🌀 Calculate full rotation with strafe offset
    const baseAngle = Math.atan2(camForward.x, camForward.z);

    // 🔁 Handle strafe lean from A/D
    if (this.inputMap["a"] || this.inputMap["arrowleft"]) {
      this.strafeRotationTarget = -this.maxStrafeAngle;
    } else if (this.inputMap["d"] || this.inputMap["arrowright"]) {
      this.strafeRotationTarget = this.maxStrafeAngle;
    } else {
      this.strafeRotationTarget = 0;
    }

    this.strafeRotationCurrent = Scalar.Lerp(
      this.strafeRotationCurrent,
      this.strafeRotationTarget,
      this.strafeSpeed
    );

    const totalAngle = baseAngle + this.strafeRotationCurrent;
    const targetRotation = Quaternion.FromEulerAngles(0, totalAngle, 0);
    this.player.rotationQuaternion = Quaternion.Slerp(
      this.player.rotationQuaternion!,
      targetRotation,
      0.1
    );

    // 🎥 Keep camera targeting player
    this.thirdPersonCam.setTarget(this.player.position);

    // 🎭 Animation state
    if (this.isCrouching) {
      this.animation.playBaseAnimation("Crouch");
    } else if (isMoving && this.isShiftPressed) {
      this.animation.playBaseAnimation("Sprint");
    } else if (isMoving) {
      this.animation.playBaseAnimation("Walk");
    } else {
      this.animation.playBaseAnimation("Idle");
    }
  });
}




  private setupMouseCameraControl() {
    let previousX: number | null = null;
    let previousY: number | null = null;
    const sensitivity = 0.005;

    this.scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type === PointerEventTypes.POINTERMOVE) {
        const event = pointerInfo.event as PointerEvent;

        if (previousX !== null && previousY !== null) {
          const deltaX = event.clientX - previousX;
          const deltaY = event.clientY - previousY;

          this.thirdPersonCam.alpha -= deltaX * sensitivity;
          this.thirdPersonCam.beta -= deltaY * sensitivity;
        }

        previousX = event.clientX;
        previousY = event.clientY;
      }

      if (pointerInfo.type === PointerEventTypes.POINTERUP) {
        previousX = null;
        previousY = null;
      }
    });
  }
}
