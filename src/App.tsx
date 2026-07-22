import { useState } from "react";
import { Menu } from "./screens/Menu";
import { Game } from "./screens/Game";
import { ParticleLayer } from "./game/particles";
import { loadCareer } from "./game/storage";
import type { Difficulty } from "./game/types";

export default function App() {
  const [screen, setScreen] = useState<"menu" | "game">("menu");
  const [run, setRun] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>("medio");
  const [startLevel, setStartLevel] = useState(() => Math.min(loadCareer().unlocked, 6));

  return (
    <div className="no-select h-full">
      {screen === "menu" && (
        <Menu
          initialDiff={difficulty}
          onPlay={(d, lvl) => {
            setDifficulty(d);
            setStartLevel(lvl);
            setRun((r) => r + 1);
            setScreen("game");
          }}
        />
      )}
      {screen === "game" && (
        <Game
          key={run}
          difficulty={difficulty}
          startLevel={startLevel}
          onExit={() => setScreen("menu")}
        />
      )}
      <ParticleLayer />
    </div>
  );
}
