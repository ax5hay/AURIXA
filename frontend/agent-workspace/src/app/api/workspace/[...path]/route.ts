import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { STAFF_SESSION_COOKIE, resolveStaffSession } from "@/lib/staff-session";

const GATEWAY_URL = process.env.API_GATEWAY_URL || "http://localhost:3000";
const ALLOWED_ROOTS = new Set(["admin", "orchestration", "execute", "health"]);

const CLIENT_RESOURCES = new Set(["clients", "patients", "showings", "appointments", "leads", "listings"]);

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

async function clientBelongsToTenant(clientId: string, tenantId: number) {
  const response = await fetch(`${GATEWAY_URL}/api/v1/admin/clients/${encodeURIComponent(clientId)}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    const legacy = await fetch(
      `${GATEWAY_URL}/api/v1/admin/patients/${encodeURIComponent(clientId)}`,
      { cache: "no-store" },
    );
    if (!legacy.ok) return false;
    const patient = (await legacy.json()) as { tenantId?: number };
    return patient.tenantId === tenantId;
  }
  const client = (await response.json()) as { tenantId?: number };
  return client.tenantId === tenantId;
}

async function showingBelongsToTenant(showingId: string, tenantId: number) {
  for (const path of ["showings", "appointments"]) {
    const response = await fetch(
      `${GATEWAY_URL}/api/v1/admin/${path}?tenant_id=${tenantId}&limit=1000`,
      { cache: "no-store" },
    );
    if (!response.ok) continue;
    const items = (await response.json()) as { id: number }[];
    if (items.some((item) => String(item.id) === showingId)) return true;
  }
  return false;
}

function isAgentRole(role: string) {
  const normalized = role.toLowerCase();
  return ["agent", "realtor", "broker", "doctor", "physician", "nurse", "clinician"].some((term) =>
    normalized.includes(term),
  );
}

function isCoordinationRole(role: string) {
  const normalized = role.toLowerCase();
  return ["reception", "scheduler", "coordinator", "front desk"].some((term) =>
    normalized.includes(term),
  );
}

function isOperationsRole(role: string) {
  const normalized = role.toLowerCase();
  return ["admin", "operator", "support"].some((term) => normalized.includes(term));
}

async function proxy(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const session = await authorizedSession();
  if (!session) return NextResponse.json({ error: "Staff session required." }, { status: 401 });

  const { path } = await context.params;
  const target = targetUrl(path, request.url);
  if (!target) return NextResponse.json({ error: "Unsupported workspace operation." }, { status: 404 });

  const resource = path.slice(1);
  const resourceRoot = resource[0] ?? "";
  const agent = isAgentRole(session.role);
  const coordination = isCoordinationRole(session.role);
  const operations = isOperationsRole(session.role);
  const canCoordinate = agent || coordination;
  const allowed =
    (path[0] === "orchestration" && canCoordinate) ||
    (path[0] === "execute" && canCoordinate) ||
    (path[0] === "health" && operations) ||
    (path[0] === "admin" &&
      ((resourceRoot === "audit" && operations) ||
        (CLIENT_RESOURCES.has(resourceRoot) && (agent || coordination || operations)) ||
        (resourceRoot === "staff" && canCoordinate) ||
        (resourceRoot === "knowledge" && (agent || coordination || operations))));
  const isWrite =
    path[0] === "admin" &&
    request.method !== "GET" &&
    CLIENT_RESOURCES.has(resourceRoot);
  if (!allowed || (isWrite && !canCoordinate)) {
    return NextResponse.json({ error: "Operation is not permitted for this staff role." }, { status: 403 });
  }

  if (path[0] === "admin") {
    if (["clients", "patients", "showings", "appointments", "leads", "listings", "staff", "knowledge"].includes(resourceRoot)) {
      target.searchParams.set("tenant_id", String(session.tenantId));
    }
    if (
      (resourceRoot === "clients" || resourceRoot === "patients") &&
      resource[1] &&
      !(await clientBelongsToTenant(resource[1], session.tenantId))
    ) {
      return NextResponse.json({ error: "Client is outside staff scope." }, { status: 404 });
    }
    if (
      request.method === "PATCH" &&
      (resourceRoot === "showings" || resourceRoot === "appointments") &&
      resource[1] &&
      !(await showingBelongsToTenant(resource[1], session.tenantId))
    ) {
      return NextResponse.json({ error: "Showing is outside staff scope." }, { status: 404 });
    }
  }

  let body: BodyInit | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const payload = (await request.json()) as Record<string, unknown>;
      if (path[0] === "admin" || path[0] === "orchestration") {
        payload.tenant_id = session.tenantId;
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
