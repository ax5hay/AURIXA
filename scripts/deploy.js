#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "infra/deployment/services.json");
const composeFile = path.join(root, "infra/docker/docker-compose.yml");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const services = manifest.services;
const enabled = services.filter((service) => service.enabled);
const expectedServices = [
  "api-gateway",
  "orchestration-engine",
  "llm-router",
  "agent-runtime",
  "rag-service",
  "safety-guardrails",
  "streaming-voice",
  "execution-engine",
  "observability-core",
  "deployment-controller",
  "dashboard",
  "client-portal",
  "agent-workspace",
];
const command = process.argv[2] || "help";
const selectedNames = process.argv.slice(3);

function run(program, args) {
  const result = spawnSync(program, args, { cwd: root, stdio: "inherit" });
  if (result.error) {
    console.error(`${program} is required: ${result.error.message}`);
    process.exit(1);
  }
  process.exitCode = result.status ?? 1;
}

function compose(args) {
  run("docker", ["compose", "-f", composeFile, ...args]);
}

function selectServices() {
  if (!selectedNames.length) return enabled;
  const unknown = selectedNames.filter((name) => !enabled.some((service) => service.name === name));
  if (unknown.length) {
    throw new Error(`Unknown or disabled service(s): ${unknown.join(", ")}`);
  }
  return enabled.filter((service) => selectedNames.includes(service.name));
}

function validate() {
  const errors = [];
  const names = new Set();
  const ports = new Set();
  const requiredKeys = ["name", "kind", "port", "healthPath", "dockerfile", "image", "enabled"];
  if (manifest.version !== 1 || !Array.isArray(services)) {
    errors.push("manifest version/services are invalid");
  }
  for (const service of services) {
    for (const key of requiredKeys) {
      if (service[key] === undefined) errors.push(`${service.name || "service"}: missing ${key}`);
    }
    const unknownKeys = Object.keys(service).filter((key) => !requiredKeys.includes(key));
    if (unknownKeys.length) {
      errors.push(`${service.name || "service"}: unsupported field(s): ${unknownKeys.join(", ")}`);
    }
    if (names.has(service.name)) errors.push(`duplicate name: ${service.name}`);
    if (ports.has(service.port)) errors.push(`duplicate port: ${service.port}`);
    names.add(service.name);
    ports.add(service.port);
    if (!["backend", "frontend"].includes(service.kind)) {
      errors.push(`${service.name}: kind must be backend or frontend`);
    }
    if (!Number.isInteger(service.port) || service.port < 1 || service.port > 65535) {
      errors.push(`${service.name}: port must be an integer between 1 and 65535`);
    }
    if (typeof service.healthPath !== "string" || !service.healthPath.startsWith("/")) {
      errors.push(`${service.name}: healthPath must be an absolute URL path`);
    }
    if (typeof service.enabled !== "boolean") {
      errors.push(`${service.name}: enabled must be boolean`);
    }
    if (service.enabled && !fs.existsSync(path.join(root, service.dockerfile))) {
      errors.push(`${service.name}: Dockerfile not found at ${service.dockerfile}`);
    }
  }
  const missing = expectedServices.filter((name) => !names.has(name));
  const unexpected = [...names].filter((name) => !expectedServices.includes(name));
  if (missing.length) errors.push(`missing required service(s): ${missing.join(", ")}`);
  if (unexpected.length) errors.push(`unexpected service(s): ${unexpected.join(", ")}`);
  const controller = services.find((service) => service.name === "deployment-controller");
  if (!controller || controller.port !== 8009 || controller.enabled !== true) {
    errors.push("deployment-controller must be enabled on port 8009");
  }
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(`Validated ${services.length} services (${enabled.length} enabled).`);
}

function verify() {
  const targets = selectServices();
  Promise.all(
    targets.map(
      (service) =>
        new Promise((resolve) => {
          const request = http.get(
            {
              hostname: "127.0.0.1",
              port: service.port,
              path: service.healthPath,
              timeout: 3000,
            },
            (response) => {
              response.resume();
              const healthy = response.statusCode >= 200 && response.statusCode < 400;
              console.log(
                `${healthy ? "ok" : "failed"}\t${service.name}\tHTTP ${response.statusCode}`,
              );
              resolve(healthy);
            },
          );
          request.on("timeout", () => request.destroy(new Error("timeout")));
          request.on("error", (error) => {
            console.log(`failed\t${service.name}\t${error.message}`);
            resolve(false);
          });
        }),
    ),
  ).then((results) => {
    if (results.some((result) => !result)) process.exitCode = 1;
  });
}

try {
  switch (command) {
    case "validate":
      validate();
      compose(["config", "--quiet"]);
      break;
    case "build":
      validate();
      compose(["build", ...selectServices().map((service) => service.name)]);
      break;
    case "verify":
      verify();
      break;
    case "up":
      validate();
      compose([
        "up",
        "-d",
        ...(selectedNames.length ? selectServices().map((service) => service.name) : []),
      ]);
      break;
    case "down":
      compose(["down"]);
      break;
    case "status":
      compose(["ps"]);
      break;
    case "deploy":
    case "promote":
    case "rollback":
    case "cloud":
      throw new Error(`${command} is CI-owned; use the approved deployment workflow`);
    default:
      console.log("Usage: pnpm run deploy <validate|build|verify|up|down|status> [service ...]");
      process.exitCode = command === "help" ? 0 : 1;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
