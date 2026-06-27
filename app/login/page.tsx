"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Status = "idle" | "loading" | "error";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // ── AUTH-SHEETS: nueva lógica de acceso vía Google Sheets ─────────────────
  async function handleSendLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    setErrorMsg("");

    const res = await fetch("/api/auth-sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      router.replace("/");
    } else {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data.error ?? "Email no autorizado. Contacta al administrador.");
      setStatus("error");
    }
  }

  // ── CÓDIGO ORIGINAL SUPABASE — NO BORRAR ──────────────────────────────────
  // Para reactivar: comenta la función de arriba y descomenta la de abajo.
  // También restaura el import: import { supabase } from "@/utils/supabaseClient";
  //
  // async function handleSendLink(e: React.FormEvent) {
  //   e.preventDefault();
  //   if (!email) return;
  //   setStatus("loading");
  //   setErrorMsg("");
  //   const redirectTo = `${window.location.origin}/auth/callback`;
  //   const { error } = await supabase.auth.signInWithOtp({
  //     email,
  //     options: { emailRedirectTo: redirectTo },
  //   });
  //   if (error) {
  //     setErrorMsg(error.message);
  //     setStatus("error");
  //   } else {
  //     setStatus("sent");
  //   }
  // }
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-6xl">🐶</span>
          <h1 className="mt-4 text-2xl font-bold text-amber-800">PetHealth</h1>
          <p className="mt-1 text-sm text-amber-500">Monitoriza la salud de tu perrito</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-8">
          <form onSubmit={handleSendLink} className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Acceder</h2>
              <p className="mt-1 text-sm text-gray-500">
                Introduce tu email para verificar tu acceso.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Email</label>
              <input
                type="email"
                required
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
              />
            </div>

            {status === "error" && (
              <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full h-10 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {status === "loading" ? "Verificando…" : "Acceder ✉️"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-amber-400">
          Acceso restringido. Solo usuarios autorizados.
        </p>
      </div>
    </div>
  );
}
