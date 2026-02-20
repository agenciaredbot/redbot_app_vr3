import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  // Refresh Supabase auth token
  const supabase = createMiddlewareClient(request, response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const hostname = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;

  // Determine root domain
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "redbot.app";

  // Parse subdomain
  let subdomain: string | null = null;

  if (hostname.includes(rootDomain)) {
    // Production: extract subdomain from *.redbot.app
    const parts = hostname.split(`.${rootDomain}`);
    if (parts[0] && parts[0] !== "www" && parts[0] !== rootDomain) {
      subdomain = parts[0];
    }
  } else if (hostname.includes("localhost")) {
    // Development: support slug.localhost:3000
    const parts = hostname.split(".localhost");
    if (parts[0] && parts[0] !== "localhost" && !parts[0].includes("localhost")) {
      subdomain = parts[0];
    }
  }

  // Also support ?slug= query param for dev environments without wildcard DNS
  if (!subdomain) {
    const slugParam = request.nextUrl.searchParams.get("slug");
    if (slugParam) {
      subdomain = slugParam;
    }
  }

  // Set subdomain in headers for downstream consumption
  if (subdomain) {
    response.headers.set("x-organization-slug", subdomain);
  }

  // Route: Super admin panel — requires auth, no subdomain rewrite
  if (pathname.startsWith("/super-admin")) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return response; // No subdomain rewriting for super admin
  }

  // Route: Tenant admin pages require auth
  if (subdomain && pathname.startsWith("/admin")) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      if (subdomain) {
        loginUrl.searchParams.set("slug", subdomain);
      }
      return NextResponse.redirect(loginUrl);
    }
  }

  // Route: Tenant pages — rewrite to /t/[slug] route group
  if (subdomain && !pathname.startsWith("/admin") && !pathname.startsWith("/super-admin") && !pathname.startsWith("/api") && !pathname.startsWith("/auth") && !pathname.startsWith("/login") && !pathname.startsWith("/register") && !pathname.startsWith("/join") && !pathname.startsWith("/verify-email") && !pathname.startsWith("/forgot-password") && !pathname.startsWith("/reset-password")) {
    const url = request.nextUrl.clone();
    url.pathname = `/t/${subdomain}${pathname}`;
    return NextResponse.rewrite(url, { headers: response.headers });
  }

  // Route: Tenant admin — serve directly (no rewrite needed)
  // The (dashboard)/admin route group already handles /admin/* paths.
  // Auth resolves the org via user_profiles.organization_id.
  // The subdomain is available via x-organization-slug header if needed.
  if (subdomain && pathname.startsWith("/admin")) {
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
