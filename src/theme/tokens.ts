import type { Quadrant } from "../types/decision";

export interface AppTheme {
  mode: "light" | "dark";
  colors: {
    background: string;
    backgroundTop: string;
    backgroundBottom: string;
    surface: string;
    surfaceMuted: string;
    surfaceInset: string;
    surfaceElevated: string;
    accent: string;
    accentStrong: string;
    accentWash: string;
    text: string;
    textMuted: string;
    textSoft: string;
    onAccent: string;
    stroke: string;
    highlight: string;
    shadowDark: string;
    shadowLight: string;
    danger: string;
    success: string;
  };
  quadrants: Record<Quadrant, { tint: string; solid: string }>;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    pill: number;
  };
}

const shared = {
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 22,
    xl: 30,
    xxl: 40,
  },
  radius: {
    sm: 14,
    md: 18,
    lg: 24,
    xl: 30,
    pill: 999,
  },
};

export const lightTheme: AppTheme = {
  mode: "light",
  colors: {
    background: "#E6EDF4",
    backgroundTop: "#FAFCFE",
    backgroundBottom: "#D7E0EA",
    surface: "#EEF3F8",
    surfaceMuted: "#E4EBF2",
    surfaceInset: "#DDE6EF",
    surfaceElevated: "#FDFEFF",
    accent: "#8BA2BA",
    accentStrong: "#355E88",
    accentWash: "rgba(77, 111, 146, 0.14)",
    text: "#142230",
    textMuted: "#56687A",
    textSoft: "#7B8D9E",
    onAccent: "#F7FBFF",
    stroke: "rgba(255,255,255,0.78)",
    highlight: "rgba(255,255,255,0.96)",
    shadowDark: "rgba(102, 122, 145, 0.24)",
    shadowLight: "rgba(255,255,255,0.98)",
    danger: "#C86673",
    success: "#4B7662",
  },
  quadrants: {
    doNow: { tint: "rgba(75, 116, 159, 0.14)", solid: "#426A92" },
    schedule: { tint: "rgba(85, 128, 114, 0.16)", solid: "#4F796B" },
    delegate: { tint: "rgba(171, 118, 52, 0.16)", solid: "#9B6828" },
    eliminate: { tint: "rgba(101, 118, 136, 0.14)", solid: "#64788A" },
  },
  ...shared,
};

export const darkTheme: AppTheme = {
  mode: "dark",
  colors: {
    background: "#0A1017",
    backgroundTop: "#121B25",
    backgroundBottom: "#090E14",
    surface: "#131C27",
    surfaceMuted: "#101822",
    surfaceInset: "#0B141D",
    surfaceElevated: "#1A2531",
    accent: "#88A4BE",
    accentStrong: "#53789D",
    accentWash: "rgba(135, 165, 195, 0.16)",
    text: "#F3F7FB",
    textMuted: "#A7B4C1",
    textSoft: "#7D8895",
    onAccent: "#F7FBFF",
    stroke: "rgba(255,255,255,0.06)",
    highlight: "rgba(255,255,255,0.08)",
    shadowDark: "rgba(0,0,0,0.56)",
    shadowLight: "rgba(255,255,255,0.03)",
    danger: "#CC7987",
    success: "#8AB099",
  },
  quadrants: {
    doNow: { tint: "rgba(112, 151, 194, 0.17)", solid: "#C5DAEE" },
    schedule: { tint: "rgba(106, 145, 132, 0.18)", solid: "#BAD5C9" },
    delegate: { tint: "rgba(189, 148, 90, 0.16)", solid: "#E2C088" },
    eliminate: { tint: "rgba(125, 139, 156, 0.16)", solid: "#B3C0CC" },
  },
  ...shared,
};
