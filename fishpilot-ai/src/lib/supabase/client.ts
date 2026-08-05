import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase da usare nei Client Component (es. sottoscrizioni realtime).
 * Le chiamate principali dell'app passano dal client server-side
 * (vedi /lib/supabase/server.ts), usato dentro le Route Handler e i
 * Server Component.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
