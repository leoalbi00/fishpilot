import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Client Supabase da usare in Server Component, Route Handler e Server Action.
 * Gestisce i cookie di sessione secondo il pattern ufficiale @supabase/ssr
 * per Next.js App Router.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Chiamato da un Server Component: la scrittura dei cookie
            // viene ignorata qui (non serve per l'MVP, che è anonimo).
          }
        },
      },
    }
  );
}
