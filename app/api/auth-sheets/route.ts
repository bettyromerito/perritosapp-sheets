import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const email: string | undefined = body?.email;

  if (!email) {
    return NextResponse.json({ error: "Email requerido" }, { status: 400 });
  }

  const sheetsApiUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_API_URL;
  if (!sheetsApiUrl) {
    return NextResponse.json({ error: "NEXT_PUBLIC_GOOGLE_SHEETS_API_URL no configurada" }, { status: 500 });
  }

  let data: { authorized?: boolean };
  try {
    const res = await fetch(`${sheetsApiUrl}?email=${encodeURIComponent(email)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      redirect: "follow",
      cache: "no-store",
    });
    data = await res.json();
  } catch {
    return NextResponse.json({ error: "Error al contactar Google Sheets" }, { status: 502 });
  }

  if (!data.authorized) {
    return NextResponse.json({ error: "Email no autorizado" }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("user_session", email, {
    httpOnly: false, // debe ser legible por el cliente (useEffect)
    maxAge: 60 * 60 * 24 * 30, // 30 días
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
