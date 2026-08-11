import { NextResponse } from "next/server";
import { PATIENT_SESSION_COOKIE } from "@/lib/patient-session";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/auth/signin", request.url), 303);
  response.cookies.set(PATIENT_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
