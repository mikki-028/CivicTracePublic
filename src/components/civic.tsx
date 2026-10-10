import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useLanguage } from "@/components/language";

export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div role="group" aria-label={t("Language")} className="flex shrink-0 items-center gap-1 text-sm">
      <BigButton variant="ghost" compact pressed={language === "en"} onClick={() => setLanguage("en")}><span lang="en">English</span></BigButton>
      <span className="text-border" aria-hidden="true">|</span>
      <BigButton variant="ghost" compact pressed={language === "hi"} onClick={() => setLanguage("hi")}><span lang="hi">हिंदी</span></BigButton>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-10 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-3">
        <Link to="/" className="flex items-center gap-2">
          <img src="/civictrace-logo.png" alt="CivicTrace" className="h-9 w-9 object-contain" />
          <span className="font-serif text-2xl font-bold text-primary">CivicTrace</span>
        </Link>
        <div className="ml-auto"><LanguageToggle /></div>
        </div>
        <p className="mt-1 text-sm italic text-muted-foreground">{t("Digital identity for municipal waste")}</p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export function BigButton({ children, onClick, disabled, type = "button", variant = "primary", compact = false, pressed }: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; type?: "button" | "submit"; variant?: "primary" | "ghost"; compact?: boolean; pressed?: boolean;
}) {
  const cls = variant === "primary"
    ? "bg-primary text-primary-foreground hover:bg-primary/90"
    : "border-2 border-border bg-card text-foreground hover:bg-muted";
  return (
    <button type={type} onClick={onClick} disabled={disabled} aria-pressed={pressed}
      className={compact ? `rounded-md px-2 py-1.5 font-semibold transition focus-visible:outline-2 focus-visible:outline-ring ${pressed ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-muted"}` : `w-full rounded-2xl px-5 py-4 text-lg font-semibold transition disabled:opacity-50 ${cls}`}>
      {children}
    </button>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error"; children: ReactNode }) {
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${tone === "error" ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-border bg-muted text-muted-foreground"}`}>
      {children}
    </div>
  );
}
