import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildLocalPatientDemoSession,
  createPatientSessionToken,
  isLocalPatientDemoEnabled,
  resolvePatientSession,
  verifyPatientSessionToken,
} from "./patient-session";

const SECRET = "patient-session-test-secret-at-least-32-characters";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("patient session", () => {
  it("round-trips a signed patient scope", async () => {
    const token = await createPatientSessionToken(
      { patientId: 42, tenantId: 7, subject: "patient-42", demo: false },
      SECRET,
    );

    await expect(verifyPatientSessionToken(token, SECRET)).resolves.toMatchObject({
      patientId: 42,
      tenantId: 7,
      subject: "patient-42",
      demo: false,
    });
  });

  it("rejects a tampered or differently signed scope", async () => {
    const token = await createPatientSessionToken(
      { patientId: 1, tenantId: 1, subject: "patient-1", demo: true },
      SECRET,
    );

    await expect(verifyPatientSessionToken(`${token}x`, SECRET)).resolves.toBeNull();
    await expect(
      verifyPatientSessionToken(token, "different-patient-secret-at-least-32-characters"),
    ).resolves.toBeNull();
  });

  it("allows demo auth only with explicit non-production opt-in", () => {
    vi.stubEnv("PATIENT_DEMO_AUTH_ENABLED", "true");
    vi.stubEnv("NODE_ENV", "development");
    expect(isLocalPatientDemoEnabled()).toBe(true);

    vi.stubEnv("NODE_ENV", "production");
    expect(isLocalPatientDemoEnabled()).toBe(false);
  });

  it("resolves a local demo session without a cookie when demo auth is enabled", async () => {
    vi.stubEnv("PATIENT_DEMO_AUTH_ENABLED", "true");
    vi.stubEnv("PATIENT_DEMO_PATIENT_ID", "1");
    vi.stubEnv("PATIENT_DEMO_TENANT_ID", "1");

    await expect(resolvePatientSession(undefined)).resolves.toMatchObject({
      patientId: 1,
      tenantId: 1,
      demo: true,
    });
    expect(buildLocalPatientDemoSession()).toMatchObject({ patientId: 1, tenantId: 1, demo: true });
  });
});
