import type { Difficulty } from "./types";

const SCORES_KEY = "chapa.scores";
const CAREER_KEY = "chapa.career";
const NAME_KEY = "chapa.playerName";

export interface ScoreEntry {
  name: string;
  score: number;
  level: number;
  diff: Difficulty;
}

export function loadScores(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(SCORES_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as ScoreEntry[];
    return Array.isArray(arr) ? arr.slice(0, 8) : [];
  } catch {
    return [];
  }
}

/** inserts and keeps top 8; returns the rank (0-based) or -1 if it didn't make the table */
export function saveScore(entry: ScoreEntry): number {
  const scores = [...loadScores(), entry].sort((a, b) => b.score - a.score).slice(0, 8);
  try {
    localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
  } catch {
    /* ignore */
  }
  return scores.findIndex((s) => s === entry);
}

export function loadCareer(): { unlocked: number } {
  try {
    const raw = localStorage.getItem(CAREER_KEY);
    if (raw) {
      const c = JSON.parse(raw) as { unlocked: number };
      return { unlocked: Math.max(0, Math.min(6, c.unlocked | 0)) };
    }
  } catch {
    /* ignore */
  }
  return { unlocked: 0 };
}

export function unlockLevel(idx: number) {
  const cur = loadCareer();
  if (idx > cur.unlocked) {
    try {
      localStorage.setItem(CAREER_KEY, JSON.stringify({ unlocked: Math.min(6, idx) }));
    } catch {
      /* ignore */
    }
  }
}

export function loadPlayerName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function savePlayerName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    /* ignore */
  }
}
