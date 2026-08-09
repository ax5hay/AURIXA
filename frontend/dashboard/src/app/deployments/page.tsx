import { developmentAuthEnabled, githubAuthConfigured } from "@/auth";
import { DeploymentsContent } from "./DeploymentsContent";

export default function DeploymentsPage() {
  return (
    <DeploymentsContent
      githubAuthConfigured={githubAuthConfigured}
      developmentAuthEnabled={developmentAuthEnabled}
    />
  );
}
