import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions, authSessionConfigured } from "@/auth";

export const dynamic = "force-dynamic";

export default async function DeploymentsLayout({ children }: { children: React.ReactNode }) {
  if (!authSessionConfigured) redirect("/auth/signin?callbackUrl=/deployments");
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin?callbackUrl=/deployments");
  if (!session.user.roles.includes("deployment-admin")) redirect("/auth/denied");
  return children;
}
