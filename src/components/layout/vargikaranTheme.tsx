import React from "react";
import {
  Apps as AppsIcon,
  AccountTree as AccountTreeIcon,

  Signpost as SignpostIcon,
  Terrain as TerrainIcon,

  Lightbulb,
  Category,
  HelpOutlineOutlined,
  Block,
  TrendingUp,
} from "@mui/icons-material";

export type ChipTheme = {
  icon: React.ReactNode;
  bg: string;
  text: string;
  iconColor: string;
  activeBg: string;
  cardStrip: string;
  cardIconBg: string;
  cardHoverBorder: string;
  cardHoverShadow: string;
  pillBg: string;
  pillText: string;
  pillBorder: string;
};

const makeTheme = (
  IconEl: React.ReactNode,
  palette: {
    bg: string;
    text: string;
    icon: string;
    active: string;
    strip: string;
    border: string;
    hoverBorder: string;
    hoverShadow: string;
  },
): ChipTheme => ({
  icon: IconEl,
  bg: palette.bg,
  text: palette.text,
  iconColor: palette.icon,
  activeBg: palette.active,
  cardStrip: palette.strip,
cardIconBg: `${palette.bg} ${palette.text}`,
  cardHoverBorder: palette.hoverBorder,
  cardHoverShadow: palette.hoverShadow,
  pillBg: palette.bg,
  pillText: palette.text,
  pillBorder: palette.border,
});

/* ═════════ THEMES (distinct colors) ═════════ */


export const MARG_THEME = makeTheme(
  <SignpostIcon sx={{ fontSize: 18 }} />,
  {
    bg: "bg-red-100",
    text: "text-red-800",
    icon: "text-red-600",
    active: "bg-red-600",
    strip: "bg-red-500",
    border: "border-red-200",
    hoverBorder: "hover:border-red-400",
    hoverShadow: "hover:shadow-[0_4px_18px_rgba(220,38,38,0.18)]",
  },
);

/* भूमि उपयोग — Land Use */
export const BHUMI_THEME = makeTheme(
  <TerrainIcon sx={{ fontSize: 18 }} />,
  {
    bg: "bg-blue-100",
    text: "text-blue-800",
    icon: "text-blue-600",
    active: "bg-blue-600",
    strip: "bg-blue-500",
    border: "border-blue-200",
    hoverBorder: "hover:border-blue-400",
    hoverShadow: "hover:shadow-[0_4px_18px_rgba(37,99,235,0.18)]",
  },
);

/* भूमि उपयोग एवं मार्ग — Land Use + Road */
export const BHUMI_MARG_THEME = makeTheme(
  <AccountTreeIcon sx={{ fontSize: 18 }} />,
  {
    bg: "bg-orange-100",
    text: "text-orange-800",
    icon: "text-orange-600",
    active: "bg-orange-600",
    strip: "bg-orange-500",
    border: "border-orange-200",
    hoverBorder: "hover:border-orange-400",
    hoverShadow: "hover:shadow-[0_4px_18px_rgba(234,88,12,0.18)]",
  },
);

export const SUJHAV_THEME = makeTheme(<Lightbulb sx={{ fontSize: 16 }} />, {
  bg: "bg-emerald-50",
  text: "text-emerald-700",
  icon: "text-emerald-600",
  active: "bg-emerald-600",
  strip: "bg-emerald-500",
  border: "border-emerald-200",
  hoverBorder: "hover:border-emerald-300",
  hoverShadow: "hover:shadow-[0_4px_18px_rgba(16,185,129,0.15)]",
});

export const ANYA_THEME = makeTheme(<Category sx={{ fontSize: 16 }} />, {
  bg: "bg-amber-50",
  text: "text-amber-700",
  icon: "text-amber-600",
  active: "bg-amber-600",
  strip: "bg-amber-500",
  border: "border-amber-200",
  hoverBorder: "hover:border-amber-300",
  hoverShadow: "hover:shadow-[0_4px_18px_rgba(245,158,11,0.15)]",
});

export const ASPASHT_THEME = makeTheme(
  <HelpOutlineOutlined sx={{ fontSize: 16 }} />,
  {
    bg: "bg-zinc-100",
    text: "text-zinc-600",
    icon: "text-zinc-500",
    active: "bg-zinc-500",
    strip: "bg-zinc-400",
    border: "border-zinc-200",
    hoverBorder: "hover:border-zinc-300",
    hoverShadow: "hover:shadow-[0_4px_18px_rgba(113,113,122,0.15)]",
  },
);

export const YOJANA_NAHIN_THEME = makeTheme(<Block sx={{ fontSize: 16 }} />, {
  bg: "bg-rose-50",
  text: "text-rose-700",
  icon: "text-rose-600",
  active: "bg-rose-600",
  strip: "bg-rose-500",
  border: "border-rose-200",
  hoverBorder: "hover:border-rose-300",
  hoverShadow: "hover:shadow-[0_4px_18px_rgba(244,63,94,0.15)]",
});

/* ✅ Lime — सुझाव (emerald) se alag */
export const VIKAS_THEME = makeTheme(<TrendingUp sx={{ fontSize: 16 }} />, {
  bg: "bg-lime-50",
  text: "text-lime-700",
  icon: "text-lime-600",
  active: "bg-lime-600",
  strip: "bg-lime-500",
  border: "border-lime-200",
  hoverBorder: "hover:border-lime-300",
  hoverShadow: "hover:shadow-[0_4px_18px_rgba(132,204,22,0.15)]",
});

export const UN_THEME = makeTheme(
  <HelpOutlineOutlined sx={{ fontSize: 16 }} />,
  {
    bg: "bg-gray-100",
    text: "text-gray-600",
    icon: "text-gray-500",
    active: "bg-gray-500",
    strip: "bg-gray-400",
    border: "border-gray-200",
    hoverBorder: "hover:border-gray-300",
    hoverShadow: "hover:shadow-[0_4px_18px_rgba(107,114,128,0.15)]",
  },
);

export const ALL_THEME = makeTheme(<AppsIcon sx={{ fontSize: 16 }} />, {
  bg: "bg-slate-100",
  text: "text-slate-700",
  icon: "text-slate-600",
  active: "bg-slate-800",
  strip: "bg-slate-400",
  border: "border-slate-200",
  hoverBorder: "hover:border-slate-300",
  hoverShadow: "hover:shadow-[0_4px_16px_rgba(15,23,42,0.08)]",
});

/* ═════════ NORMALIZER + LOOKUP ═════════ */

export const normalizeVargikaran = (value: unknown): string => {
  const v = String(value ?? "").trim();
  if (!v || v === "null" || v === "NULL" || v === "undefined" || v === "—") {
    return "UN";
  }
  return v;
};

export const getVargikaranTheme = (vargikaran: string): ChipTheme => {
  const v = vargikaran.trim();
  const lower = v.toLowerCase();

  // UN / Unclassified
  if (v === "UN" || lower === "unclassified" || lower === "un") {
    return UN_THEME;
  }

  // Road only — मार्ग
  // NOTE: isse PEHLE combination check karo, warna "भूमि उपयोग एवं मार्ग" yahan aa jayega
  // Isliye road-only me strict equality rakhi hai
  if (
    v === "मार्ग" ||
    v === "मार्ग " ||                       // trailing space
    lower === "marg" ||
    lower === "road"
  ) {
    return MARG_THEME;
  }

  // ✅ Robust detection
  const hasBhumi =
    v.includes("भूमि") ||
    v.includes("भुमि") ||                  // variant spelling
    lower.includes("bhumi") ||
    lower.includes("bhoomi");

  const hasMargOrConjunction =
    v.includes("मार्ग") ||
    v.includes("मार्‍ग") ||                // different halant placement
    v.includes("मारग") ||                  // no halant
    v.includes("और") ||                    // "और" instead of "एवं"
    v.includes("एवं") ||
    v.includes("&") ||                     // ampersand
    lower.includes("marg") ||
    lower.includes("road");

  // ⚠️ Combination MUST be checked BEFORE plain भूमि
  if (hasBhumi && hasMargOrConjunction) {
    return BHUMI_MARG_THEME;
  }

  if (hasBhumi) return BHUMI_THEME;

  // सुझाव
  if (v.includes("सुझाव") || lower.includes("sujhav")) {
    return SUJHAV_THEME;
  }

  // अन्य
  if (v === "अन्य" || lower === "anya" || lower === "other") {
    return ANYA_THEME;
  }

  if (v.includes("अस्पष्ट") || lower.includes("aspasht")) {
    return ASPASHT_THEME;
  }

  const hasYojana = v.includes("योजना") || lower.includes("yojana");
  const hasNahi = v.includes("नहीं") || lower.includes("nahi");
  if (hasYojana && hasNahi) {
    return YOJANA_NAHIN_THEME;
  }

  if (v.includes("विकास") || lower.includes("vikas")) {
    return VIKAS_THEME;
  }

  return UN_THEME;
};