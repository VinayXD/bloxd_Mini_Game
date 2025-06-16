import {
  ArcRotateCamera,
  KeyboardEventTypes,
  Mesh,
  Scene,
  Vector3,
  Quaternion
} from "@babylonjs/core";

export class PlayerController {
  private player: Mesh;
  private scene: Scene;
  private inputMap: Record<string, boolean> = {};
  private speed = 0.1;
  private enabled = true;
  private camera: ArcRotateCamera;

  constructor(player: Mesh, scene: Scene) {
    this.player = player;
    this.scene = scene;

    // Cast the activeCamera as ArcRotateCamera
    this.camera = scene.activeCamera as ArcRotateCamera;

    this.registerInput();
    this.registerUpdate();
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

      // Get forward & right from camera
      const forward = this.camera.getForwardRay().direction;
      const right = Vector3.Cross(forward, Vector3.Up()).normalize();

      let moveDir = Vector3.Zero();

      if (this.inputMap["w"] || this.inputMap["arrowup"]) {
        moveDir = moveDir.add(forward);
      }
      if (this.inputMap["s"] || this.inputMap["arrowdown"]) {
        moveDir = moveDir.subtract(forward);
      }
      if (this.inputMap["d"] || this.inputMap["arrowleft"]) {
        moveDir = moveDir.subtract(right);
      }
      if (this.inputMap["a"] || this.inputMap["arrowright"]) {
        moveDir = moveDir.add(right);
      }

      if (!moveDir.equals(Vector3.Zero())) {
        moveDir.y = 0; // Lock to XZ plane
        moveDir.normalize();

        // Move player
        this.player.position.addInPlace(moveDir.scale(this.speed));

        // Rotate player to face movement direction
        const angle = Math.atan2(moveDir.x, moveDir.z);
        this.player.rotationQuaternion = Quaternion.FromEulerAngles(0, angle, 0);
      } else {
        // If not moving, optionally align player with camera angle
        const forwardFlat = this.camera.getForwardRay().direction.clone();
        forwardFlat.y = 0;
        if (forwardFlat.length() > 0.01) {
          forwardFlat.normalize();
          const angle = Math.atan2(forwardFlat.x, forwardFlat.z);
          this.player.rotationQuaternion = Quaternion.FromEulerAngles(0, angle, 0);
        }
      }
    });
  }
}
