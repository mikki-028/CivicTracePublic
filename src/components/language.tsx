import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { translate, type Language } from "@/lib/translations";

const LanguageContext = createContext({
  language: "en" as Language,
  setLanguage: (_language: Language) => {},
});
const storageKey = "civictrace-language";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === "en" || saved === "hi") setLanguage(saved);
    } catch { /* Switching still works when storage is unavailable. */ }
  }, []);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  function choose(next: Language) {
    setLanguage(next);
    try { localStorage.setItem(storageKey, next); } catch { /* Optional persistence. */ }
  }
  return <LanguageContext.Provider value={{ language, setLanguage: choose }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  return {
    ...context,
    t: (key: string, values?: Record<string, string | number>) => translate(context.language, key, values),
    formatDate: (date: Date) => date.toLocaleString(context.language === "hi" ? "hi-IN" : "en-IN", { dateStyle: "medium", timeStyle: "short", hour12: false }),
  };
}