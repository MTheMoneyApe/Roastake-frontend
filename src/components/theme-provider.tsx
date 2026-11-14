import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export type Theme = "light" | "dark";
export const THEME_STORAGE_KEY = "roastake-theme";
const THEME_EVENT = "roastake:theme-change";

// Runs before styles/content paint. Deliberately light-first, not OS-dependent.
// No browser APIs execute at module scope or during server rendering.
export const THEME_INIT_SCRIPT = `(function(){var t="light";try{if(localStorage.getItem("${THEME_STORAGE_KEY}")==="dark")t="dark"}catch(e){}var r=document.documentElement;r.classList.toggle("dark",t==="dark");r.dataset.theme=t;r.style.colorScheme=t;var m=document.querySelector('meta[name="color-scheme"]');if(m)m.content=t})()`;

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (meta) meta.content = theme;
  window.dispatchEvent(new Event(THEME_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  return () => window.removeEventListener(THEME_EVENT, onChange);
}

function toggleTheme() {
  const next = currentTheme() === "dark" ? "light" : "dark";
  // Storage can be disabled; the choice must still work for this document.
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Persistence unavailable; preserve the in-memory/document preference.
  }
  applyTheme(next);
}

export function useTheme() {
  // A stable light server snapshot matches SSR/hydration markup; the bootstrap
  // already colors the document, and React reconciles the control after hydration.
  const theme = useSyncExternalStore(subscribe, currentTheme, () => "light" as const);
  return { theme, toggleTheme };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    try {
      applyTheme(window.localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light");
    } catch {
      applyTheme(currentTheme());
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) {
        applyTheme(event.newValue === "dark" ? "dark" : "light");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return children;
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="shrink-0"
      aria-label="Night mode"
      aria-pressed={dark}
      title={`${dark ? "Night" : "Day"} mode — switch to ${dark ? "day" : "night"} mode`}
      onClick={toggleTheme}
    >
      {dark ? (
        <Sun className="size-4" aria-hidden="true" />
      ) : (
        <Moon className="size-4" aria-hidden="true" />
      )}
    </Button>
  );
}
