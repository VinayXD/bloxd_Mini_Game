import { BlockLibrary } from "./BlockLibrary";

// Register all blocks here
export function registerAllBlocks() {
  // ID 0 = air (reserved)
  BlockLibrary.register({
    id: "air",
    textures: "",
    collider: false,
    transparent: true,
  });

  // Now base will get ID = 1
  BlockLibrary.register({
    id: "base",
    textures: "",
    collider: true,
    color: [0.5, 0.5, 0.5] // gray
  });

  BlockLibrary.register({
    id: "base2",
    textures: "",
    collider: true,
    color: [1, 0, 0] // red
  });

  BlockLibrary.register({
    id: "stone",
    textures: "/textures/Brick.png",
    collider: true
  });
}
