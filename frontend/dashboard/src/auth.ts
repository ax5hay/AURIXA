import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";

type GitHubAccount = {
  login: string;
};

const splitList = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

export const allowedOrganizations = splitList(
  process.env.AUTH_GITHUB_ALLOWED_ORGS ??
    process.env.GITHUB_ALLOWED_ORGS ??
    process.env.DEPLOYMENT_GITHUB_ALLOWED_ORGS,
);

const allowedTeams = splitList(
  process.env.AUTH_GITHUB_ALLOWED_TEAMS ??
    process.env.GITHUB_ALLOWED_TEAMS ??
    process.env.DEPLOYMENT_GITHUB_ALLOWED_TEAMS,
);

const LOCAL_DEV_AUTH_SECRET = "aurixa-local-development-auth-secret-32";

const sessionSecret =
  process.env.AUTH_SECRET ??
  process.env.NEXTAUTH_SECRET ??
  (process.env["DEPLOYMENT_DEV_AUTH_ENABLED"] === "true"
    ? LOCAL_DEV_AUTH_SECRET
    : undefined);
const githubClientId = process.env.AUTH_GITHUB_ID ?? process.env.GITHUB_ID;
const githubClientSecret = process.env.AUTH_GITHUB_SECRET ?? process.env.GITHUB_SECRET;

export const authSessionConfigured = Boolean(sessionSecret);

export const developmentAuthEnabled = process.env["DEPLOYMENT_DEV_AUTH_ENABLED"] === "true";

export const githubAuthConfigured = Boolean(
  sessionSecret && githubClientId && githubClientSecret && allowedOrganizations.length,
);

async function githubRequest<T>(path: string, accessToken: string): Promise<T | null> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return response.json() as Promise<T>;
}

async function hasAllowedOrganization(accessToken: string) {
  for (const organization of allowedOrganizations) {
    const membership = await githubRequest<{ state?: string }>(
      `/user/memberships/orgs/${encodeURIComponent(organization)}`,
      accessToken,
    );
    if (membership?.state === "active") return true;
  }
  return false;
}

async function hasAllowedTeam(accessToken: string, login: string) {
  if (!allowedTeams.length) return true;

  for (const configuredTeam of allowedTeams) {
    const [organization, slug] = configuredTeam.includes("/")
      ? configuredTeam.split("/", 2)
      : [allowedOrganizations.length === 1 ? allowedOrganizations[0] : "", configuredTeam];
    if (!organization || !slug || !allowedOrganizations.includes(organization)) continue;
    const membership = await githubRequest<{ state?: string }>(
      `/orgs/${encodeURIComponent(organization)}/teams/${encodeURIComponent(slug)}/memberships/${encodeURIComponent(login)}`,
      accessToken,
    );
    if (membership?.state === "active") return true;
  }
  return false;
}

const providers: NextAuthOptions["providers"] = [];

if (githubClientId && githubClientSecret) {
  providers.push(
    GitHubProvider({
      clientId: githubClientId,
      clientSecret: githubClientSecret,
      authorization: { params: { scope: "read:user user:email read:org" } },
      profile(profile) {
        const githubProfile = profile as typeof profile & GitHubAccount;
        return {
          id: String(profile.id),
          name: githubProfile.login,
          email: profile.email,
          image: profile.avatar_url,
        };
      },
    }),
  );
}

if (developmentAuthEnabled) {
  providers.push(
    CredentialsProvider({
      id: "development",
      name: "Local development",
      credentials: {},
      async authorize() {
        return {
          id: "local-development-administrator",
          name: "Local developer",
          email: "local-development@localhost",
        };
      },
    }),
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  secret: sessionSecret,
  pages: {
    signIn: "/auth/signin",
    error: "/auth/denied",
  },
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "development") return developmentAuthEnabled;
      const login = (profile as GitHubAccount | undefined)?.login;
      if (
        account?.provider !== "github" ||
        !githubAuthConfigured ||
        typeof account.access_token !== "string" ||
        !login
      ) {
        return false;
      }
      return (
        (await hasAllowedOrganization(account.access_token)) &&
        (await hasAllowedTeam(account.access_token, login))
      );
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.login = user.name ?? user.email ?? user.id;
        token.authProvider = account?.provider;
        token.roles = ["admin", "deployment-admin"];
        token.tenantId =
          account?.provider === "development" ? "local-development" : allowedOrganizations[0];
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.login = String(token.login ?? "");
        session.user.roles = Array.isArray(token.roles) ? token.roles.map(String) : [];
        session.user.tenantId = String(token.tenantId ?? "");
      }
      return session;
    },
  },
};
