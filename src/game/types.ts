export type PieceType =
  | "bun"
  | "patty"
  | "cheese"
  | "lettuce"
  | "tomato"
  | "bacon"
  | "egg"
  | "onion";

export interface IngredientDef {
  type: PieceType;
  label: string;
  /** rendered stack height in px (at stack width 172px) */
  h: number;
  /** particle crumb colors */
  crumbs: string[];
}

export const INGREDIENTS: Record<PieceType, IngredientDef> = {
  bun: { type: "bun", label: "Pão", h: 26, crumbs: ["#f2b04a", "#d98f2b", "#ffe9b8"] },
  patty: { type: "patty", label: "Carne", h: 22, crumbs: ["#7a4322", "#5e3115", "#93552c"] },
  cheese: { type: "cheese", label: "Queijo", h: 15, crumbs: ["#ffc63e", "#f5a623", "#ffd76b"] },
  lettuce: { type: "lettuce", label: "Alface", h: 16, crumbs: ["#66bb6a", "#3f9b4f", "#a5d6a7"] },
  tomato: { type: "tomato", label: "Tomate", h: 14, crumbs: ["#e53935", "#ef6f63", "#ff8a80"] },
  bacon: { type: "bacon", label: "Bacon", h: 14, crumbs: ["#c2452f", "#eb8b6d", "#8e2f1f"] },
  egg: { type: "egg", label: "Ovo", h: 17, crumbs: ["#fffdf3", "#ffc93c", "#ffe28a"] },
  onion: { type: "onion", label: "Cebola", h: 12, crumbs: ["#d9b8e8", "#b58bc9", "#efe0f7"] },
};

/** keyboard order — keys 1..8 */
export const STATION_ORDER: PieceType[] = [
  "bun",
  "patty",
  "cheese",
  "lettuce",
  "tomato",
  "bacon",
  "egg",
  "onion",
];

export type Difficulty = "facil" | "medio" | "dificil";

export interface DifficultyDef {
  id: Difficulty;
  label: string;
  desc: string;
  /** patience multiplier */
  time: number;
  /** score multiplier */
  score: number;
  /** highlight expected ingredient */
  hint: boolean;
  emoji: string;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyDef> = {
  facil: {
    id: "facil",
    label: "Fácil",
    desc: "Clientes pacientes, ritmo de praça de alimentação.",
    time: 1.45,
    score: 0.7,
    hint: true,
    emoji: "🙂",
  },
  medio: {
    id: "medio",
    label: "Médio",
    desc: "O padrão da casa. Fila andando, chapa chiando.",
    time: 1,
    score: 1,
    hint: true,
    emoji: "😤",
  },
  dificil: {
    id: "dificil",
    label: "Difícil",
    desc: "Clientes nervosos, sem dicas, pontos em dobro.",
    time: 0.72,
    score: 1.6,
    hint: false,
    emoji: "🤬",
  },
};

export interface LevelDef {
  name: string;
  icon: string;
  /** total pieces incl. both buns */
  minP: number;
  maxP: number;
  /** base patience seconds */
  patience: number;
  /** orders to pass the level */
  target: number;
  pool: PieceType[];
}

const ALL_FILLINGS: PieceType[] = ["patty", "cheese", "lettuce", "tomato", "bacon", "egg", "onion"];

export const LEVELS: LevelDef[] = [
  { name: "Estagiário", icon: "🧢", minP: 4, maxP: 5, patience: 30, target: 5, pool: ALL_FILLINGS.slice(0, 3) },
  { name: "Chapeiro Júnior", icon: "🍟", minP: 4, maxP: 6, patience: 26, target: 6, pool: ALL_FILLINGS.slice(0, 4) },
  { name: "Chapeiro Pleno", icon: "🔪", minP: 5, maxP: 6, patience: 22, target: 7, pool: ALL_FILLINGS.slice(0, 5) },
  { name: "Chapeiro Sênior", icon: "🍔", minP: 5, maxP: 7, patience: 19, target: 8, pool: ALL_FILLINGS.slice(0, 6) },
  { name: "Gerente de Cozinha", icon: "📋", minP: 6, maxP: 8, patience: 17, target: 9, pool: ALL_FILLINGS },
  { name: "Mestre do Burger", icon: "🏆", minP: 6, maxP: 9, patience: 14, target: 10, pool: ALL_FILLINGS },
  { name: "Lenda do Fast Food", icon: "👑", minP: 7, maxP: 10, patience: 12, target: 12, pool: ALL_FILLINGS },
];

export function levelAt(idx: number): LevelDef {
  return LEVELS[Math.min(idx, LEVELS.length - 1)];
}

export function jobTitle(idx: number): string {
  return levelAt(idx).name;
}

/** endless mode: patience shrinks a bit every completed "legend" round */
export function endlessShrink(rounds: number): number {
  return Math.max(0.55, 1 - rounds * 0.06);
}
