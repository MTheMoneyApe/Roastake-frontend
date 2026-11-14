import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import en from "@/locales/en";
import es from "@/locales/es";

export const DEGEN_MODE_STORAGE_KEY = "roastake-degen-mode";
const PUBLIC_LANGUAGE_STORAGE_KEY = "roastake-public-language";

type DegenLocale = "en" | "es";
type DegenCopy = {
  standard: string;
  toggle: string;
  active: string;
  banner: string;
  long: string;
  short: string;
  mumu_win: string;
  bobo_hedge: string;
  status_holder: string;
};

type DegenModeContextValue = {
  degenMode: boolean;
  setDegenMode: (enabled: boolean) => void;
  toggleDegenMode: () => void;
  copy: DegenCopy;
  locale: DegenLocale;
};

const DegenModeContext = createContext<DegenModeContextValue | null>(null);

export function DegenModeProvider({ children }: { children: ReactNode }) {
  // Keep SSR deterministic; restore browser preferences only after hydration.
  const [degenMode, setDegenModeState] = useState(false);
  const [locale, setLocale] = useState<DegenLocale>("en");

  useEffect(() => {
    const syncPreferences = () => {
      try {
        setDegenModeState(window.localStorage.getItem(DEGEN_MODE_STORAGE_KEY) === "true");
        setLocale(
          window.localStorage.getItem(PUBLIC_LANGUAGE_STORAGE_KEY) === "es" ? "es" : "en",
        );
      } catch {
        // Blocked storage falls back to safe, in-memory defaults.
      }
    };

    syncPreferences();
    window.addEventListener("storage", syncPreferences);
    return () => window.removeEventListener("storage", syncPreferences);
  }, []);

  useEffect(() => {
    if (degenMode) {
      document.body.dataset.degen = "true";
    } else {
      delete document.body.dataset.degen;
    }
  }, [degenMode]);

  useEffect(
    () => () => {
      delete document.body.dataset.degen;
    },
    [],
  );

  const setDegenMode = useCallback((enabled: boolean) => {
    setDegenModeState(enabled);
    try {
      window.localStorage.setItem(DEGEN_MODE_STORAGE_KEY, String(enabled));
    } catch {
      // Keep the in-memory toggle usable when persistence is unavailable.
    }
  }, []);

  const toggleDegenMode = useCallback(() => {
    setDegenMode(!degenMode);
  }, [degenMode, setDegenMode]);

  const copy = locale === "es" ? es.degen : en.degen;
  const value = useMemo(
    () => ({ degenMode, setDegenMode, toggleDegenMode, copy, locale }),
    [degenMode, setDegenMode, toggleDegenMode, copy, locale],
  );

  return createElement(DegenModeContext.Provider, { value }, children);
}

export function useDegenMode() {
  const context = useContext(DegenModeContext);
  if (!context) {
    throw new Error("useDegenMode must be used inside DegenModeProvider.");
  }
  return context;
}
