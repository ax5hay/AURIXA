import { describe, expect, it, vi } from "vitest";
import {
  buildLocalClientDemoSession,
  createClientSessionToken,
  resolveClientSession,
  verifyClientSessionToken,
} from "./client-session";

const SECRET = "client-session-test-secret-at-least-32-characters";

describe("client session", () => {
  it("round-trips a signed client scope", async () => {
    const token = await createClientSessionToken(
      { clientId: 42, tenantId: 7, subject: "client-42", demo: false },
      SECRET,
    );
    await expect(verifyClientSessionToken(token, SECRET)).resolves.toMatchObject({
      clientId: 42,
      tenantId: 7,
      subject: "client-42",
    });
  });

  it("rejects tampered tokens", async () => {
    const token = await createClientSessionToken(
      { clientId: 1, tenantId: 1, subject: "client-1", demo: true },
      SECRET,
    );
    await expect(verifyClientSessionToken(`${token}x`, SECRET)).resolves.toBeNull();
    await expect(
      verifyClientSessionToken(token, "different-client-secret-at-least-32-characters"),
    ).resolves.toBeNull();
  });

  it("builds demo session from env", async () => {
    vi.stubEnv("CLIENT_DEMO_AUTH_ENABLED", "true");
    vi.stubEnv("CLIENT_DEMO_CLIENT_ID", "1");
    vi.stubEnv("CLIENT_DEMO_TENANT_ID", "1");
    vi.stubEnv("NODE_ENV", "development");
    expect(buildLocalClientDemoSession()).toMatchObject({ clientId: 1, tenantId: 1, demo: true });
    await expect(resolveClientSession(undefined)).resolves.toMatchObject({ clientId: 1 });
  });
});
