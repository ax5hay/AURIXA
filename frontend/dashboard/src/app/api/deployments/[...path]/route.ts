import { proxyDeploymentRequest } from "@/lib/deployment-proxy";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function forward(request: Request, context: RouteContext) {
  const { path } = await context.params;
  return proxyDeploymentRequest(request, path);
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
