import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, BigButton } from "@/components/civic";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CivicTrace — Ward 142 waste QR" },
      { name: "description", content: "Scan a CivicTrace QR on a municipal waste point to report an issue, confirm collection or record an audit." },
      { property: "og:title", content: "CivicTrace — Ward 142 waste QR" },
      { property: "og:description", content: "Report issues and confirm collections at municipal waste points in Ward 142." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const [id, setId] = useState("");
  const navigate = useNavigate();
  return (
    <Shell>
      <div className="rounded-3xl border border-border bg-card p-6">
        <img src="/civictrace-logo.png" alt="CivicTrace" className="h-16 w-16 object-contain" />
        <h1 className="mt-4 text-3xl font-bold leading-tight">
          Scan the <span className="scribble">QR code</span> on a waste point
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Every bin and bulk waste generator in Ward 142 has its own CivicTrace QR. Scan it with your phone camera to open its page.
        </p>
      </div>
      <form
        className="mt-6 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const v = id.trim().toUpperCase();
          if (v) navigate({ to: "/e/$entityId", params: { entityId: v } });
        }}
      >
        <label className="block text-sm font-medium">Or enter the ID printed under the QR</label>
        <input value={id} onChange={(e) => setId(e.target.value)} placeholder="e.g. BIN-0037"
          className="w-full rounded-2xl border-2 border-input bg-card px-4 py-4 text-lg uppercase tracking-wide outline-none focus:border-ring" />
        <BigButton type="submit" disabled={!id.trim()}>Open</BigButton>
      </form>
    </Shell>
  );
}
