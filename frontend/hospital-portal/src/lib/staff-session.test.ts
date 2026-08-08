import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createStaffSessionToken,
  isLocalStaffDemoEnabled,
  verifyStaffSessionToken,
} from "./staff-session";

const SECRET = "staff-session-test-secret-at-least-32-characters";
const SESSION = {
  staffId: 12,
  fullName: "Jordan Lee",
  email: "jordan@example.test",
  role: "nurse",
  tenantId: 7,
  subject: "staff-12",
  demo: false,
};

afterEach(() => vi.unstubAllEnvs());

describe("staff session", () => {
  it("round-trips a signed staff and tenant scope", async () => {
    const token = await createStaffSessionToken(SESSION, SECRET);
    await expect(verifyStaffSessionToken(token, SECRET)).resolves.toMatchObject(SESSION);
  });

  it("rejects tampered and differently signed sessions", async () => {
    const token = await createStaffSessionToken(SESSION, SECRET);
    await expect(verifyStaffSessionToken(`${token}x`, SECRET)).resolves.toBeNull();
    await expect(
      verifyStaffSessionToken(token, "another-staff-session-secret-at-least-32-chars"),
    ).resolves.toBeNull();
  });

  it("allows demo access only with explicit non-production opt-in", () => {
    vi.stubEnv("STAFF_DEMO_AUTH_ENABLED", "true");
    vi.stubEnv("NODE_ENV", "development");
    expect(isLocalStaffDemoEnabled()).toBe(true);
    vi.stubEnv("NODE_ENV", "production");
    expect(isLocalStaffDemoEnabled()).toBe(false);
  });
});
