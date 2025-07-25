 import {
  ArcRotateCamera,
  FreeCamera,
  KeyboardEventTypes,
  Scene,
  Vector3,
  Quaternion,
  SceneLoader,
  TransformNode,
  PointerEventTypes,
  Scalar,
  Mesh
} from "@babylonjs/core";

import "@babylonjs/loaders";
import { PlayerAnimation } from "../engine/PlayerAnimation";

let instance: PlayerController | null = null;

export class PlayerController {
  public readonly player: TransformNode;
  public readonly thirdPersonCam: ArcRotateCamera;
  public firstPersonCam!: FreeCamera;
  public readonly animation: PlayerAnimation;

  private scene: Scene;
  private inputMap: Record<string, boolean> = {};
  private speed = 0.05;
  private isFirstPerson = false;

  private walkSpeed = 0.05;
  private sprintSpeed = 0.1;
  private crouchSpeed = 0.025;

  private isShiftPressed: boolean = false;
  private isCrouching: boolean = false;
  private hiddenMeshes: Mesh[] = [];

  private pitch: number = 0;
  private yaw: number = 0;

  private tpRotationTarget!: TransformNode;
  private fpRotationTarget!: TransformNode;
  private lastYaw: number = 0;

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
    const modelRoot = result.meshes[0] as TransformNode;
    const skeleton = result.skeletons[0];

    result.animationGroups.forEach((group) => group.stop());

    modelRoot.position = new Vector3(0, 1, 0);
    modelRoot.rotationQuaternion = Quaternion.Identity();
    modelRoot.scaling = new Vector3(1, 1, 1);

    result.meshes.forEach((m) => {
      m.isVisible = true;
      m.setEnabled(true);
    });

    const tpTarget = new TransformNode("tpRotationTarget", scene);
    const fpTarget = new TransformNode("fpRotationTarget", scene);
    fpTarget.position = modelRoot.position.add(new Vector3(0, 1.75, 0));

    const thirdPersonCam = new ArcRotateCamera(
      "ThirdPersonCam",
      -Math.PI / 2, // behind the player correctly
      Math.PI / 3.5,  // slightly above
      7.5,            // radius
      modelRoot.position.clone(),
      scene
    );
    thirdPersonCam.lowerRadiusLimit = 10;
    thirdPersonCam.upperRadiusLimit = 10;
    thirdPersonCam.inputs.clear();
    thirdPersonCam.attachControl(true);
    thirdPersonCam.parent = tpTarget;

    const animation = new PlayerAnimation(scene, skeleton, result.animationGroups);
    instance = new PlayerController(scene, modelRoot, thirdPersonCam, animation);

    const fpCam = new FreeCamera("FirstPersonCam", new Vector3(0, 1.75, 0), scene);
    fpCam.minZ = 0.3;
    fpCam.speed = 0.0001;
    fpCam.attachControl(false);
    fpCam.parent = fpTarget;

    instance.firstPersonCam = fpCam;
    instance.fpRotationTarget = fpTarget;
    instance.tpRotationTarget = tpTarget;

    instance.hiddenMeshes = result.meshes.filter((mesh): mesh is Mesh => {
      return mesh instanceof Mesh && mesh !== modelRoot;
    });

    return instance;
  }

public toggleFirstPerson(canvas: HTMLCanvasElement) {
  this.isFirstPerson = !this.isFirstPerson;

  const from = this.isFirstPerson ? this.tpRotationTarget : this.fpRotationTarget;
  const to = this.isFirstPerson ? this.fpRotationTarget : this.tpRotationTarget;
  to.rotationQuaternion = from.rotationQuaternion?.clone() ?? Quaternion.Identity();

  // 👇 Fix: reset third-person cam angles when switching back
  if (!this.isFirstPerson) {
    const yaw = this.tpRotationTarget.rotation.y;
    this.thirdPersonCam.alpha = -Math.PI / 2 + yaw;
    this.thirdPersonCam.beta = Math.PI / 3.5; // Reset elevation if needed
  }

  this.scene.activeCamera?.detachControl();
  this.scene.activeCamera = this.isFirstPerson ? this.firstPersonCam : this.thirdPersonCam;

  setTimeout(() => {
    this.scene.activeCamera?.attachControl(canvas, true);
  }, 0);

  this.hiddenMeshes.forEach(mesh => mesh.setEnabled(!this.isFirstPerson));
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
      const target = this.isFirstPerson ? this.fpRotationTarget : this.tpRotationTarget;
      const forward = Vector3.TransformCoordinates(Vector3.Forward(), target.getWorldMatrix()).subtract(target.position).normalize();
      const right = Vector3.Cross(forward, Vector3.Up()).normalize();

      let moveDir = Vector3.Zero();
      if (this.inputMap["w"] || this.inputMap["arrowup"]) moveDir = moveDir.add(forward);
      if (this.inputMap["s"] || this.inputMap["arrowdown"]) moveDir = moveDir.subtract(forward);
      if (this.inputMap["d"] || this.inputMap["arrowright"]) moveDir = moveDir.subtract(right);
      if (this.inputMap["a"] || this.inputMap["arrowleft"]) moveDir = moveDir.add(right);

      const isMoving = !moveDir.equals(Vector3.Zero());
      this.speed = this.isCrouching ? this.crouchSpeed : (isMoving && this.isShiftPressed ? this.sprintSpeed : this.walkSpeed);

      if (isMoving) {
        moveDir.y = 0;
        moveDir.normalize();
        this.player.position.addInPlace(moveDir.scale(this.speed));
      }

      this.fpRotationTarget.position.copyFrom(this.player.position).addInPlace(new Vector3(0, 1.75, 0));
      this.tpRotationTarget.position.copyFrom(this.player.position);

      const currentYaw = target.rotation.y;
      if (Math.abs(this.lastYaw - currentYaw) > 0.001) {
        const targetQuat = Quaternion.FromEulerAngles(0, currentYaw, 0);
        if (Quaternion.Dot(this.player.rotationQuaternion!, targetQuat) < 0) {
          targetQuat.scaleInPlace(-1);
        }
        this.player.rotationQuaternion = Quaternion.Slerp(this.player.rotationQuaternion!, targetQuat, 0.15);
        this.lastYaw = currentYaw;
      }

      if (this.isCrouching) this.animation.playBaseAnimation("Crouch");
      else if (isMoving && this.isShiftPressed) this.animation.playBaseAnimation("Sprint");
      else if (isMoving) this.animation.playBaseAnimation("Walk");
      else this.animation.playBaseAnimation("Idle");
    });
  }

 private setupMouseCameraControl() {
    const canvas = this.scene.getEngine().getRenderingCanvas();
    const sensitivity = 0.005;

    this.scene.onPointerObservable.add((pointerInfo) => {
      if (!canvas) return;

      if (pointerInfo.type === PointerEventTypes.POINTERMOVE &&
        document.pointerLockElement === canvas) {
        const event = pointerInfo.event as PointerEvent;

        if (this.isFirstPerson) {
          this.yaw += event.movementX * sensitivity;
          this.pitch -= event.movementY * sensitivity;
          this.pitch = Scalar.Clamp(this.pitch, -Math.PI / 2 + 0.1, Math.PI / 2 - 0.1);
          this.fpRotationTarget.rotation.set(this.pitch, this.yaw, 0);
        } else {
          this.tpRotationTarget.rotation.y += event.movementX * sensitivity;
          this.thirdPersonCam.beta -= event.movementY * sensitivity;
          this.thirdPersonCam.beta = Scalar.Clamp(this.thirdPersonCam.beta, 0.1, Math.PI / 2);
        }
      }

      if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
        const event = pointerInfo.event as PointerEvent;
        console.log("Pointer down event:", event.button);

        if (event.button === 0) {
          console.log("Left click detected – should trigger attack if not blocked.");
        }

        if (document.pointerLockElement !== canvas && event.button !== 0) {
          canvas.requestPointerLock();
          console.log("🔒 Pointer lock requested.");
        }
      }
    });

    document.addEventListener("pointerlockchange", () => {
      if (document.pointerLockElement !== canvas) {
        console.log("🔓 Pointer lock exited");
      }
    });
  }

  public async attachSwordToLeftArm(scene: Scene): Promise<void> {
    const result = await SceneLoader.ImportMeshAsync("", "/models/", "Sword.glb", scene);
    const sword = result.meshes[0];
    sword.scaling.set(1, 1, 1);

    const skeleton = this.animation['skeleton'];
    const leftArm = skeleton.bones.find(b => b.name === "leftarmBone");

    if (!leftArm) {
      console.warn("❌ Could not find 'leftarmBone' to attach the sword.");
      return;
    }

    const boneNode = leftArm.getTransformNode();
    if (!boneNode) {
      console.warn("❌ leftarmBone has no transform node.");
      return;
    }

    sword.parent = boneNode;
    sword.position = new Vector3(-0.604, 0.775, 0);
    sword.rotationQuaternion = new Quaternion(
      0.2988362387301197,
      -0.6408563820557885,
      -0.6408563820557885,
      0.29883623873011994
    );
  }
}