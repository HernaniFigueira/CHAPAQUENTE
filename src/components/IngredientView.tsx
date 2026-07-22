import type { PieceType } from "../game/types";
import { INGREDIENTS } from "../game/types";

interface Props {
  type: PieceType;
  /** only relevant for "bun" */
  variant?: "bottom" | "top";
  width?: number;
  className?: string;
}

/** Cartoon fast-food ingredient art, stretched to stack width via preserveAspectRatio="none". */
export function IngredientView({ type, variant = "top", width = 172, className }: Props) {
  const h = INGREDIENTS[type].h;
  const common = {
    className,
    style: { width, height: h, display: "block" as const },
    viewBox: "0 0 120 40",
    preserveAspectRatio: "none" as const,
    "aria-hidden": true,
  };

  switch (type) {
    case "bun":
      return variant === "top" ? (
        <svg {...common}>
          <path d="M6 40 C6 11 26 4 60 4 C94 4 114 11 114 40 Z" fill="#eda93f" />
          <path d="M15 36 C18 17 33 9 58 9" stroke="#f9c96b" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.85" />
          <rect x="10" y="32" width="100" height="8" rx="4" fill="#d98f2b" opacity="0.55" />
          <ellipse cx="38" cy="17" rx="3.4" ry="1.9" fill="#ffe9b8" transform="rotate(-18 38 17)" />
          <ellipse cx="58" cy="12" rx="3.4" ry="1.9" fill="#ffe9b8" transform="rotate(6 58 12)" />
          <ellipse cx="79" cy="17" rx="3.4" ry="1.9" fill="#ffe9b8" transform="rotate(16 79 17)" />
          <ellipse cx="48" cy="26" rx="3" ry="1.7" fill="#ffe9b8" transform="rotate(-8 48 26)" />
          <ellipse cx="70" cy="26" rx="3" ry="1.7" fill="#ffe9b8" transform="rotate(10 70 26)" />
          <ellipse cx="93" cy="28" rx="3" ry="1.7" fill="#ffe9b8" transform="rotate(18 93 28)" />
          <ellipse cx="25" cy="29" rx="3" ry="1.7" fill="#ffe9b8" transform="rotate(-16 25 29)" />
        </svg>
      ) : (
        <svg {...common}>
          <rect x="8" y="6" width="104" height="30" rx="14" fill="#eda93f" />
          <rect x="8" y="6" width="104" height="13" rx="6.5" fill="#f9c96b" />
          <rect x="10" y="26" width="100" height="10" rx="5" fill="#d98f2b" opacity="0.6" />
        </svg>
      );
    case "patty":
      return (
        <svg {...common}>
          <rect x="6" y="6" width="108" height="28" rx="14" fill="#7a4322" />
          <rect x="6" y="6" width="108" height="13" rx="6.5" fill="#93552c" />
          <circle cx="30" cy="25" r="3" fill="#5e3115" />
          <circle cx="56" cy="28" r="2.6" fill="#5e3115" />
          <circle cx="82" cy="24" r="3" fill="#5e3115" />
          <circle cx="99" cy="28" r="2.2" fill="#5e3115" />
          <circle cx="14" cy="28" r="2.2" fill="#5e3115" />
        </svg>
      );
    case "cheese":
      return (
        <svg {...common}>
          <path
            d="M10 6 h100 v14 h-16 v12 a6 6 0 0 1 -12 0 v-12 h-34 v9 a6 6 0 0 1 -12 0 v-9 h-26 z"
            fill="#ffc63e"
          />
          <path d="M10 6 h100 v5 h-100 z" fill="#ffd76b" />
        </svg>
      );
    case "lettuce":
      return (
        <svg {...common}>
          <path
            d="M6 30 C14 10 26 22 34 16 C42 8 54 22 62 14 C70 8 82 22 90 14 C98 8 108 20 114 16 L114 30 C100 39 20 39 6 30 Z"
            fill="#66bb6a"
          />
          <path
            d="M6 30 C14 10 26 22 34 16 C42 8 54 22 62 14 C70 8 82 22 90 14 C98 8 108 20 114 16"
            stroke="#3f9b4f"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      );
    case "tomato":
      return (
        <svg {...common}>
          <rect x="10" y="10" width="46" height="20" rx="10" fill="#e53935" />
          <rect x="16" y="14" width="34" height="12" rx="6" fill="#ef6f63" />
          <rect x="64" y="10" width="46" height="20" rx="10" fill="#e53935" />
          <rect x="70" y="14" width="34" height="12" rx="6" fill="#ef6f63" />
          <circle cx="28" cy="20" r="1.6" fill="#ffd9c2" />
          <circle cx="38" cy="20" r="1.6" fill="#ffd9c2" />
          <circle cx="82" cy="20" r="1.6" fill="#ffd9c2" />
          <circle cx="92" cy="20" r="1.6" fill="#ffd9c2" />
        </svg>
      );
    case "bacon":
      return (
        <svg {...common}>
          <path d="M6 20 Q16 6 26 20 T46 20 T66 20 T86 20 T106 20" stroke="#c2452f" strokeWidth="13" fill="none" strokeLinecap="round" />
          <path d="M6 20 Q16 6 26 20 T46 20 T66 20 T86 20 T106 20" stroke="#eb8b6d" strokeWidth="4.5" fill="none" strokeLinecap="round" />
        </svg>
      );
    case "egg":
      return (
        <svg {...common}>
          <path
            d="M22 24 C18 10 40 6 52 10 C60 2 84 4 90 12 C106 12 108 28 94 32 C84 40 60 38 52 34 C38 40 20 36 22 24 Z"
            fill="#fffdf3"
            stroke="#eadfc6"
            strokeWidth="2.5"
          />
          <circle cx="58" cy="21" r="9.5" fill="#ffc93c" />
          <circle cx="55" cy="18" r="2.6" fill="#ffe28a" />
        </svg>
      );
    case "onion":
      return (
        <svg {...common}>
          <circle cx="28" cy="22" r="11" fill="none" stroke="#cfa6e0" strokeWidth="6" />
          <circle cx="60" cy="20" r="12" fill="none" stroke="#d9b8e8" strokeWidth="6" />
          <circle cx="92" cy="22" r="11" fill="none" stroke="#cfa6e0" strokeWidth="6" />
          <circle cx="28" cy="22" r="11" fill="none" stroke="#efe0f7" strokeWidth="2" />
          <circle cx="60" cy="20" r="12" fill="none" stroke="#efe0f7" strokeWidth="2" />
          <circle cx="92" cy="22" r="11" fill="none" stroke="#efe0f7" strokeWidth="2" />
        </svg>
      );
  }
}
