import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  SceneLoader,
  AnimationGroup,
  Mesh,
} from "@babylonjs/core";
import "@babylonjs/loaders";

// Local animation storage
const inputMap: Record<string, boolean> = {};
const animations: Record<string, AnimationGroup> = {};
let activeBaseAnimation: AnimationGroup | null = null;

export async function setupPlayerAnimation(scene: Scene, canvas: HTMLCanvasElement) {
  // Camera
  const camera = new ArcRotateCamera("cam", Math.PI / 2, Math.PI / 2.5, 10, Vector3.Zero(), scene);
  camera.attachControl(canvas, true);

  // Light
  new HemisphericLight("light", new Vector3(0, 1, 0), scene);

  // Load player model
  const result = await SceneLoader.ImportMeshAsync("", "models/", "ninja.glb", scene);
  const root = result.meshes[0] as Mesh;
  root.position.set(0, 10, 0); // You can change Y to e.g., 1 or 2 if it's below ground
  root.scaling.set(1, 1, 1);

  // Store animations
  for (const ag of result.animationGroups) {
    animations[ag.name] = ag;
    console.log("🔹 Found animation:", ag.name);
  }

  // Keyboard input tracking
  scene.onKeyboardObservable.add((kbInfo) => {
    const key = kbInfo.event.key;

    if (kbInfo.type === 1) inputMap[key] = true; // KeyDown
    else if (kbInfo.type === 2) inputMap[key] = false; // KeyUp

    // Spacebar triggers layered animation
    if (kbInfo.type === 1 && key === " ") {
      playLayeredAnimation("Right-Attack");
    }
  });

  // Run movement handler
  scene.onBeforeRenderObservable.add(() => {
    handleMovement();
  });

  // Start with Idle
  playBaseAnimation("Idle");
}

function handleMovement() {
  if (inputMap["w"] || inputMap["a"] || inputMap["s"] || inputMap["d"]) {
    if (inputMap["Shift"]) {
      playBaseAnimation("Sprint");
    } else {
      playBaseAnimation("Walk");
    }
  } else {
    playBaseAnimation("Idle");
  }
}

function playBaseAnimation(name: string) {
  if (activeBaseAnimation?.name === name) return;

  if (activeBaseAnimation) activeBaseAnimation.stop();

  const anim = animations[name];
  if (anim) {
    anim.start(true); // Loop
    activeBaseAnimation = anim;
  }
}

function playLayeredAnimation(name: string) {
  const anim = animations[name];
  if (!anim) {
    console.warn(`⚠️ Layered animation '${name}' not found.`);
    return;
  }

  anim.stop();
  anim.play(false); // play once

  const duration = (anim.to - anim.from) / 60;
  setTimeout(() => {
    anim.stop();
  }, duration * 1000);
}
