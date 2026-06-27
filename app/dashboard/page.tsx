"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}
function deleteCookie(name: string) {
  document.cookie = `${name}=; Max-Age=0; path=/;`;
}

interface WeightEntry { id: number; date: string; weight_kg: number; }
interface Vaccine { id: number; name: string; date_applied: string; next_dose: string; }
interface DailyLog { id: number; date: string; food_type: string; portions: number; notes: string; }

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

function today() { return new Date().toISOString().split("T")[0]; }
function isUpcoming(dateStr: string) { return new Date(dateStr) > new Date(); }

export default function Dashboard() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [weights, setWeights] = useState<WeightEntry[]>(fallbackWeights);
  const [newWeight, setNewWeight] = useState("");
  const [weightDate, setWeightDate] = useState(today());

  const [vaccines, setVaccines] = useState<Vaccine[]>(fallbackVaccines);
  const [newVaccine, setNewVaccine] = useState({ name: "", date_applied: today(), next_dose: "" });

  const [logs, setLogs] = useState<DailyLog[]>(fallbackLogs);
  const [newLog, setNewLog] = useState({ food_type: "", portions: 1, notes: "", date: today() });

  const [tab, setTab] = useState<"weight" | "vaccines" | "food">("weight");

  useEffect(() => {
    const email = getCookie("user_session");
    if (!email) {
      router.replace("/login");
      return;
    }
    setUserEmail(email);
    setAuthLoading(false);
  }, [router]);

  function addWeight() {
    if (!newWeight) return;
    setSaving(true);
    setWeights((prev) => [...prev, { id: Date.now(), date: weightDate, weight_kg: parseFloat(newWeight) }]);
    setNewWeight("");
    setWeightDate(today());
    setSaving(false);
  }

  function addVaccine() {
    if (!newVaccine.name) return;
    setSaving(true);
    setVaccines((prev) => [...prev, { id: Date.now(), ...newVaccine }]);
    setNewVaccine({ name: "", date_applied: today(), next_dose: "" });
    setSaving(false);
  }

  function addLog() {
    if (!newLog.food_type) return;
    setSaving(true);
    setLogs((prev) => [...prev, { id: Date.now(), ...newLog }]);
    setNewLog({ food_type: "", portions: 1, notes: "", date: today() });
    setSaving(false);
  }

  function handleSignOut() {
    deleteCookie("user_session");
    router.replace("/login");
  }

  if (authLoading || !userEmail) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <span className="text-5xl animate-bounce inline-block">🐶</span>
          <p className="text-amber-500 text-sm">Verificando sesión…</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "weight", label: "⚖️ Peso" },
    { key: "vaccines", label: "💉 Vacunas" },
    { key: "food", label: "🍖 Comida" },
  ] as const;

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-white shadow-sm border-b border-amber-100">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center gap-3">
          <span className="text-4xl">🐶</span>
          <div>
            <h1 className="text-2xl font-bold text-amber-800">PetHealth Dashboard</h1>
            <p className="text-sm text-amber-500">Monitoriza la salud de tu perrito</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-gray-400 truncate max-w-[160px]">{userEmail}</p>
            <button onClick={handleSignOut} className="text-xs text-amber-500 hover:text-amber-700 underline">
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <StatCard emoji="⚖️" label="Último peso" value={`${weights.at(-1)?.weight_kg ?? "—"} kg`} color="bg-blue-50 border-blue-200" />
          <StatCard emoji="💉" label="Vacunas registradas" value={vaccines.length} color="bg-green-50 border-green-200" />
          <StatCard emoji="🍖" label="Registros de comida" value={logs.length} color="bg-orange-50 border-orange-200" />
        </div>

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

        <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">

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
            </div>
          )}

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
            </div>
          )}

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
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

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
