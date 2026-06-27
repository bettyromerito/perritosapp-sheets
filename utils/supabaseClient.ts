import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Lazy singleton — createBrowserClient is only called on first access at runtime,
// never during Next.js static analysis or build-time prerendering.
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop: string | symbol) {
    return (getClient() as never as Record<string | symbol, unknown>)[prop];
  },
});
