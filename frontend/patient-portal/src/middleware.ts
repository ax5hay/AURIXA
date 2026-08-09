import { NextResponse, type NextRequest } from "next/server";
import {
  isPatientLivePathOpen,
  PATIENT_SESSION_COOKIE,
  verifyPatientSessionToken,
} from "@/lib/patient-session";

export async function middleware(request: NextRequest) {
  if (isPatientLivePathOpen()) return NextResponse.next();

  const token = request.cookies.get(PATIENT_SESSION_COOKIE)?.value;
  const session = await verifyPatientSessionToken(token);
  if (session) return NextResponse.next();

  const signInUrl = new URL("/auth/signin", request.url);
  signInUrl.searchParams.set("returnTo", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  const response = NextResponse.redirect(signInUrl);
  if (token) response.cookies.delete(PATIENT_SESSION_COOKIE);
  return response;
}

export const config = {
  matcher: ["/((?!api|auth/signin|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
