import { Moon, Monitor, Sun } from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemePref } from '../../theme/applyTheme';

const NEXT: Record<ThemePref, ThemePref> = { dark: 'light', light: 'system', system: 'dark' };
const ICON = { dark: Moon, light: Sun, system: Monitor };
const LABEL = { dark: 'Escuro', light: 'Claro', system: 'Sistema' };

export function ThemeToggle() {
  const { pref, setPref } = useTheme();
  const Icon = ICON[pref];

  return (
    <button
      type="button"
      onClick={() => setPref(NEXT[pref])}
      title={`Tema: ${LABEL[pref]} — clique para trocar`}
      aria-label={`Tema: ${LABEL[pref]}. Clique para trocar.`}
      className="flex items-center gap-1.5 border border-surface-border rounded-full px-2.5 py-1 text-xs text-app-muted hover:text-app-text hover:border-app-muted-2 transition-colors"
    >
      <Icon size={13} strokeWidth={2} aria-hidden="true" />
      <span className="hidden lg:inline">{LABEL[pref]}</span>
    </button>
  );
}
