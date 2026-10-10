import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle, Truck, ClipboardCheck, MapPin, Camera, ArrowLeft, CheckCircle2, Loader2, ShieldCheck,
} from "lucide-react";
import { useLanguage } from "@/components/language";
import { Shell, BigButton, Notice } from "@/components/civic";
import {
  getEntity, captureGps, uploadPhoto, ct, sendWorkerOtp, verifyWorkerOtp, maskPhone,
  type Entity, type Worker, type Gps,
} from "@/lib/civictrace";

const ID_RE = /^(BIN|BWG)-\d{4}$/;

export const Route = createFileRoute("/e/$entityId")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.entityId} — CivicTrace` },
      { name: "description", content: `Report an issue, confirm collection or record an audit for ${params.entityId} in Ward 142.` },
      { property: "og:title", content: `${params.entityId} — CivicTrace` },
      { property: "og:description", content: `CivicTrace public page for waste point ${params.entityId}.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EntityPage,
});

type View = "home" | "report" | "collection" | "audit";

function EntityPage() {
  const { t } = useLanguage();
  const { entityId } = Route.useParams();
  const id = entityId.toUpperCase();
  const valid = ID_RE.test(id);
  const [view, setView] = useState<View>("home");
  const q = useQuery({ queryKey: ["entity", id], queryFn: () => getEntity(id), enabled: valid, retry: 1 });

  if (!valid) return <Problem title={t("This QR code isn't valid")} body={t("The code doesn't match a CivicTrace identity. Please check the sticker and scan again.")} />;
  if (q.isLoading) return <Shell><div className="flex justify-center py-20"><Loader2 aria-label={t("Loading waste point…")} className="h-8 w-8 animate-spin text-primary" /></div></Shell>;
  if (q.isError) return <Problem title={t("Can't connect right now")} body={t("Please check your internet connection and try again.")} retry={() => q.refetch()} />;
  if (!q.data) return <Problem title={t("Waste point not found")} body={t("{id} isn't registered in CivicTrace yet.", { id })} />;

  const e = q.data;
  return (
    <Shell>
      <EntityCard e={e} />
      {view === "home" && <Home onPick={setView} />}
      {view === "report" && <ReportFlow e={e} back={() => setView("home")} />}
      {view === "collection" && <WorkerGate back={() => setView("home")}>{(w) => <CollectionFlow e={e} w={w} back={() => setView("home")} />}</WorkerGate>}
      {view === "audit" && <WorkerGate back={() => setView("home")}>{(w) => <AuditFlow e={e} w={w} back={() => setView("home")} />}</WorkerGate>}
    </Shell>
  );
}

function Problem({ title, body, retry }: { title: string; body: string; retry?: () => void }) {
  const { t } = useLanguage();
  return (
    <Shell>
      <div className="rounded-3xl border border-border bg-card p-6">
        <AlertTriangle className="h-8 w-8 text-accent" />
        <h1 className="mt-3 text-2xl font-bold">{title}</h1>
        <p className="mt-2 text-muted-foreground">{body}</p>
      </div>
      <div className="mt-6 space-y-3">
        {retry && <BigButton onClick={retry}>{t("Try again")}</BigButton>}
        <Link to="/" className="block text-center text-primary underline">{t("Enter an ID instead")}</Link>
      </div>
    </Shell>
  );
}

function EntityCard({ e }: { e: Entity }) {
  const { t } = useLanguage();
  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <h1 className="text-4xl font-bold tracking-tight"><span className="scribble">{e.id}</span></h1>
      <p className="mt-3 text-lg font-medium">{t(e.entity_type)}</p>
      <p className="text-base font-semibold text-primary">{t(e.ward)}</p>
      {e.location && <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{e.location}</p>}
    </div>
  );
}

function Home({ onPick }: { onPick: (v: View) => void }) {
  const { t } = useLanguage();
  const items: { v: View; icon: ReactNode; title: string; sub: string }[] = [
    { v: "report", icon: <AlertTriangle className="h-7 w-7" />, title: "Report an issue", sub: "Report an observed problem" },
    { v: "collection", icon: <Truck className="h-7 w-7" />, title: "Confirm collection", sub: "Record a completed collection" },
    { v: "audit", icon: <ClipboardCheck className="h-7 w-7" />, title: "Confirm audit", sub: "Verify / record an inspection" },
  ];
  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold">{t("What would you like to do?")}</h2>
      <div className="mt-3 space-y-3">
        {items.map((i) => (
          <button key={i.v} onClick={() => onPick(i.v)}
            className="flex w-full items-center gap-4 rounded-2xl border-2 border-border bg-card p-5 text-left transition hover:border-primary active:scale-[0.99]">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">{i.icon}</span>
            <span>
              <span className="block text-lg font-bold uppercase tracking-wide text-primary">{t(i.title)}</span>
              <span className="block text-sm text-muted-foreground">{t(i.sub)}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Back({ onClick }: { onClick: () => void }) {
  const { t } = useLanguage();
  return <button onClick={onClick} className="mt-5 flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />{t("Back")}</button>;
}

function PhotoAndGps({ file, setFile, gps, setGps }: { file: File | null; setFile: (f: File | null) => void; gps: Gps | "loading" | "denied"; setGps: (g: Gps | "loading" | "denied") => void }) {
  const { t } = useLanguage();
  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card p-4">
        <Camera className="h-6 w-6 text-primary" />
        <span className="text-sm">{file ? file.name : t("Add a photo (optional)")}</span>
        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
      <button type="button" onClick={async () => { setGps("loading"); const g = await captureGps(); setGps(g ?? "denied"); }}
        className="flex w-full items-center gap-3 rounded-2xl border-2 border-border bg-card p-4 text-left text-sm">
        <MapPin className="h-6 w-6 text-primary" />
        {gps === "loading" ? t("Getting location…") : gps === "denied" ? t("Location unavailable — you can still submit") : gps ? t("Location added (±{accuracy} m)", { accuracy: Math.round(gps.accuracy) }) : t("Add my location (optional)")}
      </button>
    </div>
  );
}

const gpsFields = (g: Gps | "loading" | "denied") =>
  g && typeof g === "object" ? { latitude: g.latitude, longitude: g.longitude, accuracy: g.accuracy } : {};

function Done({ title, lines, back }: { title: string; lines: ReactNode[]; back: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="mt-6 rounded-3xl border border-border bg-card p-6">
      <CheckCircle2 className="h-10 w-10 text-primary" />
      <h2 className="mt-3 text-2xl font-bold">{title}</h2>
      <div className="mt-2 space-y-1 text-base">{lines}</div>
      <div className="mt-6"><BigButton variant="ghost" onClick={back}>{t("Back to waste point")}</BigButton></div>
    </div>
  );
}

const ISSUES = ["Overflowing", "Not collected", "Damaged", "Improper dumping"];

function ReportFlow({ e, back }: { e: Entity; back: () => void }) {
  const { t } = useLanguage();
  const [issue, setIssue] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [gps, setGps] = useState<Gps | "loading" | "denied">(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => { setGps("loading"); captureGps().then((g) => setGps(g ?? "denied")); }, []);

  async function submit() {
    if (!issue) return;
    setBusy(true); setErr(null);
    let photo_url: string | null = null;
    if (file) { photo_url = await uploadPhoto(e.id, file); if (!photo_url) setPhotoFailed(true); }
    const { error } = await ct().from("events").insert({
      entity_id: e.id, event_type: "citizen_report", status: "Unverified", issue_type: issue,
      photo_url, source: "public_qr_website", environment: "field_test", ...gpsFields(gps),
    });
    setBusy(false);
    if (error) setErr("Your report couldn't be sent. Please check your connection and try again.");
    else setDone(true);
  }

  if (done) return <Done title={t("Report submitted")} back={back} lines={[
    <p key="s" className="font-bold">{t("Status:")} <span className="text-accent">{t("Unverified")}</span></p>,
    <p key="b" className="text-muted-foreground">{t("Your report has been recorded and can be reviewed by the municipal authority.")}</p>,
    photoFailed ? <p key="p" className="text-sm text-muted-foreground">{t("The photo couldn't be uploaded, but your report was saved.")}</p> : null,
  ]} />;

  return (
    <div>
      <Back onClick={back} />
      <h2 className="mt-3 text-2xl font-bold">{t("Report an issue")}</h2>
      <p className="text-muted-foreground">{t("What did you notice at {id}?", { id: e.id })}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {ISSUES.map((i) => (
          <button key={i} onClick={() => setIssue(i)}
            className={`rounded-2xl border-2 p-4 text-base font-semibold ${issue === i ? "border-primary bg-secondary text-primary" : "border-border bg-card"}`}>{t(i)}</button>
        ))}
      </div>
      <div className="mt-4"><PhotoAndGps file={file} setFile={setFile} gps={gps} setGps={setGps} /></div>
      {err && <div className="mt-4"><Notice tone="error">{t(err)}</Notice></div>}
      <div className="mt-5"><BigButton onClick={submit} disabled={!issue || busy}>{busy ? t("Sending…") : t("Submit report")}</BigButton></div>
      <p className="mt-3 text-center text-xs text-muted-foreground">{t("No login needed. Your report is reviewed by the municipal authority.")}</p>
    </div>
  );
}

function WorkerGate({ back, children }: { back: () => void; children: (w: Worker) => ReactNode }) {
  const { t } = useLanguage();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [emp, setEmp] = useState("");
  const [phone, setPhone] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (worker) return <>{children(worker)}</>;

  async function send() {
    setBusy(true); setErr(null);
    const r = await sendWorkerOtp(emp.trim().toUpperCase());
    setBusy(false);
    if (r.error) setErr(r.error); else if (r.phone) setPhone(r.phone);
  }
  async function verify() {
    if (!phone) return;
    setBusy(true); setErr(null);
    const r = await verifyWorkerOtp(phone, code.trim());
    setBusy(false);
    if (r.error) setErr(r.error); else if (r.worker) setWorker(r.worker);
  }

  return (
    <div>
      <Back onClick={back} />
      <div className="mt-3 flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary" /><h2 className="text-2xl font-bold">{t("Verify your identity")}</h2></div>
      {!phone ? (
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium">{t("Employee number")}</label>
          <input value={emp} onChange={(e) => setEmp(e.target.value)} aria-label={t("Employee number")} placeholder={t("e.g. EMP1001")}
            className="w-full rounded-2xl border-2 border-input bg-card px-4 py-4 text-lg uppercase outline-none focus:border-ring" />
          {err && <Notice tone="error">{t(err)}</Notice>}
          <BigButton onClick={send} disabled={!emp.trim() || busy}>{busy ? t("Sending…") : t("Send OTP")}</BigButton>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">{t("We sent a code to your registered phone {phone}.", { phone: maskPhone(phone) })}</p>
          <label className="block text-sm font-medium">{t("Enter OTP")}</label>
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} aria-label={t("Enter OTP")} inputMode="numeric" maxLength={6}
            className="w-full rounded-2xl border-2 border-input bg-card px-4 py-4 text-center text-2xl tracking-[0.5em] outline-none focus:border-ring" />
          {err && <Notice tone="error">{t(err)}</Notice>}
          <BigButton onClick={verify} disabled={code.length < 6 || busy}>{busy ? t("Checking…") : t("Verify & continue")}</BigButton>
          <button onClick={() => { setPhone(null); setCode(""); }} className="block w-full text-center text-sm text-primary underline">{t("Use a different employee number")}</button>
        </div>
      )}
    </div>
  );
}

function CollectionFlow({ e, w, back }: { e: Entity; w: Worker; back: () => void }) {
  const { t, formatDate } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [at, setAt] = useState<Date | null>(null);

  async function confirm() {
    setBusy(true); setErr(null);
    const g = await captureGps();
    const { error } = await ct().from("events").insert({
      entity_id: e.id, event_type: "collection", worker_id: w.id, employee_number: w.employee_number,
      source: "public_qr_website", environment: "field_test", ...gpsFields(g),
    });
    setBusy(false);
    if (error) setErr("The collection couldn't be saved. Please try again.");
    else setAt(new Date());
  }

  if (at) return <Done title={t("Record stored")} back={back} lines={[
    <p key="a" className="font-bold">{t("Collection recorded successfully.")}</p>,
    <p key="b">{t("Waste point:")} {e.id}</p>, <p key="c">{t("Time:")} {formatDate(at)}</p>,
  ]} />;

  return (
    <div>
      <Back onClick={back} />
      <h2 className="mt-3 text-2xl font-bold">{t("Confirm collection")}</h2>
      <p className="mt-1 text-muted-foreground">{t("Signed in as {employee}", { employee: w.employee_number })}</p>
      <p className="mt-5 text-lg font-semibold">{t("Was {id} collected?", { id: e.id })}</p>
      {err && <div className="mt-3"><Notice tone="error">{t(err)}</Notice></div>}
      <div className="mt-4"><BigButton onClick={confirm} disabled={busy}>{busy ? t("Saving…") : t("Confirm collection")}</BigButton></div>
      <p className="mt-3 text-center text-xs text-muted-foreground">{t("Your location is added if your phone allows it.")}</p>
    </div>
  );
}

const RESULTS = ["Verified / OK", "Issue found", "Needs attention"];

function AuditFlow({ e, w, back }: { e: Entity; w: Worker; back: () => void }) {
  const { t, formatDate } = useLanguage();
  const [result, setResult] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [gps, setGps] = useState<Gps | "loading" | "denied">(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [at, setAt] = useState<Date | null>(null);

  useEffect(() => { setGps("loading"); captureGps().then((g) => setGps(g ?? "denied")); }, []);

  async function submit() {
    if (!result) return;
    setBusy(true); setErr(null);
    let photo_url: string | null = null;
    if (file) { photo_url = await uploadPhoto(e.id, file); if (!photo_url) setPhotoFailed(true); }
    const { error } = await ct().from("events").insert({
      entity_id: e.id, event_type: "inspection", audit_result: result, note: note.trim() || null, photo_url,
      worker_id: w.id, employee_number: w.employee_number, source: "public_qr_website", environment: "field_test", ...gpsFields(gps),
    });
    setBusy(false);
    if (error) setErr("The audit couldn't be saved. Please try again.");
    else setAt(new Date());
  }

  if (at) return <Done title={t("Audit recorded")} back={back} lines={[
    <p key="a" className="font-bold">{t("Verification stored successfully.")}</p>,
    <p key="b">{t("Waste point:")} {e.id}</p>, <p key="c">{t("Result:")} {result ? t(result) : ""}</p>, <p key="d">{t("Time:")} {formatDate(at)}</p>,
    <p key="e">{t("Verified by:")} {w.employee_number}{w.full_name ? ` (${w.full_name})` : ""}</p>,
    photoFailed ? <p key="p" className="text-sm text-muted-foreground">{t("The photo couldn't be uploaded, but the audit was saved.")}</p> : null,
  ]} />;

  return (
    <div>
      <Back onClick={back} />
      <h2 className="mt-3 text-2xl font-bold">{t("Confirm audit")}</h2>
      <p className="mt-1 text-muted-foreground">{t("Signed in as {employee}", { employee: w.employee_number })}</p>
      <p className="mt-5 text-lg font-semibold">{t("What did you find at {id}?", { id: e.id })}</p>
      <div className="mt-3 space-y-2">
        {RESULTS.map((r) => (
          <button key={r} onClick={() => setResult(r)}
            className={`w-full rounded-2xl border-2 p-4 text-left text-base font-semibold ${result === r ? "border-primary bg-secondary text-primary" : "border-border bg-card"}`}>{t(r)}</button>
        ))}
      </div>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} aria-label={t("Note (optional)")} placeholder={t("Note (optional)")} rows={3}
        className="mt-3 w-full rounded-2xl border-2 border-input bg-card p-4 text-base outline-none focus:border-ring" />
      <div className="mt-3"><PhotoAndGps file={file} setFile={setFile} gps={gps} setGps={setGps} /></div>
      {err && <div className="mt-4"><Notice tone="error">{t(err)}</Notice></div>}
      <div className="mt-5"><BigButton onClick={submit} disabled={!result || busy}>{busy ? t("Saving…") : t("Submit audit")}</BigButton></div>
    </div>
  );
}
