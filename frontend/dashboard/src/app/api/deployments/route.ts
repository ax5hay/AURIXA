import { proxyDeploymentRequest } from "@/lib/deployment-proxy";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return proxyDeploymentRequest(request);
}

export function POST(request: Request) {
  return proxyDeploymentRequest(request);
}

export function PUT(request: Request) {
  return proxyDeploymentRequest(request);
}

export function PATCH(request: Request) {
  return proxyDeploymentRequest(request);
}

export function DELETE(request: Request) {
  return proxyDeploymentRequest(request);
}
