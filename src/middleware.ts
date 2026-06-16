import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  supabaseConfigured,
} from "@/lib/supabase/env";

// Content-Security-Policy without a nonce. A nonce would have to be generated
// per request, which forces every page into dynamic rendering and loses static
// caching (a real speed regression for a portfolio). The App Router emits
// inline bootstrap scripts, so script-src allows 'unsafe-inline'; since this
// site reflects no user input into the page, the XSS surface that a nonce would
// close is negligible. 'self' covers Next chunks and the first-party Vercel
// analytics under /_vercel. In development Next's HMR/React Refresh evaluates
// code with eval(), so 'unsafe-eval' is added there only. style-src keeps
// 'unsafe-inline' because Shiki and a couple of inline <style> blocks need it.
const IS_DEV = process.env.NODE_ENV !== "production";

const CSP = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${IS_DEV ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https://res.cloudinary.com https://*.supabase.co https://*.supabase.in`,
  `font-src 'self'`,
  `connect-src 'self' https://*.supabase.co https://*.supabase.in https://vitals.vercel-insights.com https://*.vercel-scripts.com`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `object-src 'none'`,
  `form-action 'self'`,
  `upgrade-insecure-requests`,
].join("; ");

export async function middleware(request: NextRequest) {
  const csp = CSP;

  // Forward the request unchanged; set the CSP on the response so the browser
  // enforces it. No request-header mutation, so pages stay statically
  // renderable.
  let response = NextResponse.next();
  response.headers.set("content-security-policy", csp);

  const { pathname } = request.nextUrl;
  const guarded =
    supabaseConfigured &&
    (pathname.startsWith("/admin") || pathname.startsWith("/auth"));

  if (guarded) {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next();
          response.headers.set("content-security-policy", csp);
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isLogin = pathname.startsWith("/admin/login");
    if (pathname.startsWith("/admin") && !isLogin && !user) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      const redirect = NextResponse.redirect(url);
      redirect.headers.set("content-security-policy", csp);
      return redirect;
    }
  }

  return response;
}

export const config = {
  // Run on everything except Next internals and static asset files, so the CSP
  // covers all documents.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|txt|xml|webmanifest)$).*)",
  ],
};
