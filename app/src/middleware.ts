import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * First line of defense for admin surfaces: blocks anonymous access at the edge
 * before any admin page/API executes. The authoritative role check still happens
 * server-side in every /api/admin route and in the dashboard itself — this layer
 * only stops URL-guessing by signed-out visitors and keeps admin out of logs.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = !!request.cookies.get("session")?.value;

  if (!hasSession) {
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (pathname.startsWith("/admin")) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth";
      url.searchParams.set("next", "/admin");
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
