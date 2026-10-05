import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// The user's own CivicTrace project (shared with the official dashboard).
// Publishable key is safe for browser use; RLS protects the data.
const URL = "https://kzeibmyavxmxjgxvpote.supabase.co";
const KEY = "sb_publishable_i2Ptz6IejRvjInnuU1vMOQ_scn-CTtU";

let client: SupabaseClient | undefined;
export function ct(): SupabaseClient {
  if (!client) {
    client = createClient(URL, KEY, {
      auth: {
        storageKey: "civictrace-auth",
        persistSession: typeof window !== "undefined",
        autoRefreshToken: typeof window !== "undefined",
      },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (h.get("Authorization") === `Bearer ${KEY}`) h.delete("Authorization");
          h.set("apikey", KEY);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
  }
  return client;
}

export type Entity = { id: string; entity_type: string; ward: string; location: string | null };

export async function getEntity(id: string): Promise<Entity | null> {
  const { data, error } = await ct()
    .from("entities")
    .select("id, entity_type, ward, location")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("network");
  return data as Entity | null;
}

export type Gps = { latitude: number; longitude: number; accuracy: number } | null;

export function captureGps(timeout = 8000): Promise<Gps> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout, maximumAge: 30000 },
    );
  });
}

export async function uploadPhoto(entityId: string, file: File): Promise<string | null> {
  try {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${entityId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await ct().storage.from("event-photos").upload(path, file, { contentType: file.type });
    if (error) return null;
    return ct().storage.from("event-photos").getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

export type Worker = { id: string; employee_number: string; full_name: string | null; role: string };

export async function sendWorkerOtp(employeeNumber: string): Promise<{ phone?: string; error?: string }> {
  const { data: phone, error } = await ct().rpc("worker_phone", { _employee_number: employeeNumber });
  if (error) return { error: "We couldn't reach the server. Please try again." };
  if (!phone) return { error: "We couldn't find that employee number." };
  const { error: otpErr } = await ct().auth.signInWithOtp({ phone: phone as string, options: { shouldCreateUser: true } });
  if (otpErr) return { error: "We couldn't send the code. Please try again in a minute." };
  return { phone: phone as string };
}

export async function verifyWorkerOtp(phone: string, token: string): Promise<{ worker?: Worker; error?: string }> {
  const { error } = await ct().auth.verifyOtp({ phone, token, type: "sms" });
  if (error) return { error: "That code didn't work. Check it and try again." };
  const { data, error: cErr } = await ct().rpc("claim_worker");
  if (cErr || !data || !(data as Worker).id) return { error: "Your identity couldn't be confirmed." };
  return { worker: data as Worker };
}

export function maskPhone(p: string) {
  return p.length > 4 ? `•••• ${p.slice(-4)}` : p;
}
