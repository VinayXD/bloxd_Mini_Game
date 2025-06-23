import {
  ArcRotateCamera,
  KeyboardEventTypes,
  Scene,
  Vector3,
  Quaternion,
  SceneLoader,
  TransformNode,
  PointerEventTypes,
  Scalar,
  Skeleton,
  Bone,
  AnimationGroup
} from "@babylonjs/core";
import "@babylonjs/loaders";

let instance: PlayerController | null = null;

type AnimationState = "Idle" | "Walk" | "Sprint" | "Attack";

export class PlayerController {
  public readonly player: TransformNode;
  public readonly thirdPersonCam: ArcRotateCamera;

  private scene: Scene;
  private inputMap: Record<string, boolean> = {};
  private speed = 0.05;
  private enabled = true;
  private isShiftPressed: boolean = false;
  private currentState: AnimationState = "Idle";
  private animationGroups: Map<string, AnimationGroup> = new Map();
  private skeleton: Skeleton | null = null;
  private isAttacking: boolean = false;

  private constructor(scene: Scene, player: TransformNode, camera: ArcRotateCamera) {
    this.scene = scene;
    this.player = player;
    this.thirdPersonCam = camera;

    this.registerInput();
    this.registerUpdate();
    this.setupMouseCameraControl();
  }

public static async getInstance(scene: Scene): Promise<PlayerController> {
  if (instance) return instance;

  const result = await SceneLoader.ImportMeshAsync("", "/models/", "ninja.glb", scene);

  const modelRoot = result.meshes[0] as TransformNode;
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
  camera.inputs.clear();
  camera.attachControl(true);

  const controller = new PlayerController(scene, modelRoot, camera);

  // Set skeleton
  if (result.skeletons.length > 0) {
    controller.skeleton = result.skeletons[0];
  }

  // === 🧪 LOG SKELETON BONES ===
  if (controller.skeleton) {
    console.log("🦴 Skeleton Bones:");
    controller.skeleton.bones.forEach((bone) => {
      console.log("🔹", bone.name);
    });
  }

  // === 🧪 LOG ANIMATION GROUPS AND TARGETS ===
  result.animationGroups.forEach(group => {
    console.log(`🎞️ Animation Group: ${group.name}`);
    group.targetedAnimations.forEach(({ target, animation }) => {
      const boneName = (target as Bone)?.name ?? "unknown";
      console.log(`  👉 Target Bone: ${boneName}, Animation: ${animation.name}, Keys: ${animation.getKeys().length}`);
    });
  });

  // === RIGHT-ATTACK FILTER TEST ===
  const rightAttackGroup = result.animationGroups.find(g => g.name === "Right-Attack");
  if (rightAttackGroup) {
    const rightArmTargets = ["rightarmBone"];  // ✅ Make sure this matches the bone name from logs

    // Filter only matching bone targets
    const filteredAnimations = rightAttackGroup.targetedAnimations.filter(({ target }) =>
      rightArmTargets.includes((target as Bone).name)
    );

    console.log("🎯 Filtered Right-Attack to:");
    filteredAnimations.forEach(({ target }) =>
      console.log("  🎯", (target as Bone).name)
    );

    // 🧪 Check if filtering worked
    if (filteredAnimations.length === 0) {
      console.warn("❌ No matching animations for 'rightarmBone'. Skipping filtering.");
    } else {
      // Clear and add only filtered animations
      rightAttackGroup.targetedAnimations.length = 0;
      filteredAnimations.forEach(({ animation, target }) => {
        rightAttackGroup.addTargetedAnimation(animation, target);
      });
      console.log("✅ Filtered Right-Attack to rightarmBone only.");
    }
  } else {
    console.warn("❌ Right-Attack animation group not found.");
  }

  // === Add all animation groups ===
  result.animationGroups.forEach((group) => {
    group.stop();
    controller.animationGroups.set(group.name.toLowerCase(), group);
  });

  // === Model Setup ===
  modelRoot.position = new Vector3(0, 10, 0);
  modelRoot.rotationQuaternion = Quaternion.Identity();
  modelRoot.scaling = new Vector3(0.8, 0.8, 0.8);

  result.meshes.forEach((m) => {
    m.isVisible = true;
    m.setEnabled(true);
  });

  instance = controller;
  return controller;
}


  private setEnabled(state: boolean) {
    this.enabled = state;
  }

  private registerInput() {
    this.scene.onKeyboardObservable.add((kbInfo) => {
      const key = kbInfo.event.key.toLowerCase();
      if (kbInfo.type === KeyboardEventTypes.KEYDOWN) {
        this.inputMap[key] = true;
        if (key === "shift") this.isShiftPressed = true;
      } else if (kbInfo.type === KeyboardEventTypes.KEYUP) {
        this.inputMap[key] = false;
        if (key === "shift") this.isShiftPressed = false;
      }
    });

    this.scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
        const event = pointerInfo.event as PointerEvent;
        if (event.button === 0) {
          this.triggerAttack();
        }
      }
    });
  }

private triggerAttack() {
  console.log("🧪 triggerAttack called");

  if (this.isAttacking || !this.skeleton) return;

  const attackGroup = this.animationGroups.get("right-attack");
  if (!attackGroup) {
    console.warn("❌ Animation group 'Right-Attack' not found.");
    return;
  }

  const rightArmBone = this.skeleton.bones.find(b => b.name === "rightarmBone");
  if (!rightArmBone) {
    console.warn("❌ Bone 'rightarmBone' not found.");
    return;
  }

  // Get only animations for rightarmBone
  const armAnimations = attackGroup.targetedAnimations.filter(
    ({ target }) => (target as Bone).name === "rightarmBone"
  );

  if (armAnimations.length === 0) {
    console.warn("⚠️ No animations targeting 'rightarmBone' in Right-Attack group.");
    return;
  }

  // 🧪 DEBUG LOG KEYFRAMES
  armAnimations.forEach(({ animation }) => {
    const keys = animation.getKeys();
    console.log(`🎬 Arm animation '${animation.name}' has ${keys.length} keys`);
    keys.forEach((k, i) => {
      console.log(`  🔹 [${i}] Frame: ${k.frame}, Value: ${JSON.stringify(k.value)}`);
    });
  });

  this.isAttacking = true;

  // ✅ Recommended fallback: Play the whole animation group for visual confirmation
  // Remove this fallback after confirming rightarm animation actually moves something
  attackGroup.start(false, 1.0, attackGroup.from, attackGroup.to, false);
  attackGroup.onAnimationGroupEndObservable.addOnce(() => {
    this.isAttacking = false;
    console.log("✅ Right-attack finished (group)");
  });

  /*
  // 🧪 Alternatively, direct animation on just the bone (keep if you want layered)
  armAnimations.forEach(({ animation }) => {
    this.scene.beginDirectAnimation(
      rightArmBone,
      [animation],
      attackGroup.from,
      attackGroup.to,
      false,
      1.0,
      () => {
        this.isAttacking = false;
        console.log("✅ Right-attack finished (bone)");
      }
    );
  });
  */
}

  private playAnimation(state: AnimationState) {
    if (this.currentState === state) return;

    const animNameMap: Record<string, string> = {
      idle: "Idle",
      walk: "Walk",
      sprint: "Sprint"
    };

    const groupName = animNameMap[state.toLowerCase()] ?? state.toLowerCase();
    const currentAnim = this.animationGroups.get(this.currentState.toLowerCase());
    const nextAnim = this.animationGroups.get(groupName.toLowerCase());

    if (currentAnim) currentAnim.stop();
    if (nextAnim) nextAnim.start(true);

    this.currentState = state;
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
    if (isMoving) {
      moveDir.y = 0;
      moveDir.normalize();
      this.player.position.addInPlace(moveDir.scale(this.speed));
    }

    // Smoothly rotate player to face camera direction
    const cameraForward = this.thirdPersonCam.getForwardRay().direction;
    const yaw = Math.atan2(cameraForward.x, cameraForward.z);
    const targetQuat = Quaternion.FromEulerAngles(0, yaw, 0);
    this.player.rotationQuaternion = Quaternion.Slerp(this.player.rotationQuaternion!, targetQuat, 0.1);

    // 🔄 Always update base animation (Idle, Walk, Sprint), even during attack
    if (isMoving && this.isShiftPressed) {
      this.playAnimation("Sprint");
    } else if (isMoving) {
      this.playAnimation("Walk");
    } else {
      this.playAnimation("Idle");
    }

    // 🎯 Keep camera focused on player
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
