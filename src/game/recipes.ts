import { DIFFICULTIES, endlessShrink, levelAt, type Difficulty, type PieceType } from "./types";

export interface Customer {
  avatar: string;
  name: string;
  line: string;
}

export interface Order {
  id: number;
  name: string;
  recipe: PieceType[];
  customer: Customer;
  patience: number; // ms
}

const CUSTOMERS: Customer[] = [
  { avatar: "🧑‍💼", name: "Marcos", line: "Tô no intervalo, voa!" },
  { avatar: "👵", name: "Dona Célia", line: "Capricha, meu filho." },
  { avatar: "🧔", name: "Rafael", line: "Sem pressa nenhuma." },
  { avatar: "👷", name: "Seu Jorge", line: "Tô em obra, anda logo!" },
  { avatar: "👩‍🎤", name: "Bia", line: "Manda o brabo!" },
  { avatar: "🧕", name: "Amina", line: "Com carinho, por favor." },
  { avatar: "👨‍🎓", name: "Dudu", line: "Prova às 8, corre!" },
  { avatar: "🤠", name: "Tião", line: "Esse eu quero gigante." },
  { avatar: "👩‍💻", name: "Lari", line: "Sprint acabando, agiliza!" },
  { avatar: "🧛", name: "Vlad", line: "Ao ponto, por favor." },
  { avatar: "👽", name: "Zyx-9", line: "Levem-me ao seu líder... e ao lanche." },
  { avatar: "🥷", name: "Ninja", line: "..." },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function orderName(recipe: PieceType[]): string {
  const fillings = recipe.slice(1, -1);
  const count = (t: PieceType) => fillings.filter((f) => f === t).length;
  const meat = count("patty");
  const tags: string[] = [];
  if (count("bacon")) tags.push("BACON");
  if (count("egg")) tags.push("EGG");
  if (count("cheese")) tags.push("CHEESE");
  if (count("onion") && tags.length < 2) tags.push("ONION");

  let base = "X-BURGER";
  if (tags.length) base = "X-" + tags[0];
  if (meat >= 2) base = "X-" + (tags[0] ?? "TUDO") + " DUPLO";
  if (fillings.length >= 7) base = "X-TUDO";

  const size =
    fillings.length <= 2
      ? "CLÁSSICO"
      : fillings.length === 3
        ? "SALADA"
        : fillings.length === 4
          ? "SUPREMO"
          : fillings.length === 5
            ? "MONSTRO"
            : "LENDÁRIO";
  return `${base} ${size}`;
}

let orderId = Math.floor(Math.random() * 90) + 10;

export function genOrder(levelIdx: number, difficulty: Difficulty, endlessRounds: number): Order {
  const lvl = levelAt(levelIdx);
  const diff = DIFFICULTIES[difficulty];
  const pieces = lvl.minP + Math.floor(Math.random() * (lvl.maxP - lvl.minP + 1));

  // fillings: always at least one patty, rest random from the level pool
  const fillCount = pieces - 2;
  const fillings: PieceType[] = ["patty"];
  while (fillings.length < fillCount) {
    const next = pick(lvl.pool);
    // avoid 3 identical in a row
    if (fillings.length >= 2 && fillings[fillings.length - 1] === next && fillings[fillings.length - 2] === next)
      continue;
    fillings.push(next);
  }

  const recipe: PieceType[] = ["bun", ...fillings, "bun"];
  const base = lvl.patience * diff.time * endlessShrink(endlessRounds);
  const patience = Math.round(base * (0.92 + Math.random() * 0.2) * 1000);

  return {
    id: ++orderId,
    name: orderName(recipe),
    recipe,
    customer: pick(CUSTOMERS),
    patience,
  };
}
