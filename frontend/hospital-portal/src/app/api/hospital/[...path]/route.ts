import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { STAFF_SESSION_COOKIE, resolveStaffSession } from "@/lib/staff-session";

const GATEWAY_URL = process.env.API_GATEWAY_URL || "http://localhost:3000";
const ALLOWED_ROOTS = new Set(["admin", "orchestration", "execute", "health"]);

function targetUrl(path: string[], requestUrl: string) {
  const root = path[0];
  if (!root || !ALLOWED_ROOTS.has(root)) return null;
  const suffix = path.slice(1).map(encodeURIComponent).join("/");
  const pathname =
    root === "admin"
      ? `/api/v1/admin/${suffix}`
      : root === "health"
        ? `/health/${suffix}`
        : `/api/v1/${root}/${suffix}`;
  const target = new URL(pathname, GATEWAY_URL);
  const incoming = new URL(requestUrl);
  incoming.searchParams.forEach((value, key) => target.searchParams.append(key, value));
  return target;
}

async function authorizedSession() {
  const cookieStore = await cookies();
  return resolveStaffSession(cookieStore.get(STAFF_SESSION_COOKIE)?.value);
}

async function patientBelongsToTenant(patientId: string, tenantId: number) {
  const response = await fetch(`${GATEWAY_URL}/api/v1/admin/patients/${encodeURIComponent(patientId)}`, {
    cache: "no-store",
  });
  if (!response.ok) return false;
  const patient = (await response.json()) as { tenantId?: number };
  return patient.tenantId === tenantId;
}

async function appointmentBelongsToTenant(appointmentId: string, tenantId: number) {
  const response = await fetch(
    `${GATEWAY_URL}/api/v1/admin/appointments?tenant_id=${tenantId}&limit=1000`,
    { cache: "no-store" },
  );
  if (!response.ok) return false;
  const appointments = (await response.json()) as { id: number }[];
  return appointments.some((appointment) => String(appointment.id) === appointmentId);
}

async function proxy(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const session = await authorizedSession();
  if (!session) return NextResponse.json({ error: "Staff session required." }, { status: 401 });

  const { path } = await context.params;
  const target = targetUrl(path, request.url);
  if (!target) return NextResponse.json({ error: "Unsupported portal operation." }, { status: 404 });

  const resource = path.slice(1);
  const role = session.role.toLowerCase();
  const clinical = ["doctor", "physician", "nurse", "clinician"].some((term) => role.includes(term));
  const coordination = ["reception", "scheduler", "coordinator", "front desk"].some((term) =>
    role.includes(term),
  );
  const operations = ["admin", "operator", "support"].some((term) => role.includes(term));
  const canCoordinate = clinical || coordination;
  const allowed =
    (path[0] === "orchestration" && canCoordinate) ||
    (path[0] === "execute" && canCoordinate) ||
    (path[0] === "health" && operations) ||
    (path[0] === "admin" &&
      ((resource[0] === "audit" && operations) ||
        (["patients", "appointments", "knowledge"].includes(resource[0] ?? "") &&
          (clinical || coordination || operations)) ||
        (resource[0] === "staff" && canCoordinate)));
  const isCareWrite =
    path[0] === "admin" &&
    request.method !== "GET" &&
    ["patients", "appointments"].includes(resource[0] ?? "");
  if (!allowed || (isCareWrite && !canCoordinate)) {
    return NextResponse.json({ error: "Operation is not permitted for this staff role." }, { status: 403 });
  }

  if (path[0] === "admin") {
    if (["patients", "appointments", "staff", "knowledge"].includes(resource[0] ?? "")) {
      target.searchParams.set("tenant_id", String(session.tenantId));
    }
    if (
      resource[0] === "patients" &&
      resource[1] &&
      !(await patientBelongsToTenant(resource[1], session.tenantId))
    ) {
      return NextResponse.json({ error: "Patient is outside staff scope." }, { status: 404 });
    }
    if (
      request.method === "PATCH" &&
      resource[0] === "appointments" &&
      resource[1] &&
      !(await appointmentBelongsToTenant(resource[1], session.tenantId))
    ) {
      return NextResponse.json({ error: "Appointment is outside staff scope." }, { status: 404 });
    }
  }

  let body: BodyInit | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const payload = (await request.json()) as Record<string, unknown>;
      if (path[0] === "admin" || path[0] === "orchestration") {
        payload.tenant_id = String(session.tenantId);
      }
      body = JSON.stringify(payload);
    } else {
      body = await request.text();
    }
  }

  const upstream = await fetch(target, {
    method: request.method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body,
    cache: "no-store",
  });
  const response = new NextResponse(upstream.body, { status: upstream.status });
  response.headers.set(
    "Content-Type",
    upstream.headers.get("content-type") ?? "application/json; charset=utf-8",
  );
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
