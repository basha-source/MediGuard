export const Colors = {
  primary:       "#2E7D32",
  primaryLight:  "#4CAF50",
  primaryPale:   "#E8F5E9",
  accent:        "#00C853",
  bg:            "#F4F7F4",
  card:          "#FFFFFF",
  textPrimary:   "#1B1B1B",
  textSecondary: "#6B6B6B",
  alertRed:      "#E53935",
  orange:        "#FB8C00",
  redPale:       "#FFF2F2",
  orangePale:    "#FFF7E6",
  greenDark:     "#388E3C",
  white:         "#FFFFFF",
} as const;

export type ColorKey = keyof typeof Colors;
