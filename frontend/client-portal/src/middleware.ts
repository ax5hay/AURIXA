import { NextResponse, type NextRequest } from "next/server";
import {
  CLIENT_SESSION_COOKIE,
  LEGACY_PATIENT_SESSION_COOKIE,
  isClientLivePathOpen,
  verifyClientSessionToken,
} from "@/lib/client-session";

export async function middleware(request: NextRequest) {
  if (isClientLivePathOpen()) return NextResponse.next();

  const token =
    request.cookies.get(CLIENT_SESSION_COOKIE)?.value ??
    request.cookies.get(LEGACY_PATIENT_SESSION_COOKIE)?.value;
  const session = await verifyClientSessionToken(token);
  if (session) return NextResponse.next();

  const signIn = new URL("/auth/signin", request.url);
  signIn.searchParams.set("returnTo", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  const response = NextResponse.redirect(signIn);
  if (token) {
    response.cookies.delete(CLIENT_SESSION_COOKIE);
    response.cookies.delete(LEGACY_PATIENT_SESSION_COOKIE);
  }
  return response;
}

export const config = {
  matcher: ["/((?!auth|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
