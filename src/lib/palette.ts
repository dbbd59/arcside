export const FOLDER_COLORS = [
  "#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c", "#38d9a9", "#4dabf7", "#9775fa", "#f783ac"
];

export const SPACE_COLORS = [
  "#2f6df6", "#0ea5e9", "#14b8a6", "#12a37f", "#22c55e", "#c9a227",
  "#e5742b", "#ef4444", "#d9468f", "#a855f7", "#7c4dff", "#64748b"
];

export const SPACE_GRADIENTS: { name: string; from: string; to: string }[] = [
  { name: "Aurora", from: "#2f6df6", to: "#7c4dff" },
  { name: "Sunset", from: "#ff6b6b", to: "#ffa94d" },
  { name: "Lagoon", from: "#0ea5e9", to: "#14b8a6" },
  { name: "Orchid", from: "#d9468f", to: "#7c4dff" },
  { name: "Meadow", from: "#22c55e", to: "#0ea5e9" },
  { name: "Ember", from: "#f59e0b", to: "#ef4444" },
  { name: "Candy", from: "#6366f1", to: "#ec4899" },
  { name: "Midnight", from: "#0f172a", to: "#2f6df6" }
];

export const spaceFill = (color: string, color2?: string) => color2 ? `linear-gradient(135deg, ${color}, ${color2})` : color;
