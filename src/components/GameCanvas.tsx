//Canvas React component
import { useEffect, useRef } from "react";
import { createGame } from "../engine/Game";

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      createGame(canvasRef.current);
    }
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="game-canvas"
      style={{ width: "100vw", height: "100vh", display: "block" }}
    />
  );
}
