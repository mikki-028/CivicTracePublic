import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import logoAsset from "@/assets/civictrace-logo.png.asset.json";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-10 pt-6">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoAsset.url} alt="CivicTrace" className="h-9 w-9" />
          <span className="font-serif text-2xl font-bold text-primary">CivicTrace</span>
        </Link>
        <p className="mt-1 text-sm italic text-muted-foreground">Digital identity for municipal waste</p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export function BigButton({ children, onClick, disabled, type = "button", variant = "primary" }: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; type?: "button" | "submit"; variant?: "primary" | "ghost";
}) {
  const cls = variant === "primary"
    ? "bg-primary text-primary-foreground hover:bg-primary/90"
    : "border-2 border-border bg-card text-foreground hover:bg-muted";
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`w-full rounded-2xl px-5 py-4 text-lg font-semibold transition disabled:opacity-50 ${cls}`}>
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
