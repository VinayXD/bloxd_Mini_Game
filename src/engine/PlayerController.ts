import {
  ArcRotateCamera,
  KeyboardEventTypes,
  Scene,
  Vector3,
  Quaternion,
  SceneLoader,
  Mesh,
  AbstractMesh,
  TransformNode
} from "@babylonjs/core";
import "@babylonjs/loaders"; // Enables .glb and .gltf support

let instance: PlayerController | null = null;

export class PlayerController {
  public readonly player: TransformNode;
  public readonly thirdPersonCam: ArcRotateCamera;

  private scene: Scene;
  private inputMap: Record<string, boolean> = {};
  private speed = 0.1;
  private enabled = true;

  private constructor(scene: Scene, player: TransformNode, camera: ArcRotateCamera) {
    this.scene = scene;
    this.player = player;
    this.thirdPersonCam = camera;

    this.registerInput();
    this.registerUpdate();

    console.log("🧍 Player mesh created:", this.player.name);
    console.log("📸 Third person cam created:", this.thirdPersonCam.name);
  }

  public static async getInstance(scene: Scene): Promise<PlayerController> {
    if (instance) return instance;

    // ✅ Load the entire GLB model
    const result = await SceneLoader.ImportMeshAsync("", "/models/", "ninja1.glb", scene);
    // ❌ Stop auto-play animations
    result.animationGroups.forEach((group) => {
    group.stop(); // Stop all animations from playing by default
    });
    // ✅ Use the root node of the imported model
    const modelRoot = result.meshes[0] as TransformNode;

    modelRoot.position = new Vector3(0, 10, 0);
    modelRoot.rotationQuaternion = Quaternion.Identity();
    modelRoot.scaling = new Vector3(1, 1, 1);

    // ✅ Set all parts visible/enabled
    result.meshes.forEach((m) => {
      m.isVisible = true;
      m.setEnabled(true);
    });

    // ✅ Create third-person camera
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

      const forward = this.thirdPersonCam.getForwardRay().direction;
      const right = Vector3.Cross(forward, Vector3.Up()).normalize();

      let moveDir = Vector3.Zero();

      if (this.inputMap["w"] || this.inputMap["arrowup"]) moveDir = moveDir.add(forward);
      if (this.inputMap["s"] || this.inputMap["arrowdown"]) moveDir = moveDir.subtract(forward);
      if (this.inputMap["d"] || this.inputMap["arrowright"]) moveDir = moveDir.subtract(right);
      if (this.inputMap["a"] || this.inputMap["arrowleft"]) moveDir = moveDir.add(right);

      if (!moveDir.equals(Vector3.Zero())) {
        moveDir.y = 0;
        moveDir.normalize();
        this.player.position.addInPlace(moveDir.scale(this.speed));

        const angle = Math.atan2(moveDir.x, moveDir.z);
        this.player.rotationQuaternion = Quaternion.FromEulerAngles(0, angle, 0);
      }

      // Camera follow
      this.thirdPersonCam.setTarget(this.player.position);
    });
  }
}
