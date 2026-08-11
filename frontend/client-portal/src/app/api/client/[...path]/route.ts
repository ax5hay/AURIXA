import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  PATIENT_SESSION_COOKIE,
  resolvePatientSession,
  type PatientSession,
} from "@/lib/patient-session";

const API_GATEWAY_URL = (
  process.env.API_GATEWAY_URL ??
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ??
  "http://127.0.0.1:3000"
).replace(/\/$/, "");

const JSON_HEADERS = { "Content-Type": "application/json" };

async function currentSession(): Promise<PatientSession | null> {
  const store = await cookies();
  return resolvePatientSession(store.get(PATIENT_SESSION_COOKIE)?.value);
}

async function gatewayFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_GATEWAY_URL}/api/v1/${path}`, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(120_000),
  });
}

async function forward(response: Response): Promise<NextResponse> {
  const result = new NextResponse(await response.arrayBuffer(), {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
  return result;
}

function unauthorized() {
  return NextResponse.json(
    { error: "A valid patient session is required." },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}

async function verifyAppointmentOwnership(session: PatientSession, appointmentId: number) {
  const response = await gatewayFetch(`admin/patients/${session.patientId}/appointments`);
  if (!response.ok) return { response };
  const appointments = (await response.json()) as Array<{ id?: number }>;
  return {
    response,
    owned: appointments.some((appointment) => appointment.id === appointmentId),
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
        {
          expiresAt: session.expiresAt,
          demo: session.demo,
        },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }
    if (resource === "me") {
      const response = await gatewayFetch(`admin/patients/${session.patientId}`);
      if (!response.ok) return forward(response);
      const patient = (await response.json()) as { tenantId?: number };
      if (patient.tenantId != null && patient.tenantId !== session.tenantId) {
        return NextResponse.json(
          { error: "Patient scope could not be verified." },
          { status: 403 },
        );
      }
      return NextResponse.json(patient, { headers: { "Cache-Control": "private, no-store" } });
    }
    if (resource === "appointments") {
      return forward(await gatewayFetch(`admin/patients/${session.patientId}/appointments`));
    }
    if (resource === "conversations") {
      return forward(await gatewayFetch(`admin/patients/${session.patientId}/conversations`));
    }
    if (resource === "knowledge") {
      return forward(await gatewayFetch(`admin/knowledge/articles?tenant_id=${session.tenantId}`));
    }
    return NextResponse.json({ error: "Patient resource not found." }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "The care service is unavailable." }, { status: 502 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const session = await currentSession();
  if (!session) return unauthorized();
  const { path } = await context.params;
  const resource = path.join("/");

  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (resource === "messages") {
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
          body: JSON.stringify({ prompt, patient_id: session.patientId }),
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
            patient_id: session.patientId,
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
    return NextResponse.json({ error: "Patient action not found." }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "The care service is unavailable." }, { status: 502 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await currentSession();
  if (!session) return unauthorized();
  const { path } = await context.params;
  if (path.length !== 2 || path[0] !== "appointments") {
    return NextResponse.json({ error: "Patient action not found." }, { status: 404 });
  }
  const appointmentId = Number(path[1]);
  if (!Number.isSafeInteger(appointmentId) || appointmentId < 1) {
    return NextResponse.json({ error: "Invalid appointment." }, { status: 400 });
  }

  try {
    const body = (await request.json()) as { status?: string };
    if (body.status !== "cancelled") {
      return NextResponse.json(
        { error: "Only cancellation is available to patients." },
        { status: 400 },
      );
    }
    const ownership = await verifyAppointmentOwnership(session, appointmentId);
    if (!ownership.response.ok) return forward(ownership.response);
    if (!ownership.owned) {
      return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
    }
    return forward(
      await gatewayFetch(`admin/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: "cancelled" }),
      }),
    );
  } catch {
    return NextResponse.json({ error: "The appointment could not be updated." }, { status: 502 });
  }
}
