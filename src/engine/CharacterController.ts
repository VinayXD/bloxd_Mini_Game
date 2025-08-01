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
  Scalar,
  MeshBuilder,
  Color3,
  StandardMaterial,
  Mesh
} from "@babylonjs/core";

import "@babylonjs/loaders"; 
import { PlayerAnimation } from "./PlayerAnimation";
import type { AnimationState } from "./PlayerAnimation";
 // adjust path as needed 
 import { VoxelWorld } from "./VoxelWorld";

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
  private collider!: Mesh;
  private verticalVelocity = 0;
  private isGrounded = false;
  private scene: Scene;
  private isJumping = false;
  private standingBlockVoxel: Vector3 | null = null;
  private readonly colliderHeight = 2.7;
  private readonly jumpHeight = 2.0;
  private readonly gravityStrength = -0.003;
  private readonly terminalVelocity = -0.20;
  private stayOnBlockEdge = false;
  private static instance: CharacterController | null = null;
  private animator!: PlayerAnimation;
  private voxelWorld!: VoxelWorld;

  


 private constructor(
    scene: Scene,
    root: TransformNode,
    meshes: AbstractMesh[],
    animations: AnimationGroup[],
    thirdPersonCam: ArcRotateCamera,
    skeleton?: Skeleton,
    

  ) 
  {
    this.scene = scene;
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
// === PHYSICS COLLIDER SETUP ===
const collider = MeshBuilder.CreateBox("playerCollider", {
  width: 0.8,
  height: 2.7,
  depth: 0.6
}, scene);

// Move collider up so it surrounds the character visually
collider.position = root.position.clone().add(new Vector3(0, 1.1, 0));
collider.isVisible = true;

// Optional debug material
const debugMat = new StandardMaterial("debugMat", scene);
debugMat.diffuseColor = new Color3(1, 0, 0);
debugMat.alpha = 0.4;
collider.material = debugMat;

// Assign physics impostor after first render
// scene.onAfterRenderObservable.addOnce(() => {
//   collider.physicsImpostor = new PhysicsImpostor(
//     collider,
//     PhysicsImpostor.BoxImpostor,
//     { mass: 1000, restitution: 0.05, friction: 0 },
//     scene
//   );
//   console.log("✅ Physics impostor assigned.");
// });

// Link collider to controller
controller["collider"] = collider;

// Sync character position and rotation with physics collider
scene.onBeforeRenderObservable.add(() => {
  

  // Position character's root slightly below collider center
  controller.root.position.set(
    collider.position.x,
    collider.position.y - 1.1,
    collider.position.z
  );

  // Match rotation
  if (collider.rotationQuaternion) {
    controller.root.rotationQuaternion = collider.rotationQuaternion.clone();
  } else {
    controller.root.rotationQuaternion = Quaternion.FromEulerAngles(
      collider.rotation.x,
      collider.rotation.y,
      collider.rotation.z
    );
  }
});


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

  if (key === "c") {
    instance.stayOnBlockEdge = true;
  }
  if (key === "p") {
    instance.toggleFirstPersonView(scene);
  }
} else if (kbInfo.type === KeyboardEventTypes.KEYUP) {
  instance.inputMap[key] = false;

  if (key === "c") {
    instance.stayOnBlockEdge = false;
  }
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
      if (self.collider) {
    self.collider.rotationQuaternion = Quaternion.Slerp(
    self.collider.rotationQuaternion ?? Quaternion.Identity(),
    target,
    0.1
  );
}
      break;
    }
  }
});




  return CharacterController.instance;

  
}

public getStandingBlockInfo(): { y: number; mesh?: Mesh } | null {
  return this.getStandingBlock();
}


 public setVoxelWorld(world: VoxelWorld): void {
    this.voxelWorld = world;
  }

private setupFirstPersonCamera(scene: Scene): void {
  this.firstPersonCam = new FreeCamera(
    "FirstPersonCam",
    this.root.position.add(new Vector3(0, 1.75, 0)),
    scene
  );

  this.firstPersonCam.minZ = 0.1;
  this.firstPersonCam.fov = Math.PI / 4 ;
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

private getStandingBlock(): { y: number; mesh?: Mesh } | null {
  const center = this.collider.position.clone().add(new Vector3(0, -1.35, 0));
  const radiusX = 0.3;
  const radiusZ = 0.3;

  const minX = Math.floor(center.x - radiusX);
  const maxX = Math.floor(center.x + radiusX);
  const minZ = Math.floor(center.z - radiusZ);
  const maxZ = Math.floor(center.z + radiusZ);
  const y = Math.floor(center.y);

  for (let x = minX; x <= maxX; x++) {
    for (let z = minZ; z <= maxZ; z++) {
      if (this.voxelWorld.isBlockSolid(x, y, z)) {
        this.standingBlockVoxel = new Vector3(x, y, z);
        return {
          y: y + 1,
          mesh: undefined // optional
        };
      }
    }
  }

  this.standingBlockVoxel = null;
  return null;
}









private checkBlockCollision(nextPos: Vector3): boolean {
  const playerSize = new Vector3(0.3, 1.35, 0.3); // slightly tighter box
  const min = nextPos.subtract(playerSize);
  const max = nextPos.add(playerSize);

  const footY = nextPos.y - playerSize.y + 0.05; // tiny margin

  for (let x = Math.floor(min.x); x <= Math.floor(max.x); x++) {
    for (let y = Math.floor(min.y); y <= Math.floor(max.y); y++) {
      for (let z = Math.floor(min.z); z <= Math.floor(max.z); z++) {
        // 🚫 Ignore blocks below or barely at foot level
        if (y < Math.floor(footY)) continue;

        if (this.voxelWorld.isBlockSolid(x, y, z)) {
          return true;
        }
      }
    }
  }

  return false;
}







  private checkCeilingCollision(): boolean {
    const top = this.collider.position.clone().add(new Vector3(0, 1.35, 0));
    const voxelAbove = new Vector3(
      Math.floor(top.x),
      Math.floor(top.y),
      Math.floor(top.z)
    );

    return this.voxelWorld.isBlockSolid(voxelAbove.x, voxelAbove.y, voxelAbove.z);
  }





private updateCameraMode() {
  if (this.isFirstPerson && this.firstPersonCam) {
    // attach camera to character eye position
    const headOffset = new Vector3(0, 1.75, 0.2);
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
  if (this.collider) {
  const current = this.collider.rotationQuaternion ?? Quaternion.Identity();
  this.collider.rotationQuaternion = Quaternion.Slerp(current, targetRotation, 0.1);
}

}
// private drawDebugHeadPosition(scene: Scene): void {
//   const debugSphere = MeshBuilder.CreateSphere("headDebug", { diameter: 0.1 }, scene);
//   debugSphere.position = this.collider.position.add(new Vector3(0, 1.35, 0));
//   const mat = new StandardMaterial("headMat", scene);
//   mat.diffuseColor = new Color3(1, 0, 0); // Red
//   debugSphere.material = mat;

//   setTimeout(() => debugSphere.dispose(), 500); // remove after 0.5s
// }
public getColliderMesh(): Mesh {
  return this.collider;
}


  private updateMovement() {
    const isFP = this.isFirstPerson;
    const cam = isFP ? this.firstPersonCam : this.thirdPersonCam;

    const forward = cam.getDirection(Vector3.Forward());
    forward.y = 0;
    forward.normalize();

    const right = Vector3.Cross(Vector3.Up(), forward).normalize();

    let move = Vector3.Zero();
    if (this.inputMap["w"] || this.inputMap["arrowup"]) move = move.add(forward);
    if (this.inputMap["s"] || this.inputMap["arrowdown"]) move = move.subtract(forward);
    if (this.inputMap["a"] || this.inputMap["arrowleft"]) move = move.subtract(right);
    if (this.inputMap["d"] || this.inputMap["arrowright"]) move = move.add(right);

    const moveSpeed = 0.05;
    let animation: AnimationState = "Idle";
    const isCrouching = !!this.inputMap["c"];

    if (!move.equals(Vector3.Zero())) {
      move.normalize();

      if (isCrouching) {
        animation = "Crouch";
        move.scaleInPlace(moveSpeed * 0.5);
      } else if (this.inputMap["shift"]) {
        animation = "Sprint";
        move.scaleInPlace(moveSpeed * 2.0);
      } else {
        animation = "Walk";
        move.scaleInPlace(moveSpeed);
      }

      const nextPos = this.collider.position.add(move);
      if (!this.checkBlockCollision(nextPos)) {
        this.collider.position.copyFrom(nextPos);
      } else {
        console.log("🚫 Blocked by block");
      }
    } else if (isCrouching) {
      animation = "Crouch";
    }

    this.animator.playBaseAnimation(animation);
    if (!isFP) this.thirdPersonCam.target.copyFrom(this.root.position);

    if (this.inputMap[" "] && this.isGrounded && !this.isJumping) {
      const jumpVelocity = Math.sqrt(2 * Math.abs(this.gravityStrength) * this.jumpHeight);
      this.verticalVelocity = jumpVelocity;
      this.isJumping = true;
      this.isGrounded = false;
      this.animator.playBaseAnimation("Jump");
    }

    if (!(isCrouching && this.stayOnBlockEdge)) {
      this.verticalVelocity += this.gravityStrength;
      if (this.verticalVelocity < this.terminalVelocity) {
        this.verticalVelocity = this.terminalVelocity;
      }
    } else {
      this.verticalVelocity = 0;
    }

    if (this.verticalVelocity > 0 && this.checkCeilingCollision()) {
      this.verticalVelocity = 0;
      console.log("✅ Ceiling collision stopped jump");
    }

    if (!isCrouching || !this.stayOnBlockEdge) {
      this.collider.position.y += this.verticalVelocity;
    }

    const standingInfo = this.getStandingBlock();
    if (standingInfo && this.verticalVelocity <= 0) {
      const standY = standingInfo.y;
      const heightOffset = this.collider.getBoundingInfo().boundingBox.extendSize.y;
      this.collider.position.y = standY + heightOffset;

      this.verticalVelocity = 0;
      this.isGrounded = true;
      this.isJumping = false;
    } else {
      this.isGrounded = false;
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
public getActiveCamera() {
  return this.isFirstPerson ? this.firstPersonCam : this.thirdPersonCam;
}





}