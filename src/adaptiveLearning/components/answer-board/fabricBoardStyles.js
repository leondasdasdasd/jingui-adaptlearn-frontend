const COLOR_VALUES = {
  black: "#1d1d1f",
  blue: "#2563eb",
  green: "#16a34a",
  grey: "#8a8f98",
  "light-blue": "#7dd3fc",
  "light-green": "#86efac",
  "light-red": "#fca5a5",
  "light-violet": "#c4b5fd",
  orange: "#f97316",
  red: "#ef4444",
  violet: "#7c3aed",
  yellow: "#facc15",
};

const STROKE_WIDTHS = { s: 2, m: 4, l: 7, xl: 11 };
const DASH_PATTERNS = {
  dashed: [12, 8],
  dotted: [2, 7],
  draw: null,
  solid: null,
};

export const fabricColor = (color) => COLOR_VALUES[color] || COLOR_VALUES.black;
export const fabricStrokeWidth = (size) =>
  STROKE_WIDTHS[size] || STROKE_WIDTHS.s;
export const fabricDashPattern = (dash) => DASH_PATTERNS[dash] || null;

/**
 *
 * @param fill
 * @param color
 */
export function fabricFill(fill, color) {
  if (fill === "none") return "transparent";
  return fabricColor(color);
}

/**
 *
 * @param style
 */
export function fabricShapeStyle(style) {
  return {
    fill: fabricFill(style.fill, style.color),
    opacity:
      style.fill === "semi" ? Math.min(style.opacity, 0.35) : style.opacity,
    stroke: fabricColor(style.color),
    strokeDashArray: fabricDashPattern(style.dash),
    strokeWidth: fabricStrokeWidth(style.size),
  };
}
