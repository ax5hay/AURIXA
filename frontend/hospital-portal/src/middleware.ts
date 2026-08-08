import { NextResponse, type NextRequest } from "next/server";
import { STAFF_SESSION_COOKIE, verifyStaffSessionToken } from "@/lib/staff-session";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(STAFF_SESSION_COOKIE)?.value;
  const session = await verifyStaffSessionToken(token);
  if (session) {
    const role = session.role.toLowerCase();
    const clinical = ["doctor", "physician", "nurse", "clinician"].some((term) => role.includes(term));
    const coordination = ["reception", "scheduler", "coordinator", "front desk"].some((term) =>
      role.includes(term),
    );
    const operations = ["admin", "operator", "support"].some((term) => role.includes(term));
    const path = request.nextUrl.pathname;
    const allowed =
      (path.startsWith("/status") && operations) ||
      ((path.startsWith("/schedule") || path.startsWith("/chat")) &&
        (clinical || coordination)) ||
      (!path.startsWith("/status") && !path.startsWith("/schedule") && !path.startsWith("/chat") &&
        (clinical || coordination || operations));
    if (allowed) return NextResponse.next();
    return NextResponse.redirect(new URL("/?access=denied", request.url));
  }

  const signInUrl = new URL("/auth/signin", request.url);
  signInUrl.searchParams.set("returnTo", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  const response = NextResponse.redirect(signInUrl);
  if (token) response.cookies.delete(STAFF_SESSION_COOKIE);
  return response;
}

export const config = {
  matcher: ["/((?!api/auth|auth/signin|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
