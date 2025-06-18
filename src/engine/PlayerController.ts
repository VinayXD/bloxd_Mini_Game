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

let instance: PlayerController | null = null;

export class PlayerController {
  public readonly player: TransformNode;
  public readonly thirdPersonCam: ArcRotateCamera;

  private scene: Scene;
  private inputMap: Record<string, boolean> = {};
  private speed = 0.1;
  private enabled = true;

  // 👇 Rotation state for A/D lean
  private strafeRotationTarget: number = 0;
  private strafeRotationCurrent: number = 0;
  private maxStrafeAngle = Math.PI / 4; // 45 degrees
  private strafeSpeed = 0.1; // lerp smoothing

  private constructor(scene: Scene, player: TransformNode, camera: ArcRotateCamera) {
    this.scene = scene;
    this.player = player;
    this.thirdPersonCam = camera;

    this.registerInput();
    this.registerUpdate();
    this.setupMouseCameraControl();

    console.log("🧍 Player mesh created:", this.player.name);
    console.log("📸 Third person cam created:", this.thirdPersonCam.name);
  }

  public static async getInstance(scene: Scene): Promise<PlayerController> {
    if (instance) return instance;

    const result = await SceneLoader.ImportMeshAsync("", "/models/", "ninja1.glb", scene);
    // Check if skeleton is present
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

    instance = new PlayerController(scene, modelRoot, camera);
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
      } else if (kbInfo.type === KeyboardEventTypes.KEYUP) {
        this.inputMap[key] = false;
      }
    });
  }

  private registerUpdate() {
    this.scene.onBeforeRenderObservable.add(() => {
      if (!this.enabled) return;

      // Direction vectors from camera
      const forward = this.thirdPersonCam.getForwardRay().direction;
      const right = Vector3.Cross(forward, Vector3.Up()).normalize();

      let moveDir = Vector3.Zero();

      // ✅ Movement (no rotation)
      if (this.inputMap["w"] || this.inputMap["arrowup"]) moveDir = moveDir.add(forward);
      if (this.inputMap["s"] || this.inputMap["arrowdown"]) moveDir = moveDir.subtract(forward);
      if (this.inputMap["d"] || this.inputMap["arrowright"]) moveDir = moveDir.subtract(right);
      if (this.inputMap["a"] || this.inputMap["arrowleft"]) moveDir = moveDir.add(right);

      if (!moveDir.equals(Vector3.Zero())) {
        moveDir.y = 0;
        moveDir.normalize();
        this.player.position.addInPlace(moveDir.scale(this.speed));
      }

      // ✅ Smooth lean rotation from A/D only
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

      // 🌀 Apply only lean rotation (not tied to movement)
      this.player.rotationQuaternion = Quaternion.FromEulerAngles(0, this.strafeRotationCurrent, 0);

      // 🎥 Keep camera focused
      this.thirdPersonCam.setTarget(this.player.position);
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
