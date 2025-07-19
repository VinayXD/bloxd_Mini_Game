import {
  Scene,
  Vector3,
  Quaternion,
  TransformNode,
  AbstractMesh,
  AnimationGroup,
  Skeleton,
  SceneLoader,
  ArcRotateCamera,
  KeyboardEventTypes,
  FreeCamera,
  PointerEventTypes,
  Scalar
} from "@babylonjs/core";

import "@babylonjs/loaders"; 
import { PlayerAnimation } from "./PlayerAnimation";
import type { AnimationState } from "./PlayerAnimation";
 // adjust path as needed

export class CharacterController {
  public readonly root: TransformNode;
  public readonly meshes: AbstractMesh[];
  public readonly animations: AnimationGroup[];
  public readonly thirdPersonCam!: ArcRotateCamera;
  public readonly skeleton?: Skeleton;
  private inputMap: Record<string, boolean> = {};
  private firstPersonCam!: FreeCamera;
  private isFirstPerson = false;
  private pitch = 0;
  private yaw = 0;

  


  private static instance: CharacterController | null = null;
  private animator!: PlayerAnimation;

 private constructor(
    scene: Scene,
    root: TransformNode,
    meshes: AbstractMesh[],
    animations: AnimationGroup[],
    thirdPersonCam: ArcRotateCamera,
    skeleton?: Skeleton,
  ) 
  {
    this.root = root;
    this.meshes = meshes;
    this.animations = animations;
    this.thirdPersonCam = thirdPersonCam;
    this.skeleton = skeleton;


    // Optional: Set position, rotation, visibility
    root.position = new Vector3(0, 10, 0);
    root.rotationQuaternion = Quaternion.Identity();
  }
  

public static async load(scene: Scene): Promise<CharacterController> {
  if (CharacterController.instance) return CharacterController.instance;

  const result = await SceneLoader.ImportMeshAsync("", "/models/", "ninja.glb", scene);

  const root = result.meshes[0] as TransformNode;
  const thirdPersonCam = new ArcRotateCamera(
  "ThirdPersonCam",
  Math.PI / 2,       // behind
  Math.PI / 3.5,      // slightly above
  7.5,                // distance
  root.position.clone(), // initial focus
  scene
);


thirdPersonCam.lowerRadiusLimit = 10;
thirdPersonCam.upperRadiusLimit = 10;
thirdPersonCam.lowerBetaLimit = 0;
thirdPersonCam.upperBetaLimit = Math.PI / 2;

thirdPersonCam.attachControl(true);
thirdPersonCam.inputs.removeByType("ArcRotateCameraKeyboardMoveInput"); // 🛑 Disables WASD rotation
thirdPersonCam.inputs.removeByType("ArcRotateCameraMouseWheelInput");   // (Optional) Disables zoom

 // disable mouse for now

  const meshes = result.meshes;
  const animations = result.animationGroups;
  const skeleton = result.skeletons[0];

const controller = new CharacterController(scene, root, meshes, animations,thirdPersonCam,skeleton);
CharacterController.instance = controller;

controller.setupFirstPersonCamera(scene);
const idle = animations.find(a => a.name.toLowerCase() === "idle");
if (idle) {
  idle.start(true); // loop = true
  console.log("▶️ Playing default animation: Idle");
} else {
  console.warn("❌ Idle animation not found.");
}
console.log("📝 Animation Group Names:");
const animationNames = animations.map(a => a.name);
console.log(animationNames.join(", "));
controller.animator = new PlayerAnimation(scene, skeleton, animations);

await CharacterController.instance?.attachSwordToLeftArm(scene);


// You can reference these later like:
//const ANIM_IDLE = "Idle";
//const ANIM_WALK = "Walk";
//const ANIM_SPRINT = "Sprint";
//const ANIM_CROUCH = "Crouch";
//const ANIM_LEFT_ATTACK = "Left_Attack";
//const ANIM_RIGHT_ATTACK = "Right-Attack";

console.log("📝 Skeleton Bone Names:");
if (skeleton) {
  const boneNames = skeleton.bones.map(b => b.name);
  console.log(boneNames.join(", "));

  // For future use
  //const BONE_HEAD = "headBone";
  //const BONE_LEFT_ARM = "leftarmBone";
  //const BONE_RIGHT_ARM = "rightarmBone";
  //const BONE_TORSO = "torsoBone";
}
scene.onBeforeRenderObservable.add(() => {
  const instance = CharacterController.instance;
  if (!instance) return;

  instance.updateFacingToCamera(); // Smooth rotation
  instance.updateMovement();       // Movement logic
    instance.updateCameraMode();
// ☑ Sync FP/TP camera
});

    
scene.onKeyboardObservable.add((kbInfo) => {
  const key = kbInfo.event.key.toLowerCase();
  const instance = CharacterController.instance;
  if (!instance) return;

  if (kbInfo.type === KeyboardEventTypes.KEYDOWN) {
    instance.inputMap[key] = true;

    // ✅ Only toggle on key press down
    if (key === "p") {
      instance.toggleFirstPersonView(scene);
    }
  } else if (kbInfo.type === KeyboardEventTypes.KEYUP) {
    instance.inputMap[key] = false;
  }

  
});

const canvas = scene.getEngine().getRenderingCanvas();
scene.onPointerObservable.add((pointerInfo) => {
  if (!canvas || !CharacterController.instance) return;
  const self = CharacterController.instance;

  const event = pointerInfo.event as PointerEvent;

  switch (pointerInfo.type) {
    case PointerEventTypes.POINTERDOWN: {
      if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
      }

      if (!self.animator) return;

if (event.button === 0) {
  console.log("🖱️ Left click → play right arm attack");
  self.animator.playLayeredAnimation("Right-Attack");
}
if (event.button === 2) {
  console.log("🖱️ Right click → play left arm attack");
  self.animator.playLayeredAnimation("Left_Attack");
}

      break;
    }

    case PointerEventTypes.POINTERMOVE: {
      if (!self.isFirstPerson || document.pointerLockElement !== canvas) return;

      self.yaw += event.movementX * 0.002;
      self.pitch -= event.movementY * 0.002;
      self.pitch = Scalar.Clamp(self.pitch, -Math.PI / 2 + 0.05, Math.PI / 2 - 0.05);

      self.firstPersonCam.rotation.set(self.pitch, self.yaw, 0);

      // Update player rotation to match yaw
      const target = Quaternion.FromEulerAngles(0, self.yaw, 0);
      self.root.rotationQuaternion = Quaternion.Slerp(self.root.rotationQuaternion!, target, 0.1);
      break;
    }
  }
});




  return CharacterController.instance;

  
}
private setupFirstPersonCamera(scene: Scene): void {
  this.firstPersonCam = new FreeCamera(
    "FirstPersonCam",
    this.root.position.add(new Vector3(0, 1.75, -1)),
    scene
  );

  this.firstPersonCam.minZ = 0.1;
  this.firstPersonCam.speed = 0.1;
  this.firstPersonCam.rotation = new Vector3(0, 0, 0);
}
private toggleFirstPersonView(scene: Scene): void {
  this.isFirstPerson = !this.isFirstPerson;

  scene.activeCamera?.detachControl();
  scene.activeCamera = this.isFirstPerson ? this.firstPersonCam : this.thirdPersonCam;
  scene.activeCamera.attachControl(scene.getEngine().getRenderingCanvas()!, true);

  // Hide model in FP mode
  this.meshes.forEach(m => m.setEnabled(!this.isFirstPerson));

  if (this.isFirstPerson) {
    // Switching from TP → FP
    const direction = this.thirdPersonCam.target.subtract(this.thirdPersonCam.position).normalize();
    this.yaw = Math.atan2(direction.x, direction.z);
    this.pitch = 0;

    this.firstPersonCam.rotationQuaternion = Quaternion.RotationYawPitchRoll(this.yaw, this.pitch, 0);

    // 🔁 Set root instantly to match yaw
    this.root.rotationQuaternion = Quaternion.RotationYawPitchRoll(this.yaw, 0, 0);

  } else {
    // Switching from FP → TP

    // 🔁 Match third-person camera to current FP yaw
    const distance = this.thirdPersonCam.radius;

    // Compute new camera position behind player
    const offset = new Vector3(
      Math.sin(this.yaw) * -distance,
      this.thirdPersonCam.radius * Math.sin(this.thirdPersonCam.beta), // height
      Math.cos(this.yaw) * -distance
    );

    const newCamPos = this.root.position.add(offset);
    this.thirdPersonCam.setPosition(newCamPos);
    this.thirdPersonCam.target.copyFrom(this.root.position);

    // 🧭 Set character to match that yaw — INSTANTLY and NORMALIZED
    this.yaw = this.normalizeAngle(this.yaw);
    this.root.rotationQuaternion = Quaternion.RotationYawPitchRoll(this.yaw, 0, 0);

    // 🕓 Temporarily pause TP auto-facing for 1 frame
    this.skipTPFacingFrames = 1;
  }
}

private normalizeAngle(angle: number): number {
  angle = angle % (2 * Math.PI);
  if (angle > Math.PI) angle -= 2 * Math.PI;
  if (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}


private updateCameraMode() {
  if (this.isFirstPerson && this.firstPersonCam) {
    // attach camera to character eye position
    const headOffset = new Vector3(0, 1.5, 0.2);
    const worldPos = Vector3.TransformCoordinates(headOffset, this.root.getWorldMatrix());
    this.firstPersonCam.position.copyFrom(worldPos);
  }
}


private skipTPFacingFrames = 0;

private updateFacingToCamera() {
     if (this.isFirstPerson || this.skipTPFacingFrames > 0) {
    this.skipTPFacingFrames = Math.max(0, this.skipTPFacingFrames - 1);
    return;
  }
  const cam = this.thirdPersonCam;

  // Direction player should face (camera look direction)
  const direction = cam.position.subtract(cam.getTarget());
  direction.y = 0;
  direction.normalize();

  let desiredYaw = Math.atan2(direction.x, direction.z);

  // Apply +30° or -30° yaw if A or D is held
  if (this.inputMap["a"] || this.inputMap["arrowleft"]) {
    desiredYaw -= Math.PI / 6; // 30° left
  }
  if (this.inputMap["d"] || this.inputMap["arrowright"]) {
    desiredYaw += Math.PI / 6; // 30° right
  }

  const targetRotation = Quaternion.FromEulerAngles(0, desiredYaw, 0);
  const current = this.root.rotationQuaternion ?? Quaternion.Identity();
  this.root.rotationQuaternion = Quaternion.Slerp(current, targetRotation, 0.1);
}


private updateMovement() {
  const isFP = this.isFirstPerson;
  const cam = isFP ? this.firstPersonCam : this.thirdPersonCam;

  // Step 1: Get forward direction based on camera
  const forward = cam.getDirection(Vector3.Forward());
  forward.y = 0;
  forward.normalize();

  // Step 2: Right direction (perpendicular)
  const right = Vector3.Cross(Vector3.Up(), forward).normalize();

  // Step 3: Movement input
  let move = Vector3.Zero();
  if (this.inputMap["w"] || this.inputMap["arrowup"]) move = move.add(forward);
  if (this.inputMap["s"] || this.inputMap["arrowdown"]) move = move.subtract(forward);
  if (this.inputMap["a"] || this.inputMap["arrowleft"]) move = move.subtract(right);
  if (this.inputMap["d"] || this.inputMap["arrowright"]) move = move.add(right);

  // Step 4: Apply movement
 
  const moveSpeed = 0.05;
  let animation: AnimationState = "Idle";

  // Step 3: Handle crouch override
  const isCrouching = !!this.inputMap["c"];

  if (isCrouching) {
    animation = "Crouch"; // Always play crouch animation
    if (!move.equals(Vector3.Zero())) {
      move.normalize();
      move.scaleInPlace(moveSpeed * 0.5); // Slow crouch movement
      this.root.position.addInPlace(move);
    }
  } else if (!move.equals(Vector3.Zero())) {
    move.normalize();

    if (this.inputMap["shift"]) {
      move.scaleInPlace(moveSpeed * 2.0);
      animation = "Sprint";
    } else {
      move.scaleInPlace(moveSpeed);
      animation = "Walk";
    }

    this.root.position.addInPlace(move);
  }

  this.animator.playBaseAnimation(animation);

  if (!this.isFirstPerson) {
    this.thirdPersonCam.target.copyFrom(this.root.position);
  }
}


public async attachSwordToLeftArm(scene: Scene): Promise<void> {
  const result = await SceneLoader.ImportMeshAsync("", "/models/", "Sword.glb", scene);
  const sword = result.meshes[0];
  sword.scaling.set(1, 1, 1);

  if (!this.skeleton) {
    console.warn("❌ No skeleton found in player model.");
    return;
  }

  const leftArm = this.skeleton.bones.find(b => b.name === "rightarmBone");

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