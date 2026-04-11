import type { ThemeDefinition } from 'vuetify';
import { themeTokens } from './theme-tokens';

export const lightTheme: ThemeDefinition = {
  dark: false,
  colors: {
    background: themeTokens.colors.paper,
    surface: themeTokens.colors.paper,
    primary: themeTokens.colors.cyan,
    secondary: themeTokens.colors.ink,
    accent: themeTokens.colors.cyanLight,
    info: themeTokens.colors.ivory,
    success: themeTokens.colors.success,
    warning: themeTokens.colors.warning,
    error: themeTokens.colors.danger,
    paper: themeTokens.colors.paper,
    ivory: themeTokens.colors.ivory,
    ink: themeTokens.colors.ink,
    'ink-muted': themeTokens.colors.inkMuted,
    cyan: themeTokens.colors.cyan,
    'cyan-light': themeTokens.colors.cyanLight,
    brass: themeTokens.colors.brass,
    danger: themeTokens.colors.danger,
    'on-background': themeTokens.colors.ink,
    'on-surface': themeTokens.colors.ink,
    'on-primary': themeTokens.colors.paper,
    'on-secondary': themeTokens.colors.paper,
    'surface-variant': themeTokens.colors.ivory,
  },
};
