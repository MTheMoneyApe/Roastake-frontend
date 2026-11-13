import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type LandingLanguage = "en" | "es";
export const LANDING_LANGUAGE_KEY = "roastake-public-language";
const LanguageContext = createContext<{
  language: LandingLanguage;
  setLanguage: (language: LandingLanguage) => void;
}>({ language: "en", setLanguage: () => {} });

/** Public editorial copy only; does not translate or change app transactions. */
export function LandingLanguageProvider({ children }: { children: ReactNode }) {
  const [language, updateLanguage] = useState<LandingLanguage>("en");
  useEffect(() => {
    try {
      if (localStorage.getItem(LANDING_LANGUAGE_KEY) === "es") updateLanguage("es");
    } catch {
      /* A blocked preference store must not block navigation. */
    }
  }, []);
  const setLanguage = (next: LandingLanguage) => {
    updateLanguage(next);
    try {
      localStorage.setItem(LANDING_LANGUAGE_KEY, next);
    } catch {
      /* Session-only fallback. */
    }
  };
  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLandingLanguage() {
  return useContext(LanguageContext);
}
