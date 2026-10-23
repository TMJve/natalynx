import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";

// Runs before every page request. It keeps the login session fresh and sends logged-out
// visitors to /login. This is a convenience, not the security boundary: pages re-check the
// user, and the database (RLS) decides what data anyone can see.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const { pathname } = request.nextUrl;

  const isPrivate = pathname.startsWith("/portal") || pathname.startsWith("/admin");
  if (!signedIn && isPrivate) {
    return redirectKeepingCookies(request, response, "/login");
  }
  if (signedIn && pathname.startsWith("/login")) {
    return redirectKeepingCookies(request, response, "/");
  }
  // Send non-admins away from /admin before anything renders. (The pages check again, and
  // RLS would return nothing to them anyway; this just gives a clean redirect.)
  if (signedIn && pathname.startsWith("/admin")) {
    const { data: admin } = await supabase.from("admins").select("user_id").eq("user_id", data!.claims.sub).maybeSingle();
    if (!admin) return redirectKeepingCookies(request, response, "/portal");
  }
  return response;
}

function redirectKeepingCookies(request: NextRequest, from: NextResponse, path: string) {
  const redirect = NextResponse.redirect(new URL(path, request.url));
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
