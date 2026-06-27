"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import type { User } from "@supabase/supabase-js";

// ── Helpers de cookie (sistema AUTH-SHEETS) ────────────────────────────────
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}
function deleteCookie(name: string) {
  document.cookie = `${name}=; Max-Age=0; path=/;`;
}

// ── Types ──────────────────────────────────────────────────────────────────
interface WeightEntry {
  id: number;
  date: string;
  weight_kg: number;
}

interface Vaccine {
  id: number;
  name: string;
  date_applied: string;
  next_dose: string;
}

interface DailyLog {
  id: number;
  date: string;
  food_type: string;
  portions: number;
  notes: string;
}

// ── Fallback data (shown when DB is empty) ─────────────────────────────────
const fallbackWeights: WeightEntry[] = [
  { id: 1, date: "2026-06-01", weight_kg: 8.2 },
  { id: 2, date: "2026-06-10", weight_kg: 8.5 },
  { id: 3, date: "2026-06-20", weight_kg: 8.4 },
];
const fallbackVaccines: Vaccine[] = [
  { id: 1, name: "Antirrábica", date_applied: "2026-01-15", next_dose: "2027-01-15" },
  { id: 2, name: "Parvovirus", date_applied: "2025-11-20", next_dose: "2026-11-20" },
  { id: 3, name: "Moquillo", date_applied: "2025-11-20", next_dose: "2026-11-20" },
];
const fallbackLogs: DailyLog[] = [
  { id: 1, date: "2026-06-24", food_type: "Pienso seco", portions: 2, notes: "Comió todo" },
  { id: 2, date: "2026-06-25", food_type: "Comida húmeda", portions: 1, notes: "Le gustó mucho" },
  { id: 3, date: "2026-06-26", food_type: "Pienso seco", portions: 2, notes: "" },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function today() {
  return new Date().toISOString().split("T")[0];
}
function isUpcoming(dateStr: string) {
  return new Date(dateStr) > new Date();
}

// ── Component ──────────────────────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter();

  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // dog_weight_history
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [newWeight, setNewWeight] = useState("");
  const [weightDate, setWeightDate] = useState(today());

  // dog_vaccines
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [newVaccine, setNewVaccine] = useState({ name: "", date_applied: today(), next_dose: "" });

  // dog_daily_logs
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [newLog, setNewLog] = useState({ food_type: "", portions: 1, notes: "", date: today() });

  // active tab
  const [tab, setTab] = useState<"weight" | "vaccines" | "food">("weight");

  // ── AUTH-SHEETS: verificar cookie user_session ────────────────────────────
  useEffect(() => {
    const sessionEmail = getCookie("user_session");
    if (!sessionEmail) {
      router.replace("/login");
      return;
    }
    // Simula un objeto User mínimo para que el resto del componente funcione
    setUser({ id: "", email: sessionEmail } as unknown as User);
    setAuthLoading(false);
  }, [router]);

  // ── CÓDIGO ORIGINAL SUPABASE — NO BORRAR ──────────────────────────────────
  // Para reactivar: comenta el useEffect de arriba y descomenta el de abajo.
  //
  // useEffect(() => {
  //   supabase.auth.getUser().then(({ data: { user } }) => {
  //     if (user) {
  //       setUser(user);
  //     } else {
  //       router.replace("/login");
  //     }
  //     setAuthLoading(false);
  //   });
  //
  //   const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
  //     if (!session?.user) {
  //       router.replace("/login");
  //     } else {
  //       setUser(session.user);
  //     }
  //   });
  //
  //   return () => subscription.unsubscribe();
  // }, [router]);
  // ──────────────────────────────────────────────────────────────────────────

  // ── Load data once user is confirmed ────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    async function fetchAll() {
      setLoading(true);
      try {
        const [weightsRes, vaccinesRes, logsRes] = await Promise.all([
          supabase.from("dog_weight_history").select("*").eq("user_id", user!.id).order("date", { ascending: true }),
          supabase.from("dog_vaccines").select("*").eq("user_id", user!.id).order("date_applied", { ascending: true }),
          supabase.from("dog_daily_logs").select("*").eq("user_id", user!.id).order("date", { ascending: true }),
        ]);

        setWeights(weightsRes.data && weightsRes.data.length > 0 ? weightsRes.data : fallbackWeights);
        setVaccines(vaccinesRes.data && vaccinesRes.data.length > 0 ? vaccinesRes.data : fallbackVaccines);
        setLogs(logsRes.data && logsRes.data.length > 0 ? logsRes.data : fallbackLogs);
      } catch {
        setWeights(fallbackWeights);
        setVaccines(fallbackVaccines);
        setLogs(fallbackLogs);
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, [user]);

  // ── Handlers ────────────────────────────────────────────────────────────
  async function addWeight() {
    if (!newWeight || !user) return;
    const entry = { date: weightDate, weight_kg: parseFloat(newWeight), user_id: user.id };
    setSaving(true);
    const { data, error } = await supabase.from("dog_weight_history").insert(entry).select().single();
    setSaving(false);
    setWeights((prev) => [...prev, error || !data ? { id: Date.now(), ...entry } : data]);
    setNewWeight("");
    setWeightDate(today());
  }

  async function addVaccine() {
    if (!newVaccine.name || !user) return;
    const entry = { ...newVaccine, user_id: user.id };
    setSaving(true);
    const { data, error } = await supabase.from("dog_vaccines").insert(entry).select().single();
    setSaving(false);
    setVaccines((prev) => [...prev, error || !data ? { id: Date.now(), ...entry } : data]);
    setNewVaccine({ name: "", date_applied: today(), next_dose: "" });
  }

  async function addLog() {
    if (!newLog.food_type || !user) return;
    const entry = { ...newLog, user_id: user.id };
    setSaving(true);
    const { data, error } = await supabase.from("dog_daily_logs").insert(entry).select().single();
    setSaving(false);
    setLogs((prev) => [...prev, error || !data ? { id: Date.now(), ...entry } : data]);
    setNewLog({ food_type: "", portions: 1, notes: "", date: today() });
  }

  async function handleSignOut() {
    // AUTH-SHEETS: limpia la cookie de sesión
    deleteCookie("user_session");
    router.replace("/login");
    // Código original Supabase: await supabase.auth.signOut();
  }

  // ── Block render until session is confirmed ─────────────────────────────
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <span className="text-5xl animate-bounce inline-block">🐶</span>
          <p className="text-amber-500 text-sm">Verificando sesión…</p>
        </div>
      </div>
    );
  }

  // ── Render (user is guaranteed non-null beyond this point) ───────────────
  const tabs = [
    { key: "weight", label: "⚖️ Peso" },
    { key: "vaccines", label: "💉 Vacunas" },
    { key: "food", label: "🍖 Comida" },
  ] as const;

  return (
    <div className="min-h-screen bg-amber-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-amber-100">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center gap-3">
          <span className="text-4xl">🐶</span>
          <div>
            <h1 className="text-2xl font-bold text-amber-800">PetHealth Dashboard</h1>
            <p className="text-sm text-amber-500">Monitoriza la salud de tu perrito</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {loading && <span className="text-xs text-amber-400 animate-pulse">Cargando…</span>}
            <div className="text-right">
              <p className="text-xs text-gray-400 truncate max-w-[160px]">{user?.email}</p>
              <button onClick={handleSignOut} className="text-xs text-amber-500 hover:text-amber-700 underline">
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard emoji="⚖️" label="Último peso" value={loading ? "…" : `${weights.at(-1)?.weight_kg ?? "—"} kg`} color="bg-blue-50 border-blue-200" />
          <StatCard emoji="💉" label="Vacunas registradas" value={loading ? "…" : vaccines.length} color="bg-green-50 border-green-200" />
          <StatCard emoji="🍖" label="Registros de comida" value={loading ? "…" : logs.length} color="bg-orange-50 border-orange-200" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-amber-200">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                tab === key
                  ? "bg-white border border-b-white border-amber-200 text-amber-800 -mb-px"
                  : "text-amber-600 hover:text-amber-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Panels */}
        <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">

          {/* ── Weight ─────────────────────────────────────────────── */}
          {tab === "weight" && (
            <div className="p-6 space-y-6">
              <SectionTitle>Historial de peso</SectionTitle>
              <div className="flex flex-wrap gap-3 items-end bg-amber-50 p-4 rounded-xl">
                <Field label="Fecha">
                  <input type="date" value={weightDate} onChange={(e) => setWeightDate(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Peso (kg)">
                  <input type="number" step="0.1" min="0" placeholder="8.5" value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)} className={inputCls} />
                </Field>
                <AddButton onClick={addWeight} loading={saving}>Añadir</AddButton>
              </div>
              {loading ? <Skeleton rows={3} /> : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-amber-600 border-b border-amber-100">
                      <th className="pb-2 font-semibold">Fecha</th>
                      <th className="pb-2 font-semibold">Peso (kg)</th>
                      <th className="pb-2 font-semibold">Variación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...weights].reverse().map((w, i, arr) => {
                      const prev = arr[i + 1];
                      const diff = prev ? w.weight_kg - prev.weight_kg : null;
                      return (
                        <tr key={w.id} className="border-b border-amber-50 hover:bg-amber-50 transition-colors">
                          <td className="py-3 text-gray-700">{w.date}</td>
                          <td className="py-3 font-semibold text-gray-900">{w.weight_kg} kg</td>
                          <td className="py-3">
                            {diff !== null ? (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${diff > 0 ? "bg-red-100 text-red-600" : diff < 0 ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                                {diff > 0 ? "+" : ""}{diff.toFixed(1)} kg
                              </span>
                            ) : <span className="text-xs text-gray-400">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Vaccines ───────────────────────────────────────────── */}
          {tab === "vaccines" && (
            <div className="p-6 space-y-6">
              <SectionTitle>Registro de vacunas</SectionTitle>
              <div className="flex flex-wrap gap-3 items-end bg-green-50 p-4 rounded-xl">
                <Field label="Vacuna">
                  <input placeholder="Nombre" value={newVaccine.name}
                    onChange={(e) => setNewVaccine((v) => ({ ...v, name: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Fecha aplicación">
                  <input type="date" value={newVaccine.date_applied}
                    onChange={(e) => setNewVaccine((v) => ({ ...v, date_applied: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Próxima dosis">
                  <input type="date" value={newVaccine.next_dose}
                    onChange={(e) => setNewVaccine((v) => ({ ...v, next_dose: e.target.value }))} className={inputCls} />
                </Field>
                <AddButton onClick={addVaccine} loading={saving}>Añadir</AddButton>
              </div>
              {loading ? <Skeleton rows={3} /> : (
                <div className="space-y-3">
                  {vaccines.map((v) => (
                    <div key={v.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-green-200 transition-colors">
                      <div>
                        <p className="font-semibold text-gray-800">{v.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Aplicada: {v.date_applied}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Próxima dosis</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isUpcoming(v.next_dose) ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                          {v.next_dose || "—"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Food logs ──────────────────────────────────────────── */}
          {tab === "food" && (
            <div className="p-6 space-y-6">
              <SectionTitle>Registro de comida diaria</SectionTitle>
              <div className="flex flex-wrap gap-3 items-end bg-orange-50 p-4 rounded-xl">
                <Field label="Fecha">
                  <input type="date" value={newLog.date}
                    onChange={(e) => setNewLog((l) => ({ ...l, date: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Tipo de comida">
                  <input placeholder="Pienso seco…" value={newLog.food_type}
                    onChange={(e) => setNewLog((l) => ({ ...l, food_type: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Porciones">
                  <input type="number" min="1" value={newLog.portions}
                    onChange={(e) => setNewLog((l) => ({ ...l, portions: parseInt(e.target.value) }))} className={`${inputCls} w-20`} />
                </Field>
                <Field label="Notas">
                  <input placeholder="Opcional" value={newLog.notes}
                    onChange={(e) => setNewLog((l) => ({ ...l, notes: e.target.value }))} className={inputCls} />
                </Field>
                <AddButton onClick={addLog} loading={saving}>Añadir</AddButton>
              </div>
              {loading ? <Skeleton rows={3} /> : (
                <div className="space-y-3">
                  {[...logs].reverse().map((l) => (
                    <div key={l.id} className="flex items-start justify-between p-4 rounded-xl border border-gray-100 hover:border-orange-200 transition-colors">
                      <div>
                        <p className="font-semibold text-gray-800">{l.food_type}</p>
                        {l.notes && <p className="text-xs text-gray-500 mt-0.5">{l.notes}</p>}
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="text-xs text-gray-400">{l.date}</p>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                          {l.portions} {l.portions === 1 ? "porción" : "porciones"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ── Small shared components ────────────────────────────────────────────────
const inputCls = "rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white";

function StatCard({ emoji, label, value, color }: { emoji: string; label: string; value: string | number; color: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${color}`}>
      <p className="text-2xl">{emoji}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
      <p className="text-xl font-bold text-gray-800 mt-0.5">{value}</p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold text-gray-800">{children}</h2>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
      {label}
      {children}
    </label>
  );
}

function AddButton({ onClick, loading, children }: { onClick: () => void; loading?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="h-9 px-5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium transition-colors">
      {loading ? "…" : children}
    </button>
  );
}

function Skeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-amber-50 rounded-xl" />
      ))}
    </div>
  );
}
