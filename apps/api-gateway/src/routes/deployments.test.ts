import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { authorizeDeploymentToken, DeploymentAuthorizationError } from "./deployments.js";

function base64url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function token(roles: string[]): string {
  const now = Math.floor(Date.now() / 1000);
  const encoded = `${base64url({ alg: "HS256", typ: "JWT" })}.${base64url({
    sub: "operator-1",
    tenantId: "platform",
    roles,
    iss: "aurixa",
    aud: "aurixa-deployment-control-plane",
    iat: now,
    exp: now + 300,
  })}`;
  const signature = createHmac("sha256", "test-secret-with-at-least-32-bytes!!")
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}

describe("deployment gateway authorization", () => {
  afterEach(() => {
    delete process.env.DEPLOYMENT_JWT_SECRET;
    delete process.env.DEPLOYMENT_WRITES_ENABLED;
  });

  it("allows configured administrators to read", async () => {
    process.env.DEPLOYMENT_JWT_SECRET = "test-secret-with-at-least-32-bytes!!";
    await expect(
      authorizeDeploymentToken(`Bearer ${token(["admin"])}`, false),
    ).resolves.toMatchObject({ sub: "operator-1" });
  });

  it("rejects callers without an administrator role", async () => {
    process.env.DEPLOYMENT_JWT_SECRET = "test-secret-with-at-least-32-bytes!!";
    await expect(
      authorizeDeploymentToken(`Bearer ${token(["viewer"])}`, false),
    ).rejects.toMatchObject({ statusCode: 403 } satisfies Partial<DeploymentAuthorizationError>);
  });

  it("keeps writes disabled by default", async () => {
    process.env.DEPLOYMENT_JWT_SECRET = "test-secret-with-at-least-32-bytes!!";
    await expect(
      authorizeDeploymentToken(`Bearer ${token(["admin"])}`, true),
    ).rejects.toMatchObject({ statusCode: 503 } satisfies Partial<DeploymentAuthorizationError>);
  });
});
