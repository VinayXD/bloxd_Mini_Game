// PlayerAnimation.ts
import { Scene, Skeleton, Bone, AnimationGroup } from "@babylonjs/core";

export type AnimationState = "Idle" | "Walk" | "Sprint" | "Crouch" | "Jump";



const LayeredAnimationConfig: Record<string, string[]> = {
  "Right-Attack": ["rightarmBone"],
  "Left_Attack": ["leftarmBone"],
  "Right-Interact": ["rightarmBone"],
  "Left-Interact": ["leftarmBone"],
};

export class PlayerAnimation {
  private scene: Scene;
  private skeleton: Skeleton;
  private animationGroups: Map<string, AnimationGroup>;
  private currentState: AnimationState = "Idle";

  constructor(scene: Scene, skeleton: Skeleton, animationGroups: AnimationGroup[]) {
    this.scene = scene;
    this.skeleton = skeleton;
    this.animationGroups = new Map();

    console.log("🦴 Skeleton Bones:");
    this.skeleton.bones.forEach(b => console.log("🔹", b.name));

    for (const group of animationGroups) {
      //console.log(`🎞️ Animation Group: ${group.name}`);
      group.targetedAnimations.forEach(({ target, animation }) => {
        const boneName = (target as Bone).name ?? "unknown";
       // console.log(`  👉 Target Bone: ${boneName}, Animation: ${animation.name}, Keys: ${animation.getKeys().length}`);
      });

      const boneNames = LayeredAnimationConfig[group.name];
      if (boneNames) {
        const filtered = group.targetedAnimations.filter(({ target }) =>
          boneNames.includes((target as Bone).name)
        );

        if (filtered.length === 0) {
          //console.warn(`⚠️ No matching animations found for '${group.name}' on bones: ${boneNames.join(", ")}`);
        } else {
          group.targetedAnimations.length = 0;
          filtered.forEach(({ animation, target }) => {
            group.addTargetedAnimation(animation, target);
          });
          //console.log(`✅ Filtered '${group.name}' to only: ${boneNames.join(", ")}`);
        }
      }

      group.stop();
      this.animationGroups.set(group.name.toLowerCase(), group);
    }

    // Add mouse click listener for Left-Attack
    this.scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.event instanceof PointerEvent && pointerInfo.event.button === 0) {
        //console.log("🖱️ Left click detected — triggering Left_Attack");
        this.playLayeredAnimation("Right-Attack");
      }
    });
  }

playBaseAnimation(state: AnimationState) {
  if (this.currentState === state) return;

  const animNameMap: Record<string, string> = {
    idle: "Idle",
    walk: "Walk",
    sprint: "Sprint",
    crouch: "Crouch"
  };

  const groupName = animNameMap[state.toLowerCase()] ?? state.toLowerCase();
  const currentGroup = this.animationGroups.get(this.currentState.toLowerCase());
  const nextGroup = this.animationGroups.get(groupName.toLowerCase());

  if (currentGroup) currentGroup.stop();
  if (nextGroup) nextGroup.start(true);

  this.currentState = state;
}


playLayeredAnimation(name: string) {
  const group = this.animationGroups.get(name.toLowerCase());
  const boneNames = LayeredAnimationConfig[name];

  if (!group) {
    console.warn(`❌ Animation group '${name}' not found.`);
    return;
  }

  if (!boneNames) {
    console.warn(`❌ No bone mapping found for animation '${name}'.`);
    return;
  }

  // 🚧 TEMP: Play full animation group for debug
  //console.warn(`🚧 TEMP: Playing full animation group '${name}' for debug purposes.`);
  group.start(false, 1.0, group.from, group.to, false);
   // comment out this return after confirming animation is visible

  const bones = this.skeleton.bones.filter(b => boneNames.includes(b.name));
  if (bones.length === 0) {
    //console.warn(`⚠️ No bones found in skeleton matching: ${boneNames.join(", ")}`);
    return;
  }

  bones.forEach(bone => {
    const animations = group.targetedAnimations.filter(({ target }) => (target as Bone).name === bone.name);

    if (animations.length === 0) {
      //console.warn(`⚠️ No animations targeting '${bone.name}' in '${name}' group.`);
    } else {
      //console.log(`🎯 Playing ${animations.length} animations for bone '${bone.name}' in '${name}'`);
    }

    animations.forEach(({ animation }) => {
      const keys = animation.getKeys();
      //console.log(`📦 Keys for ${animation.name} on ${bone.name}:`);
      keys.forEach(k => {
        //console.log(`  ⏱ Frame ${k.frame}:`, k.value);
      });

      //console.log(`🎬 Playing animation '${animation.name}' on '${bone.name}'`);
      this.scene.beginDirectAnimation(
        bone,
        [animation],
        group.from,
        group.to,
        false,
        1.0,
        () => console.log(`✅ ${name} finished for ${bone.name}`)
      );
    });
  });
}


}