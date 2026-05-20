import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/session";

const publicRoutes = ["/login"];
const apiPrefix = "/api";

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Let API routes handle their own auth
  if (pathname.startsWith(apiPrefix)) return NextResponse.next();

  const token = req.cookies.get("studiomate_session")?.value;
  const session = await decrypt(token);
  const isAuthenticated = !!session?.userId;

  if (publicRoutes.includes(pathname)) {
    if (isAuthenticated) {
      const role = session?.role;
      const dest = role === "admin" ? "/dashboard" : "/me";
      return NextResponse.redirect(new URL(dest, req.nextUrl));
    }
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
