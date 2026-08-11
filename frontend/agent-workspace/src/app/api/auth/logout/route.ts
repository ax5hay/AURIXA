import { NextResponse } from "next/server";
import { STAFF_SESSION_COOKIE } from "@/lib/staff-session";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/auth/signin", request.url), 303);
  response.cookies.delete(STAFF_SESSION_COOKIE);
  return response;
}
