import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  CLIENT_SESSION_COOKIE,
  LEGACY_PATIENT_SESSION_COOKIE,
  resolveClientSession,
  type ClientSession,
} from "@/lib/client-session";

const API_GATEWAY_URL = (
  process.env.API_GATEWAY_URL ??
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ??
  "http://127.0.0.1:3000"
).replace(/\/$/, "");

const JSON_HEADERS = { "Content-Type": "application/json" };

async function currentSession(): Promise<ClientSession | null> {
  const store = await cookies();
  const token =
    store.get(CLIENT_SESSION_COOKIE)?.value ?? store.get(LEGACY_PATIENT_SESSION_COOKIE)?.value;
  return resolveClientSession(token);
}

async function gatewayFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_GATEWAY_URL}/api/v1/${path}`, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(120_000),
  });
}

async function forward(response: Response): Promise<NextResponse> {
  return new NextResponse(await response.arrayBuffer(), {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function unauthorized() {
  return NextResponse.json(
    { error: "A valid client session is required." },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}

async function verifyShowingOwnership(session: ClientSession, showingId: number) {
  const response = await gatewayFetch(`admin/clients/${session.clientId}/showings`);
  if (!response.ok) return { response };
  const showings = (await response.json()) as Array<{ id?: number }>;
  return {
    response,
    owned: showings.some((showing) => showing.id === showingId),
  };
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await currentSession();
  if (!session) return unauthorized();
  const { path } = await context.params;
  const resource = path.join("/");

  try {
    if (resource === "session") {
      return NextResponse.json(
        { expiresAt: session.expiresAt, demo: session.demo },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }
    if (resource === "me" || resource === "profile") {
      const response = await gatewayFetch(`admin/clients/${session.clientId}`);
      if (!response.ok) return forward(response);
      const client = (await response.json()) as { tenantId?: number };
      if (client.tenantId != null && client.tenantId !== session.tenantId) {
        return NextResponse.json({ error: "Client scope could not be verified." }, { status: 403 });
      }
      return NextResponse.json(client, { headers: { "Cache-Control": "private, no-store" } });
    }
    if (resource === "showings") {
      return forward(await gatewayFetch(`admin/clients/${session.clientId}/showings`));
    }
    if (resource === "listings") {
      return forward(
        await gatewayFetch(`admin/listings?tenant_id=${session.tenantId}&status=active`),
      );
    }
    if (resource === "conversations") {
      return forward(await gatewayFetch(`admin/clients/${session.clientId}/conversations`));
    }
    if (resource === "knowledge") {
      return forward(await gatewayFetch(`admin/knowledge/articles?tenant_id=${session.tenantId}`));
    }
    return NextResponse.json({ error: "Client resource not found." }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "The real estate service is unavailable." }, { status: 502 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const session = await currentSession();
  if (!session) return unauthorized();
  const { path } = await context.params;
  const resource = path.join("/");

  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (resource === "messages" || resource === "chat") {
      const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
      if (!prompt || prompt.length > 4_000) {
        return NextResponse.json(
          { error: "Enter a message of up to 4,000 characters." },
          { status: 400 },
        );
      }
      return forward(
        await gatewayFetch("orchestration/pipelines", {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({ prompt, client_id: session.clientId }),
        }),
      );
    }
    if (resource === "voice/process") {
      return forward(
        await gatewayFetch("voice/process", {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({
            audio_b64: body.audio_b64,
            want_tts: body.want_tts !== false,
            client_id: session.clientId,
          }),
        }),
      );
    }
    if (resource === "voice/tts") {
      return forward(
        await gatewayFetch("voice/tts", {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({ text: body.text }),
        }),
      );
    }
    return NextResponse.json({ error: "Client action not found." }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "The real estate service is unavailable." }, { status: 502 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await currentSession();
  if (!session) return unauthorized();
  const { path } = await context.params;
  if (path.length !== 2 || path[0] !== "showings") {
    return NextResponse.json({ error: "Client action not found." }, { status: 404 });
  }
  const showingId = Number(path[1]);
  if (!Number.isSafeInteger(showingId) || showingId < 1) {
    return NextResponse.json({ error: "Invalid showing." }, { status: 400 });
  }

  try {
    const body = (await request.json()) as { status?: string };
    if (body.status !== "cancelled") {
      return NextResponse.json(
        { error: "Only cancellation is available to clients." },
        { status: 400 },
      );
    }
    const ownership = await verifyShowingOwnership(session, showingId);
    if (!ownership.response.ok) return forward(ownership.response);
    if (!ownership.owned) {
      return NextResponse.json({ error: "Showing not found." }, { status: 404 });
    }
    return forward(
      await gatewayFetch(`admin/showings/${showingId}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: "cancelled" }),
      }),
    );
  } catch {
    return NextResponse.json({ error: "The showing could not be updated." }, { status: 502 });
  }
}
