import { NextResponse } from "next/server";
import {
  createStaffSessionToken,
  getStaffSessionSecret,
  isLocalStaffDemoEnabled,
  STAFF_SESSION_COOKIE,
  STAFF_SESSION_MAX_AGE_SECONDS,
} from "@/lib/staff-session";

export async function POST() {
  const secret = getStaffSessionSecret();
  if (!isLocalStaffDemoEnabled() || !secret) {
    return NextResponse.json(
      { error: "Local staff demo sign-in is not configured." },
      { status: 403 },
    );
  }

  const staffId = Number(process.env.STAFF_DEMO_STAFF_ID ?? "1");
  const tenantId = Number(process.env.STAFF_DEMO_TENANT_ID ?? "1");
  const fullName = process.env.STAFF_DEMO_FULL_NAME?.trim() || "Demo Clinician";
  const email = process.env.STAFF_DEMO_EMAIL?.trim() || "demo-clinician@localhost";
  const role = process.env.STAFF_DEMO_ROLE?.trim() || "clinician";
  if (
    !Number.isSafeInteger(staffId) ||
    staffId < 1 ||
    !Number.isSafeInteger(tenantId) ||
    tenantId < 1
  ) {
    return NextResponse.json({ error: "Local staff demo identity is invalid." }, { status: 500 });
  }

  const token = await createStaffSessionToken(
    {
      staffId,
      tenantId,
      fullName,
      email,
      role,
      subject: `local-demo-staff-${staffId}`,
      demo: true,
    },
    secret,
  );
  const response = NextResponse.json({ ok: true });
  response.cookies.set(STAFF_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: STAFF_SESSION_MAX_AGE_SECONDS,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
