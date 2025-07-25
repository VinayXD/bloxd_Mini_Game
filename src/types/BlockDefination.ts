export type Face = "top" | "bottom" | "left" | "right" | "front" | "back";
export type BlockTextures = string | Partial<Record<Face, string>>;
export type BlockTexturesInput = string | Partial<Record<Face | "side", string>>;

export interface BlockDefinition {
  id: string;
  name?: string;
  textures: BlockTextures;
  collider: boolean;
  transparent?: boolean;
   color?: [number, number, number];
}
