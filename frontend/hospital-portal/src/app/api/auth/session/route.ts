import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { STAFF_SESSION_COOKIE, verifyStaffSessionToken } from "@/lib/staff-session";

export async function GET() {
  const cookieStore = await cookies();
  const session = await verifyStaffSessionToken(cookieStore.get(STAFF_SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Staff session is unavailable." }, { status: 401 });
  }
  const response = NextResponse.json({ session });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
