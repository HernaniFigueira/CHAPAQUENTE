import { useMemo, useState } from "react";
import { cn } from "../utils/cn";
import { DIFFICULTIES, LEVELS, type Difficulty } from "../game/types";
import { loadCareer, loadScores } from "../game/storage";
import { sfx, unlockAudio } from "../game/audio";
import { IngredientView } from "../components/IngredientView";

interface Props {
  initialDiff: Difficulty;
  onPlay: (diff: Difficulty, startLevel: number) => void;
}

const MASCOT: { type: Parameters<typeof IngredientView>[0]["type"]; variant?: "bottom" | "top" }[] = [
  { type: "bun", variant: "bottom" },
  { type: "patty" },
  { type: "cheese" },
  { type: "lettuce" },
  { type: "tomato" },
  { type: "bacon" },
  { type: "bun", variant: "top" },
];

const FLOATERS = [
  { type: "cheese" as const, cls: "left-[4%] top-[16%] w-16 -rotate-12", delay: "0s" },
  { type: "lettuce" as const, cls: "right-[6%] top-[12%] w-20 rotate-12", delay: "1.2s" },
  { type: "tomato" as const, cls: "left-[10%] bottom-[18%] w-14 rotate-6", delay: "2.1s" },
  { type: "bacon" as const, cls: "right-[12%] bottom-[24%] w-16 -rotate-6", delay: "0.7s" },
  { type: "patty" as const, cls: "left-[42%] top-[6%] w-14 rotate-3", delay: "1.7s" },
  { type: "egg" as const, cls: "right-[38%] bottom-[8%] w-14 -rotate-3", delay: "2.6s" },
];

export function Menu({ initialDiff, onPlay }: Props) {
  const [diff, setDiff] = useState<Difficulty>(initialDiff);
  const career = useMemo(loadCareer, []);
  const scores = useMemo(loadScores, []);
  const [startLevel, setStartLevel] = useState(Math.min(career.unlocked, LEVELS.length - 1));
  const [showControls, setShowControls] = useState(false);

  const play = () => {
    unlockAudio();
    sfx.click();
    onPlay(diff, startLevel);
  };

  return (
    <div className="bg-diner relative min-h-dvh overflow-x-hidden">
      {/* ambient floating ingredients */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {FLOATERS.map((f, i) => (
          <div key={i} className={cn("anim-float-slow absolute opacity-[0.13]", f.cls)} style={{ animationDelay: f.delay }}>
            <IngredientView type={f.type} width={90} />
          </div>
        ))}
      </div>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col items-stretch gap-5 px-3 py-5 sm:px-6 sm:py-8">
        {/* ======= neon sign ======= */}
        <header className="sign-bulbs rounded-2xl bg-ketchup-deep p-2 shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
          <div className="flex flex-row items-center gap-3 rounded-xl border-4 border-ketchup-dark bg-gradient-to-b from-[#70110b] to-ketchup-deep px-4 py-3 sm:flex-row sm:gap-6 sm:px-8 sm:py-5">
            <div className="origin-left scale-[0.68] -mr-[35px] shrink-0 sm:mr-0 sm:scale-100" aria-hidden>
              <div className="anim-bob drop-shadow-[0_10px_8px_rgba(0,0,0,0.4)]">
                <div className="flex flex-col items-center">
                  {MASCOT.map((m, i) => (
                    <IngredientView key={i} type={m.type} variant={m.variant} width={110} className="-mb-[3px]" />
                  ))}
                </div>
              </div>
            </div>
            <div className="text-left">
              <p className="font-display text-sm tracking-[0.3em] text-mustard/90">🔥 FAST FOOD SIMULATOR 🔥</p>
              <h1 className="anim-flicker font-display text-[1.75rem] leading-none text-mustard shadow-chunky sm:text-7xl">
                CHAPA QUENTE GG
              </h1>
              <p className="mt-1.5 max-w-md font-body text-[11px] font-medium text-cream/85 sm:text-base">
                Monte, sirva e sobreviva ao horário de pico 😬
              </p>
            </div>
          </div>
        </header>

        <div className="grid flex-1 grid-cols-1 gap-5 lg:grid-cols-[1.15fr_1fr]">
          {/* ======= left: setup + play ======= */}
          <section className="flex flex-col gap-4">
            <div className="rounded-2xl border-4 border-ketchup-dark bg-cream p-4 shadow-[0_8px_0_rgba(0,0,0,0.25)]">
              <h2 className="font-display text-2xl text-ketchup">ESCOLHA O TURNO</h2>
              <div className="mt-3 grid gap-2">
                {(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => {
                  const def = DIFFICULTIES[d];
                  const active = diff === d;
                  return (
                    <button
                      key={d}
                      onClick={() => {
                        sfx.click();
                        setDiff(d);
                      }}
                      className={cn(
                        "btn3d flex items-center gap-3 rounded-xl border-b-4 px-4 py-3 text-left transition-colors",
                        active
                          ? "border-mustard-dark bg-mustard text-choco ring-4 ring-mustard/40"
                          : "border-[#c9b98f] bg-paper text-choco/80 hover:bg-[#fff3d6]",
                      )}
                    >
                      <span className="text-2xl" aria-hidden>
                        {def.emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="font-display block text-lg leading-tight">{def.label}</span>
                        <span className="block text-xs font-medium opacity-75">{def.desc}</span>
                      </span>
                      <span
                        className={cn(
                          "font-display shrink-0 rounded-lg px-2 py-1 text-sm",
                          active ? "bg-choco text-mustard" : "bg-choco/10 text-choco/60",
                        )}
                      >
                        ×{def.score.toFixed(1)} pts
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={play}
              className="btn3d anim-pulse-ring group rounded-2xl border-b-8 border-mustard-dark bg-mustard px-6 py-5 text-center"
            >
              <span className="font-display text-pop block text-4xl text-choco transition-transform group-hover:scale-105 sm:text-5xl">
                ▶ ASSUMIR A CHAPA
              </span>
              <span className="mt-1 block text-xs font-bold tracking-widest text-choco/70 uppercase">
                Começando como {LEVELS[startLevel].icon} {LEVELS[startLevel].name} · {DIFFICULTIES[diff].label}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowControls((v) => !v)}
              aria-expanded={showControls}
              aria-label={showControls ? "Ocultar controles do jogo" : "Mostrar controles do jogo"}
              className="btn3d sm:hidden flex w-full items-center justify-center gap-2 rounded-xl border-b-4 border-[#c9b98f] bg-paper px-4 py-3 text-xl text-choco hover:bg-[#fff3d6]"
            >
              <span aria-hidden>⚙️</span>
            </button>
            <div className={cn("sm:block", !showControls && "hidden")}>
              <div className="grid grid-cols-2 gap-3 text-choco">
                <div className="rounded-xl border-4 border-ketchup-dark bg-paper p-3">
                  <h3 className="font-display text-base text-ketchup">⌨️ TECLADO</h3>
                  <ul className="mt-1 space-y-1 text-xs font-semibold">
                    <li><Kbd>1</Kbd>–<Kbd>8</Kbd> empilhar ingrediente</li>
                    <li><Kbd>ESPAÇO</Kbd> servir o pedido</li>
                    <li><Kbd>⌫</Kbd> / <Kbd>X</Kbd> desfazer peça</li>
                    <li><Kbd>P</Kbd> / <Kbd>ESC</Kbd> pausar</li>
                  </ul>
                </div>
                <div className="rounded-xl border-4 border-ketchup-dark bg-paper p-3">
                  <h3 className="font-display text-base text-ketchup">📱 TOQUE</h3>
                  <ul className="mt-1 space-y-1 text-xs font-semibold">
                    <li>👆 Toque nos ingredientes</li>
                    <li>🟢 Botão SERVIR pra entregar</li>
                    <li>↩️ DESFAZER corrige o erro</li>
                    <li>⏸️ Pausa no canto da tela</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* ======= right: career + scores ======= */}
          <section className="flex flex-col gap-4">
            <div className="rounded-2xl border-4 border-ketchup-dark bg-cream p-4 shadow-[0_8px_0_rgba(0,0,0,0.25)]">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-display text-2xl text-ketchup">PLANO DE CARREIRA</h2>
                <span className="text-[11px] font-bold text-choco/60">toque pra escolher o início</span>
              </div>
              <ol className="mt-3 space-y-1.5">
                {LEVELS.map((lvl, i) => {
                  const locked = i > career.unlocked;
                  const selected = i === startLevel;
                  return (
                    <li key={lvl.name}>
                      <button
                        disabled={locked}
                        onClick={() => {
                          sfx.click();
                          setStartLevel(i);
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg border-2 px-3 py-1.5 text-left transition-all",
                          locked
                            ? "cursor-not-allowed border-choco/10 bg-choco/5 opacity-55"
                            : selected
                              ? "border-mustard-dark bg-mustard shadow-[0_3px_0_rgba(0,0,0,0.25)]"
                              : "border-choco/15 bg-paper hover:border-mustard-dark hover:bg-[#ffedbe]",
                        )}
                      >
                        <span className="w-7 text-center text-xl" aria-hidden>{locked ? "🔒" : lvl.icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className="font-display block truncate text-base leading-tight">{lvl.name}</span>
                          <span className="block text-[11px] font-semibold opacity-70">
                            {locked ? "Desbloqueie completando o nível anterior" : `${lvl.target} pedidos · burgers de ${lvl.minP}–${lvl.maxP} peças`}
                          </span>
                        </span>
                        {selected && <span className="font-display shrink-0 text-xs text-choco">INÍCIO ➤</span>}
                        {!locked && i < career.unlocked && <span className="shrink-0 text-leaf-dark" aria-label="concluído">✔</span>}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="receipt-zig relative rounded-t-md bg-paper px-4 pt-3 pb-7 text-choco shadow-[0_10px_24px_rgba(0,0,0,0.35)]">
              <p className="border-b-2 border-dashed border-choco/25 pb-2 text-center">
                <span className="font-display text-lg tracking-wide">CUPOM DE RECORDES</span>
                <span className="block text-[10px] font-bold tracking-[0.25em] opacity-60">CHAPA QUENTE LTDA.</span>
              </p>
              {scores.length === 0 ? (
                <p className="py-4 text-center text-sm font-semibold opacity-70">
                  Nenhum recorde ainda.<br />Frite o primeiro! 🍔
                </p>
              ) : (
                <ol className="mt-2 space-y-1 font-mono text-[13px] font-bold">
                  {scores.map((s, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className={cn("w-6 shrink-0", i === 0 ? "text-mustard-dark" : "opacity-60")}>
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{s.name || "ANÔNIMO"}</span>
                      <span className="hidden shrink-0 text-[10px] opacity-60 sm:inline">{LEVELS[Math.min(s.level, 6)].icon}</span>
                      <span className="shrink-0 tabular-nums">{s.score.toLocaleString("pt-BR")}</span>
                    </li>
                  ))}
                </ol>
              )}
              <p className="mt-2 border-t-2 border-dashed border-choco/25 pt-2 text-center text-[10px] font-bold tracking-widest opacity-50">
                *** OBRIGADO PELA PREFERÊNCIA ***
              </p>
            </div>
          </section>
        </div>

        <footer className="pb-1 text-center text-[11px] font-semibold tracking-wide text-cream/50">
          Clientes nervosos não esperam · 3 desistências e o turno acaba · Boa sorte na chapa 🔥
        </footer>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-choco/30 bg-white px-1 py-px font-mono text-[10px] shadow-[0_1px_0_rgba(0,0,0,0.2)]">
      {children}
    </kbd>
  );
}
