import {
  AnimationGroup,
  Bone,
  Skeleton,
  TargetedAnimation,
} from "@babylonjs/core";

export class PlayerAnimator {
  private animations: Record<string, AnimationGroup> = {};
  private current?: AnimationGroup;
  private currentState: string = "";
  private skeleton: Skeleton;

  private leftAttack?: AnimationGroup;
  private rightAttack?: AnimationGroup;
  private leftArm?: Bone;
  private rightArm?: Bone;

  constructor(animationGroups: AnimationGroup[], skeleton: Skeleton) {
    this.skeleton = skeleton;

    // Index animations by lowercase name
    for (const group of animationGroups) {
      this.animations[group.name.toLowerCase()] = group;
    }

    // Find arm bones
    this.leftArm = skeleton.bones.find(b => b.name === "leftarmBone");
    this.rightArm = skeleton.bones.find(b => b.name === "rightarmBone");

    // Setup arm-specific attack animations
    const leftRaw = this.animations["left_attack"];
    const rightRaw = this.animations["right-attack"];

    if (leftRaw && this.leftArm) {
      this.leftAttack = this.isolateAnimationToBone(leftRaw, this.leftArm, "LeftArmAttack");
    }

    if (rightRaw && this.rightArm) {
      this.rightAttack = this.isolateAnimationToBone(rightRaw, this.rightArm, "RightArmAttack");
    }
  }

  /**
   * Clone an animation group and keep only the targeted bone animation
   */
  private isolateAnimationToBone(
    sourceGroup: AnimationGroup,
    targetBone: Bone,
    name: string
  ): AnimationGroup {
    const clone = new AnimationGroup(name);

    for (const ta of sourceGroup.targetedAnimations) {
      if (ta.target === targetBone) {
        const clonedAnim = ta.animation.clone();
        clone.addTargetedAnimation(clonedAnim, ta.target);
      }
    }

    return clone;
  }

  /**
   * Sets the main full-body animation (Idle, Walk, Sprint, etc.)
   */
  public setState(name: string) {
    const key = name.toLowerCase();
    if (this.currentState === key) return;

    if (this.current) this.current.stop();

    const next = this.animations[key];
    if (next) {
      next.start(true); // loop
      this.current = next;
      this.currentState = key;
    } else {
      console.warn(`🚫 Animation '${name}' not found`);
    }
  }

  /**
   * Play left or right attack as a layered one-shot on a specific bone
   */
public playAttack(type: "left" | "right") {
  if (type === "left") {
    if (this.leftAttack) {
      console.log("🎯 Playing LEFT attack on leftarmBone");
      this.leftAttack.play(false);
    } else {
      console.warn("❌ Left attack animation not found or not set up correctly.");
    }
  }

  if (type === "right") {
    if (this.rightAttack) {
      console.log("🎯 Playing RIGHT attack on rightarmBone");
      this.rightAttack.play(false);
    } else {
      console.warn("❌ Right attack animation not found or not set up correctly.");
    }
  }
}


  public stop() {
    if (this.current) this.current.stop();
    this.current = undefined;
    this.currentState = "";
  }

  public update(_dt: number) {
    // Optional: For blending, syncing, etc.
  }

  public getCurrentState(): string {
    return this.currentState;
  }
}
