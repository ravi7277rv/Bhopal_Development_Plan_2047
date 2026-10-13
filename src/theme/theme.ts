/**
 * Central visual language for the Bhopal Development Plan application.
 *
 * Keep application-wide colors, typography, elevation, and gradients here so
 * visual changes do not require searching through individual components.
 */
export const siteTheme = {
  colors: {
    navyDeep: "#010b58",
    navy: "#010b58",
    navyLight: "#0345bf",
    blue: "#044cd0",
    text: "#252525",
    gold: "#f5b21b",
    goldBright: "#fbbf24",
    goldDark: "#d99a00",
    surface: "#f1f6fb",
    surfaceRaised: "#ffffff",
    surfaceMuted: "#f8fafc",
    border: "#ededed",
    ink: "#252525",
    inkMuted: "#65788a",
    footer: "#171717",
    white: "#ffffff",
  },
  typography: {
    fontFamily: '"Segoe UI", Arial, Helvetica, sans-serif',
  },
  gradients: {
    header: "#0d4574",
    headerCompact: "linear-gradient(135deg, #010b58 0%, #044cd0 100%)",
    gold: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
    logo: "linear-gradient(135deg, #ffffff 0%, #e8eef5 100%)",
  },
  shadows: {
    header: "0 4px 24px rgba(0, 0, 0, 0.22)",
    panel: "0 10px 32px rgba(0, 0, 0, 0.14)",
  },
} as const;

const cssVariables: Record<string, string> = {
  "--color-navy-deep": siteTheme.colors.navyDeep,
  "--color-navy": siteTheme.colors.navy,
  "--color-navy-light": siteTheme.colors.navyLight,
  "--color-blue": siteTheme.colors.blue,
  "--color-text": siteTheme.colors.text,
  "--color-gold": siteTheme.colors.gold,
  "--color-gold-bright": siteTheme.colors.goldBright,
  "--color-gold-dark": siteTheme.colors.goldDark,
  "--color-surface": siteTheme.colors.surface,
  "--color-surface-raised": siteTheme.colors.surfaceRaised,
  "--color-surface-muted": siteTheme.colors.surfaceMuted,
  "--color-border": siteTheme.colors.border,
  "--color-ink": siteTheme.colors.ink,
  "--color-ink-muted": siteTheme.colors.inkMuted,
  "--color-footer": siteTheme.colors.footer,
  "--font-family-sans": siteTheme.typography.fontFamily,
  "--gradient-header": siteTheme.gradients.header,
  "--gradient-header-compact": siteTheme.gradients.headerCompact,
  "--gradient-gold": siteTheme.gradients.gold,
  "--gradient-logo": siteTheme.gradients.logo,
  "--shadow-header": siteTheme.shadows.header,
  "--shadow-panel": siteTheme.shadows.panel,
};

export function applySiteTheme(): void {
  const root = document.documentElement;

  Object.entries(cssVariables).forEach(([name, value]) => {
    root.style.setProperty(name, value);
  });
}
