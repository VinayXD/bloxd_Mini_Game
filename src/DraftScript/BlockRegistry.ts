import { BlockLibrary } from "./BlockLibrary";

// Register all blocks here
export function registerAllBlocks() {
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

  // You can add more blocks here
}
