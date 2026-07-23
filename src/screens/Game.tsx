import { useEffect, useRef, useState } from "react";
import { cn } from "../utils/cn";
import {
  DIFFICULTIES,
  INGREDIENTS,
  STATION_ORDER,
  jobTitle,
  levelAt,
  LEVELS,
  type Difficulty,
  type PieceType,
} from "../game/types";
import { genOrder, type Order } from "../game/recipes";
import { loadPlayerName, loadScores, savePlayerName, saveScore, type ScoreEntry } from "../game/storage";
import { isMuted, setMuted, sfx, unlockAudio } from "../game/audio";
import { fx } from "../game/particles";
import { IngredientView } from "../components/IngredientView";

interface Props {
  difficulty: Difficulty;
  startLevel: number;
  onExit: () => void;
}

type Phase = "playing" | "served" | "angry" | "levelup" | "over";
type Mood = "happy" | "ok" | "nervous";

interface Popup {
  id: number;
  x: number;
  y: number;
  text: string;
  tone: "good" | "bad" | "info";
  big?: boolean;
}

const MAX_STRIKES = 3;

export function Game({ difficulty, startLevel, onExit }: Props) {
  const diff = DIFFICULTIES[difficulty];

  // ---- mutable run state (single source of truth) + hud mirror ----
  const S = useRef({
    score: 0,
    combo: 0,
    maxCombo: 0,
    strikes: 0,
    served: 0,
    levelIdx: startLevel,
    inLevel: 0,
    endless: 0,
  });
  const [hud, setHud] = useState({ ...S.current });
  const sync = () => setHud({ ...S.current });

  const [order, setOrder] = useState<Order | null>(null);
  const [stack, setStack] = useState<PieceType[]>([]);
  const [phase, setPhase] = useState<Phase>("playing");
  const [paused, setPaused] = useState(false);
  const [mood, setMood] = useState<Mood>("happy");
  const [popups, setPopups] = useState<Popup[]>([]);
  const [reject, setReject] = useState<{ id: number; type: PieceType } | null>(null);
  const [muted, setMutedState] = useState(isMuted());

  // refs mirroring fast-changing state for rAF / keydown closures
  const orderRef = useRef<Order | null>(null);
  const stackRef = useRef<PieceType[]>([]);
  const phaseRef = useRef<Phase>("playing");
  const pausedRef = useRef(false);
  const moodRef = useRef<Mood>("happy");
  const patienceRef = useRef(0);
  const patienceMaxRef = useRef(1);
  const lastSecRef = useRef(99);
  const hadMistakeRef = useRef(false);
  const steamAccRef = useRef(0);
  const idRef = useRef(0);

  // dom refs
  const shakeRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const stackElRef = useRef<HTMLDivElement>(null);
  const customerRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);

  const timeoutsRef = useRef<number[]>([]);
  const goCommitRef = useRef<(() => void) | null>(null);
  const schedule = (ms: number, fn: () => void) => {
    const t = window.setTimeout(fn, ms);
    timeoutsRef.current.push(t);
  };
  const clearTimers = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  useEffect(() => () => clearTimers(), []);

  // ---------- juice helpers ----------

  const doShake = (power: number) => {
    const el = shakeRef.current;
    if (!el) return;
    el.classList.remove("anim-shake");
    el.style.setProperty("--sp", `${power}px`);
    el.style.setProperty("--sr", `${power * 0.055}deg`);
    void el.offsetWidth;
    el.classList.add("anim-shake");
  };

  const flashRed = () => {
    const el = flashRef.current;
    if (!el) return;
    el.classList.remove("anim-flash");
    void el.offsetWidth;
    el.classList.add("anim-flash");
  };

  const clientCenter = (el: HTMLElement | null, yFrac = 0.5) => {
    if (!el) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height * yFrac };
  };

  const addPopup = (text: string, tone: Popup["tone"], big = false) => {
    const zone = zoneRef.current;
    const w = zone ? zone.clientWidth : 300;
    const h = zone ? zone.clientHeight : 300;
    const id = ++idRef.current;
    const p: Popup = {
      id,
      x: w / 2 + (Math.random() * 44 - 22),
      y: h * 0.3 + (Math.random() * 20 - 10),
      text,
      tone,
      big,
    };
    setPopups((ps) => [...ps.slice(-5), p]);
    schedule(950, () => setPopups((ps) => ps.filter((q) => q.id !== id)));
  };

  // ---------- core flow ----------

  const nextOrder = () => {
    const o = genOrder(S.current.levelIdx, difficulty, S.current.endless);
    orderRef.current = o;
    setOrder(o);
    stackRef.current = [];
    setStack([]);
    hadMistakeRef.current = false;
    setReject(null);
    patienceMaxRef.current = o.patience;
    patienceRef.current = o.patience;
    lastSecRef.current = Math.ceil(o.patience / 1000) + 1;
    moodRef.current = "happy";
    setMood("happy");
    if (barRef.current) {
      barRef.current.style.width = "100%";
      barRef.current.style.background = "#43a047";
    }
    phaseRef.current = "playing";
    setPhase("playing");
  };

  const gameOver = () => {
    phaseRef.current = "over";
    setPhase("over");
    sfx.gameover();
  };

  const handleAngry = () => {
    if (phaseRef.current !== "playing") return;
    phaseRef.current = "angry";
    setPhase("angry");
    S.current.strikes += 1;
    S.current.combo = 0;
    sync();
    sfx.angry();
    doShake(11);
    flashRed();
    const c = clientCenter(customerRef.current, 0.4);
    fx.angryExplode(c.x, c.y);
    fx.steam(c.x, c.y - 20);
    schedule(950, () => {
      if (S.current.strikes >= MAX_STRIKES) gameOver();
      else nextOrder();
    });
  };

  const place = (type: PieceType) => {
    if (phaseRef.current !== "playing" || pausedRef.current) return;
    const o = orderRef.current;
    if (!o) return;
    unlockAudio();
    const expected = o.recipe[stackRef.current.length];
    if (type === expected) {
      const i = stackRef.current.length;
      stackRef.current = [...stackRef.current, type];
      setStack(stackRef.current);
      sfx.place(i);
      const pts = Math.round(10 * diff.score);
      S.current.score += pts;
      sync();
      addPopup(`+${pts}`, "good");
      const top = stackElRef.current;
      const c = top ? clientCenter(top, 0) : clientCenter(zoneRef.current, 0.55);
      fx.crumbs(c.x, c.y + 6, INGREDIENTS[type].crumbs);
      if (stackRef.current.length === o.recipe.length) sfx.pop();
    } else {
      hadMistakeRef.current = true;
      const rid = ++idRef.current;
      setReject({ id: rid, type });
      schedule(520, () => setReject((r) => (r && r.id === rid ? null : r)));
      sfx.bad();
      doShake(5);
      patienceRef.current = Math.max(0, patienceRef.current - patienceMaxRef.current * 0.08);
      addPopup("PEÇA ERRADA!", "bad");
    }
  };

  const undo = () => {
    if (phaseRef.current !== "playing" || pausedRef.current) return;
    if (!stackRef.current.length) return;
    stackRef.current = stackRef.current.slice(0, -1);
    setStack(stackRef.current);
    sfx.undo();
  };

  const serve = () => {
    if (phaseRef.current !== "playing" || pausedRef.current) return;
    const o = orderRef.current;
    if (!o) return;
    unlockAudio();
    if (stackRef.current.length < o.recipe.length) {
      hadMistakeRef.current = true;
      sfx.bad();
      doShake(7);
      addPopup("INCOMPLETO!", "bad");
      patienceRef.current = Math.max(0, patienceRef.current - patienceMaxRef.current * 0.15);
      return;
    }
    // success!
    const frac = Math.max(0, patienceRef.current / patienceMaxRef.current);
    const perfect = !hadMistakeRef.current;
    S.current.combo += 1;
    S.current.maxCombo = Math.max(S.current.maxCombo, S.current.combo);
    let pts = Math.round((100 + Math.round(120 * frac) + (perfect ? 50 : 0)) * diff.score);
    pts += 25 * Math.min(S.current.combo - 1, 10);
    S.current.score += pts;
    S.current.served += 1;
    sync();
    sfx.serve();
    doShake(3);
    if (perfect) {
      schedule(240, () => sfx.perfect());
      addPopup("PERFEITO!", "good", true);
    }
    addPopup(`+${pts}`, "good", true);
    const zc = clientCenter(zoneRef.current, 0.45);
    fx.confetti(zc.x, zc.y);
    phaseRef.current = "served";
    setPhase("served");

    const lvl = levelAt(S.current.levelIdx);
    const done = S.current.inLevel + 1;
    schedule(850, () => {
      if (done >= lvl.target) {
        S.current.levelIdx += 1;
        if (S.current.levelIdx > LEVELS.length - 1) S.current.endless += 1;
        S.current.inLevel = 0;
        sync();
        try {
          // unlock career progress
          const raw = localStorage.getItem("chapa.career");
          const cur = raw ? (JSON.parse(raw) as { unlocked: number }).unlocked : 0;
          localStorage.setItem(
            "chapa.career",
            JSON.stringify({ unlocked: Math.max(cur, Math.min(S.current.levelIdx, LEVELS.length - 1)) }),
          );
        } catch {
          /* ignore */
        }
        phaseRef.current = "levelup";
        setPhase("levelup");
        sfx.levelup();
        fx.confetti(window.innerWidth / 2, window.innerHeight * 0.35);
        schedule(600, () => fx.confetti(window.innerWidth * 0.3, window.innerHeight * 0.3));
        schedule(2200, () => nextOrder());
      } else {
        S.current.inLevel = done;
        sync();
        nextOrder();
      }
    });
  };

  const resetRun = () => {
    clearTimers();
    pausedRef.current = false;
    setPaused(false);
    S.current = {
      score: 0,
      combo: 0,
      maxCombo: 0,
      strikes: 0,
      served: 0,
      levelIdx: startLevel,
      inLevel: 0,
      endless: 0,
    };
    sync();
    setPopups([]);
    nextOrder();
  };

  const togglePause = () => {
    if (phaseRef.current === "over") return;
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
    sfx.click();
  };

  const toggleMute = () => {
    const m = !isMuted();
    setMuted(m);
    setMutedState(m);
  };

  // expose latest closures to stable listeners
  const api = useRef({ place, undo, serve, resetRun, togglePause, toggleMute, onExit });
  api.current = { place, undo, serve, resetRun, togglePause, toggleMute, onExit };

  // ---------- first order ----------
  useEffect(() => {
    nextOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- patience rAF loop (direct DOM updates → 60fps) ----------
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(50, t - last);
      last = t;
      if (!pausedRef.current && phaseRef.current === "playing" && orderRef.current) {
        patienceRef.current -= dt;
        const max = patienceMaxRef.current;
        const frac = Math.max(0, patienceRef.current / max);
        if (barRef.current) {
          barRef.current.style.width = `${frac * 100}%`;
          barRef.current.style.background = frac > 0.55 ? "#43a047" : frac > 0.28 ? "#fb8c00" : "#e53935";
        }
        if (timeRef.current) timeRef.current.textContent = `${Math.max(0, patienceRef.current / 1000).toFixed(1)}s`;

        const sec = Math.ceil(Math.max(0, patienceRef.current) / 1000);
        if (sec !== lastSecRef.current) {
          lastSecRef.current = sec;
          if (sec <= 5 && sec > 0) sfx.tick();
        }

        const m: Mood = frac > 0.55 ? "happy" : frac > 0.28 ? "ok" : "nervous";
        if (m !== moodRef.current) {
          moodRef.current = m;
          setMood(m);
        }
        if (m === "nervous") {
          steamAccRef.current += dt;
          if (steamAccRef.current > 650) {
            steamAccRef.current = 0;
            const c = clientCenter(customerRef.current, 0.1);
            fx.steam(c.x, c.y);
          }
        }

        if (patienceRef.current <= 0) handleAngry();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- keyboard ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const a = api.current;
      const k = e.key;
      if (phaseRef.current === "over") {
        if (k === "Enter" || k.toLowerCase() === "r") {
          e.preventDefault();
          goCommitRef.current?.();
          a.resetRun();
        } else if (k === "Escape") {
          goCommitRef.current?.();
          a.onExit();
        }
        return;
      }
      if (k === "p" || k === "P" || k === "Escape") {
        e.preventDefault();
        a.togglePause();
        return;
      }
      if (k === "m" || k === "M") {
        a.toggleMute();
        return;
      }
      if (pausedRef.current) {
        if (k === " " || k === "Enter") {
          e.preventDefault();
          a.togglePause();
        }
        return;
      }
      if (k === " " || k === "Enter") {
        e.preventDefault();
        a.serve();
        return;
      }
      if (k === "Backspace" || k.toLowerCase() === "x") {
        e.preventDefault();
        a.undo();
        return;
      }
      const idx = "12345678".indexOf(k);
      if (idx >= 0) a.place(STATION_ORDER[idx]);
    };
    window.addEventListener("keydown", onKey);
    const onHide = () => {
      if (document.hidden && phaseRef.current === "playing" && !pausedRef.current) api.current.togglePause();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, []);

  // ---------- derived ----------
  const lvl = levelAt(hud.levelIdx);
  const expectedType = order ? order.recipe[stack.length] : undefined;
  const ready = !!order && stack.length === order.recipe.length && phase === "playing";

  return (
    <div ref={shakeRef} className="bg-diner relative flex h-dvh flex-col overflow-hidden select-none">
      <div ref={flashRef} className="pointer-events-none absolute inset-0 z-[45] bg-ketchup opacity-0" />

      {/* ============ HUD ============ */}
      <header className="z-30 flex h-14 shrink-0 items-center gap-2 border-b-4 border-[#3a0a06] bg-ketchup-deep px-2 text-cream sm:gap-3 sm:px-4">
        <button
          onClick={togglePause}
          className="btn3d flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-b-4 border-[#c98f00] bg-mustard text-base text-choco"
          aria-label={paused ? "Continuar" : "Pausar"}
        >
          {paused ? "▶" : "⏸"}
        </button>

        <div className="flex min-w-0 items-center gap-2 rounded-lg bg-black/25 px-2.5 py-1">
          <span className="text-lg" aria-hidden>{lvl.icon}</span>
          <div className="min-w-0">
            <p className="font-display truncate text-[13px] leading-tight sm:text-sm">{jobTitle(hud.levelIdx)}</p>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-14 overflow-hidden rounded-full bg-black/40 sm:w-20">
                <div
                  className="h-full rounded-full bg-mustard transition-all duration-300"
                  style={{ width: `${Math.min(100, (hud.inLevel / lvl.target) * 100)}%` }}
                />
              </div>
              <span className="text-[10px] font-bold opacity-80">
                {hud.inLevel}/{lvl.target}
              </span>
            </div>
          </div>
        </div>

        <div className="relative mx-auto min-w-0 flex-1 text-center">
          <p className="text-[9px] font-extrabold tracking-[0.25em] text-cream/60 uppercase">Pontos</p>
          <p key={hud.score} className="anim-pop font-display text-2xl leading-none text-mustard text-pop sm:text-3xl">
            {hud.score.toLocaleString("pt-BR")}
          </p>
          {hud.combo >= 2 && (
            <span
              key={hud.combo}
              className="anim-pop font-display absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-ketchup px-2 py-px text-[10px] text-cream shadow"
            >
              COMBO ×{hud.combo} 🔥
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 rounded-lg bg-black/25 px-2 py-1" aria-label="clientes perdidos">
          {Array.from({ length: MAX_STRIKES }).map((_, i) => (
            <span
              key={i}
              className={cn("text-base sm:text-lg", i < hud.strikes && "anim-pop")}
              aria-hidden
            >
              {i < hud.strikes ? "😡" : "🍔"}
            </span>
          ))}
        </div>

        <button
          onClick={toggleMute}
          className="btn3d hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border-b-4 border-black/30 bg-paper text-base sm:flex"
          aria-label="Som"
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </header>

      {/* ============ main ============ */}
      <main className="relative z-10 flex min-h-0 flex-1 flex-col sm:flex-row">
        {/* --- orders rail --- */}
        <aside className="flex flex-col shrink-0 gap-2 border-b-4 border-[#3a0a06] bg-[#5c0f0a] px-2 py-2 sm:w-[300px] sm:flex-col sm:gap-3 sm:overflow-y-auto sm:border-r-4 sm:border-b-0 sm:p-3">
          {order && (
            <>
              {/* customer */}
              <div
                ref={customerRef}
                key={`c${order.id}`}
                className={cn(
                  "anim-slide-in-left relative w-full shrink-0 rounded-xl border-4 bg-cream p-2 sm:w-full",
                  phase === "angry" ? "anim-slide-out-left border-ketchup" : mood === "nervous" ? "anim-wobble border-ketchup" : mood === "ok" ? "border-[#fb8c00]" : "border-leaf-dark",
                )}
              >
                {mood === "nervous" && phase !== "angry" && (
                  <span className="anim-pulse-ring-red font-display absolute -top-2.5 -right-2 z-10 rotate-6 rounded-md bg-ketchup px-1.5 py-px text-[10px] text-cream shadow">
                    NERVOSO!
                  </span>
                )}
                <div className="flex items-center gap-2 sm:gap-3">
                  <span
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[3px] bg-white text-2xl sm:h-14 sm:w-14 sm:text-3xl",
                      mood === "nervous" ? "border-ketchup bg-red-100" : mood === "ok" ? "border-[#fb8c00] bg-orange-50" : "border-leaf-dark bg-green-50",
                    )}
                    aria-hidden
                  >
                    {phase === "served" ? "😋" : phase === "angry" ? "🤬" : order.customer.avatar}
                  </span>
                  <div className="min-w-0">
                    <p className="font-display truncate text-sm leading-tight text-choco sm:text-base">{order.customer.name}</p>
                    <p className="line-clamp-2 text-[10px] leading-tight font-semibold text-choco/60 italic sm:text-xs">
                      “{order.customer.line}”
                    </p>
                  </div>
                </div>
                {/* patience */}
                <div className="mt-2 flex items-center gap-1.5">
                  <div className="h-3 flex-1 overflow-hidden rounded-full border border-black/20 bg-[#3b2314]/80">
                    <div ref={barRef} className="h-full rounded-full" style={{ width: "100%", background: "#43a047" }} />
                  </div>
                  <span ref={timeRef} className="font-display w-11 text-right text-[11px] text-choco tabular-nums">
                    {(order.patience / 1000).toFixed(1)}s
                  </span>
                </div>
              </div>

              {/* ticket */}
              <div
                key={`t${order.id}`}
                className="anim-ticket-in relative flex min-w-0 flex-1 flex-col rounded-md bg-paper px-2 pt-2 pb-1.5 shadow-[0_6px_14px_rgba(0,0,0,0.4)] sm:min-h-0 sm:pt-3"
              >
                <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-[#2b1a10] bg-[#8e1b12] shadow" aria-hidden />
                <div className="flex items-center justify-between gap-2 border-b-2 border-dashed border-choco/25 pb-1">
                  <span className="font-mono text-[10px] font-bold text-choco/60">PEDIDO #{order.id}</span>
                  <span className="font-display truncate rounded bg-mustard px-1.5 py-px text-[11px] text-choco">{order.name}</span>
                </div>
                <ol className="mt-1 flex flex-col-reverse gap-px pr-0.5 sm:max-h-none sm:flex-1">
                  {order.recipe.map((p, i) => {
                    const done = i < stack.length;
                    const current = i === stack.length && phase !== "served" && phase !== "angry";
                    const isTop = i === order.recipe.length - 1;
                    const isBottom = i === 0;
                    return (
                      <li
                        key={i}
                        className={cn(
                          "flex items-center gap-1.5 rounded px-1 py-px transition-colors",
                          done ? "opacity-90" : current ? "bg-mustard/25 ring-2 ring-mustard" : "opacity-35 grayscale",
                        )}
                      >
                        <span className="w-3 text-center text-[9px] font-extrabold text-choco/50">{i + 1}</span>
                        <IngredientView type={p} variant={isTop ? "top" : isBottom ? "bottom" : "top"} width={40} />
                        <span className="text-[10px] font-bold text-choco/75">{INGREDIENTS[p].label}</span>
                        <span className="ml-auto text-[10px] font-extrabold">
                          {done ? <span className="text-leaf-dark">✔</span> : current ? <span className="anim-pop inline-block text-mustard-dark">▶</span> : ""}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </>
          )}
        </aside>

        {/* --- kitchen / assembly zone --- */}
        <section className="relative min-h-0 flex-1">
          <div ref={zoneRef} className="bg-tiles absolute inset-0">
            {/* steam vent decor */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/15 to-transparent" />

            {/* popups */}
            {popups.map((p) => (
              <span
                key={p.id}
                className={cn(
                  "anim-floatup font-display pointer-events-none absolute z-20 whitespace-nowrap",
                  p.big ? "text-3xl sm:text-4xl" : "text-lg sm:text-xl",
                  p.tone === "good" ? "text-leaf-dark [text-shadow:2px_2px_0_rgba(255,255,255,0.7)]" : p.tone === "bad" ? "text-ketchup [text-shadow:2px_2px_0_rgba(255,255,255,0.7)]" : "text-choco",
                )}
                style={{ left: p.x, top: p.y }}
              >
                {p.text}
              </span>
            ))}

            {/* stamps */}
            {phase === "served" && (
              <div className="anim-stamp font-display absolute top-[38%] left-1/2 z-20 rounded-lg border-4 border-leaf-dark bg-leaf/90 px-4 py-1 text-3xl tracking-wide text-white shadow-xl sm:text-4xl">
                SERVIDO!
              </div>
            )}
            {phase === "angry" && (
              <div className="anim-stamp font-display absolute top-[38%] left-1/2 z-20 rounded-lg border-4 border-ketchup-deep bg-ketchup/95 px-4 py-1 text-2xl tracking-wide text-cream shadow-xl sm:text-3xl">
                CLIENTE PERDIDO!
              </div>
            )}

            {/* plate + stack */}
            <div className="absolute inset-x-0 bottom-3 flex items-end justify-center sm:bottom-6">
              <div className="relative h-[220px] w-[200px] sm:h-[280px] sm:w-[240px]">
                <div className="absolute bottom-0 left-1/2 h-4 w-[190px] -translate-x-1/2 rounded-[50%] bg-[#d9c39a] shadow-[0_6px_10px_rgba(0,0,0,0.3)] sm:w-[224px]" />
                <div className="absolute bottom-[6px] left-1/2 h-3.5 w-[180px] -translate-x-1/2 rounded-[50%] bg-gradient-to-b from-[#fdf3dd] to-[#e6d3ac] sm:w-[212px]" />
                <div
                  ref={stackElRef}
                  className={cn("absolute bottom-[12px] left-1/2 w-[148px] -translate-x-1/2 sm:w-[172px]", phase === "served" && "anim-serve-out")}
                >
                  {stack.map((p, i) => {
                    const isBottom = i === 0;
                    const isTop = order !== null && i === order.recipe.length - 1;
                    const bottom = stack.slice(0, i).reduce((a, t) => a + INGREDIENTS[t].h, 0) - i * 3;
                    return (
                      <div key={`${i}-${p}`} className="anim-drop absolute right-0 left-0" style={{ bottom }}>
                        <IngredientView type={p} variant={isBottom ? "bottom" : isTop ? "top" : "top"} width={undefined} className="!w-full" />
                      </div>
                    );
                  })}
                  {reject && (
                    <div
                      key={reject.id}
                      className="anim-reject absolute right-0 left-0"
                      style={{ bottom: stack.reduce((a, t) => a + INGREDIENTS[t].h, 0) - stack.length * 3 }}
                    >
                      <IngredientView type={reject.type} width={undefined} className="!w-full [filter:saturate(0.4)_brightness(0.9)]" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ============ station ============ */}
      <footer className="relative z-20 shrink-0">
        <div className="checker h-2.5 w-full opacity-80" />
        <div className="border-t-4 border-[#3a0a06] bg-[#4a0d08] px-2 pt-2 pb-[max(8px,env(safe-area-inset-bottom))] sm:px-4">
          <div className="mx-auto grid max-w-2xl grid-cols-4 gap-1.5 sm:gap-2">
            {STATION_ORDER.map((t, i) => {
              const def = INGREDIENTS[t];
              const hinted = diff.hint && phase === "playing" && !paused && t === expectedType;
              const flashed = reject?.type === t;
              return (
                <button
                  key={t}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    place(t);
                  }}
                  className={cn(
                    "btn3d relative flex flex-col items-center rounded-lg border-b-4 border-choco/30 bg-paper px-1 pt-1 pb-0.5",
                    hinted && "anim-pulse-ring border-mustard-dark bg-[#ffedbe] ring-2 ring-mustard",
                    flashed && "border-ketchup bg-red-200 ring-2 ring-ketchup",
                  )}
                  aria-label={def.label}
                >
                  <span className="hidden absolute top-0.5 right-1 font-mono text-[9px] font-bold text-choco/45 sm:block">{i + 1}</span>
                  <IngredientView type={t} width={44} className="pointer-events-none" />
                  <span className="font-display mt-0.5 text-[10px] leading-none text-choco sm:text-xs">{def.label}</span>
                </button>
              );
            })}
          </div>
          <div className="mx-auto mt-1.5 flex max-w-2xl gap-1.5 sm:mt-2 sm:gap-2">
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                undo();
              }}
              className="btn3d font-display w-28 shrink-0 rounded-lg border-b-4 border-black/30 bg-paper py-2 text-sm text-choco sm:w-36 sm:text-base"
            >
              ↩ DESFAZER
            </button>
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                serve();
              }}
              className={cn(
                "btn3d font-display flex-1 rounded-lg border-b-4 border-leaf-dark bg-leaf py-2 text-lg tracking-wide text-white text-pop sm:text-2xl",
                ready && "anim-pulse-ring border-mustard-dark bg-mustard text-choco",
              )}
            >
              {ready ? "SERVIR AGORA! 🔔" : "SERVIR 🍔"}
            </button>
          </div>
        </div>
      </footer>

      {/* ============ overlays ============ */}
      {paused && phase !== "over" && (
        <Overlay>
          <div className="anim-bounce-in w-full max-w-xs rounded-2xl border-4 border-ketchup-dark bg-cream p-5 text-center shadow-2xl">
            <h2 className="font-display text-4xl text-ketchup">PAUSA ⏸</h2>
            <p className="mt-1 text-xs font-semibold text-choco/60">A chapa espera… mas o cliente não.</p>
            <div className="mt-4 grid gap-2">
              <MenuBtn color="mustard" onClick={togglePause}>▶ CONTINUAR</MenuBtn>
              <MenuBtn color="paper" onClick={resetRun}>🔁 RECOMEÇAR TURNO</MenuBtn>
              <MenuBtn color="paper" onClick={onExit}>🏠 MENU</MenuBtn>
              <MenuBtn color="paper" onClick={toggleMute}>{muted ? "🔇 SOM DESLIGADO" : "🔊 SOM LIGADO"}</MenuBtn>
            </div>
          </div>
        </Overlay>
      )}

      {phase === "levelup" && (
        <Overlay dim>
          <div className="anim-bounce-in w-full max-w-sm rounded-2xl border-4 border-mustard-dark bg-cream p-6 text-center shadow-2xl">
            <p className="font-display text-lg tracking-[0.3em] text-ketchup">
              {hud.levelIdx > LEVELS.length - 1 ? "MODO LENDÁRIO" : "🎉 PROMOÇÃO! 🎉"}
            </p>
            <p className="mt-2 text-5xl" aria-hidden>{levelAt(hud.levelIdx).icon}</p>
            <h2 className="font-display mt-1 text-3xl text-choco">{jobTitle(hud.levelIdx)}</h2>
            <p className="mt-1 text-xs font-bold text-choco/60">
              {hud.levelIdx > LEVELS.length - 1
                ? "Você já é lenda — agora os clientes correm contra VOCÊ."
                : `Novos ingredientes e menos tempo. Sirva ${levelAt(hud.levelIdx).target} pedidos!`}
            </p>
          </div>
        </Overlay>
      )}

      {phase === "over" && (
        <GameOverPanel
          registerCommit={(fn) => (goCommitRef.current = fn)}
          score={hud.score}
          served={hud.served}
          maxCombo={hud.maxCombo}
          strikes={hud.strikes}
          levelIdx={hud.levelIdx}
          diffId={difficulty}
          onRestart={resetRun}
          onExit={onExit}
        />
      )}
    </div>
  );
}

/* ================= overlays ================= */

function Overlay({ children, dim }: { children: React.ReactNode; dim?: boolean }) {
  return (
    <div className={cn("absolute inset-0 z-40 flex items-center justify-center p-4", dim ? "bg-[#200805]/60" : "bg-[#200805]/85")}>
      {children}
    </div>
  );
}

function MenuBtn({ children, onClick, color }: { children: React.ReactNode; onClick: () => void; color: "mustard" | "paper" }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "btn3d font-display rounded-xl border-b-4 px-4 py-2.5 text-base",
        color === "mustard" ? "border-mustard-dark bg-mustard text-choco" : "border-choco/25 bg-paper text-choco",
      )}
    >
      {children}
    </button>
  );
}

/* ================= game over ================= */

interface GOProps {
  registerCommit: (fn: () => void) => void;
  score: number;
  served: number;
  maxCombo: number;
  strikes: number;
  levelIdx: number;
  diffId: Difficulty;
  onRestart: () => void;
  onExit: () => void;
}

function GameOverPanel({ registerCommit, score, served, maxCombo, strikes, levelIdx, diffId, onRestart, onExit }: GOProps) {
  const [name, setName] = useState(loadPlayerName());
  const [scores, setScores] = useState<ScoreEntry[]>(() => loadScores());
  const [rank, setRank] = useState(-1);
  const committedRef = useRef(false);

  const qualifies = score > 0;

  const commit = () => {
    if (committedRef.current || !qualifies) return false;
    committedRef.current = true;
    const finalName = (name.trim() || "ANÔNIMO").slice(0, 12).toUpperCase();
    savePlayerName(finalName);
    const r = saveScore({ name: finalName, score, level: levelIdx, diff: diffId });
    setRank(r);
    setScores(loadScores());
    sfx.pop();
    return r >= 0;
  };

  // re-register every render so the latest name input is captured by keyboard shortcuts
  useEffect(() => {
    registerCommit(commit);
  });

  const restart = () => {
    commit();
    onRestart();
  };
  const exit = () => {
    commit();
    onExit();
  };

  const isRecord = rank === 0;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center overflow-y-auto bg-[#200805]/88 p-3">
      <div className="anim-bounce-in my-auto w-full max-w-md">
        <div className="receipt-zig rounded-t-xl bg-paper px-5 pt-4 pb-8 text-choco shadow-2xl">
          <p className="border-b-2 border-dashed border-choco/30 pb-2 text-center">
            <span className="font-display text-3xl text-ketchup">FIM DO TURNO!</span>
            <span className="mt-0.5 block text-[10px] font-bold tracking-[0.3em] opacity-50">
              {strikes >= MAX_STRIKES ? "3 CLIENTES FORAM EMBORA NERVOSOS…" : "TURNO ENCERRADO"}
            </span>
          </p>

          {isRecord && (
            <p className="anim-pop font-display mt-2 rounded-lg bg-mustard py-1 text-center text-lg text-choco">
              🏆 NOVO RECORDE DA CASA! 🏆
            </p>
          )}

          <div className="mt-3 space-y-1 font-mono text-[13px] font-bold">
            <ReceiptRow label="PONTOS" value={score.toLocaleString("pt-BR")} big />
            <ReceiptRow label="BURGERS SERVIDOS" value={`${served}`} />
            <ReceiptRow label="MELHOR COMBO" value={`×${maxCombo}`} />
            <ReceiptRow label="CARGO FINAL" value={`${levelAt(levelIdx).icon} ${jobTitle(levelIdx)}`} />
            <ReceiptRow label="TURNO" value={DIFFICULTIES[diffId].label.toUpperCase()} />
          </div>

          {qualifies && (
            <div className="mt-3 border-t-2 border-dashed border-choco/30 pt-3">
              <label className="text-[10px] font-extrabold tracking-widest opacity-60 uppercase">Seu nome no cupom</label>
              <div className="mt-1 flex gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase())}
                  maxLength={12}
                  placeholder="CHAPEIRO(A)"
                  disabled={committedRef.current}
                  className="min-w-0 flex-1 rounded-lg border-2 border-choco/30 bg-white px-3 py-1.5 font-mono text-sm font-bold tracking-widest outline-none focus:border-mustard-dark"
                />
                <button
                  onClick={commit}
                  disabled={committedRef.current}
                  className={cn(
                    "btn3d font-display shrink-0 rounded-lg border-b-4 px-3 py-1.5 text-sm",
                    committedRef.current ? "border-choco/20 bg-choco/10 text-choco/50" : "border-leaf-dark bg-leaf text-white",
                  )}
                >
                  {committedRef.current ? "SALVO ✔" : "SALVAR"}
                </button>
              </div>
            </div>
          )}

          {scores.length > 0 && (
            <ol className="mt-3 space-y-0.5 border-t-2 border-dashed border-choco/30 pt-2 font-mono text-[12px] font-bold">
              {scores.map((s, i) => (
                <li key={i} className={cn("flex items-center gap-2 rounded px-1.5 py-0.5", i === rank && "bg-mustard")}>
                  <span className="w-5 shrink-0 opacity-70">{i + 1}.</span>
                  <span className="min-w-0 flex-1 truncate">{s.name}</span>
                  <span className="shrink-0 text-[10px] opacity-50">{LEVELS[Math.min(s.level, LEVELS.length - 1)].icon}</span>
                  <span className="shrink-0 tabular-nums">{s.score.toLocaleString("pt-BR")}</span>
                </li>
              ))}
            </ol>
          )}

          <div className="mt-4 grid gap-2">
            <button
              onClick={restart}
              className="btn3d font-display rounded-xl border-b-4 border-mustard-dark bg-mustard px-4 py-3 text-xl text-choco"
            >
              🔁 JOGAR DE NOVO <span className="text-xs opacity-70">(ENTER)</span>
            </button>
            <button
              onClick={exit}
              className="btn3d font-display rounded-xl border-b-4 border-choco/25 bg-paper px-4 py-2.5 text-base text-choco"
            >
              🏠 VOLTAR AO MENU <span className="text-xs opacity-60">(ESC)</span>
            </button>
          </div>

          <p className="mt-3 text-center text-[9px] font-bold tracking-[0.25em] opacity-40">*** VOLTE SEMPRE ***</p>
        </div>
      </div>
    </div>
  );
}

function ReceiptRow({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[10px] tracking-widest opacity-60">{label}</span>
      <span className="flex-1 border-b-2 border-dotted border-choco/25" />
      <span className={cn("tabular-nums", big ? "font-display text-2xl text-ketchup" : "")}>{value}</span>
    </div>
  );
}
