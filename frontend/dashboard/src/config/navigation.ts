export type OperatorRole = "operator" | "support" | "analyst" | "administrator";

export type NavigationItem = {
  route: string;
  label: string;
  group: "Operate" | "Investigate" | "Manage" | "System" | "Help";
  description: string;
  iconKey: string;
  roles: OperatorRole[];
  priority: number;
  mobilePriority?: number;
};

const allRoles: OperatorRole[] = ["operator", "support", "analyst", "administrator"];

export const navigation: NavigationItem[] = [
  {
    route: "/",
    label: "Overview",
    group: "Operate",
    description: "Current health, activity, and next actions",
    iconKey: "home",
    roles: allRoles,
    priority: 1,
    mobilePriority: 1,
  },
  {
    route: "/services",
    label: "Services",
    group: "Operate",
    description: "Service availability, latency, and diagnostics",
    iconKey: "pulse",
    roles: allRoles,
    priority: 2,
    mobilePriority: 2,
  },
  {
    route: "/audit",
    label: "Audit",
    group: "Investigate",
    description: "Review recorded platform activity",
    iconKey: "audit",
    roles: allRoles,
    priority: 3,
    mobilePriority: 3,
  },
  {
    route: "/analytics",
    label: "Analytics",
    group: "Investigate",
    description: "Usage, performance, and cost telemetry",
    iconKey: "chart",
    roles: allRoles,
    priority: 4,
    mobilePriority: 4,
  },
  {
    route: "/tenants",
    label: "Organizations",
    group: "Manage",
    description: "Manage tenant organizations and plans",
    iconKey: "people",
    roles: ["operator", "support", "administrator"],
    priority: 5,
  },
  {
    route: "/knowledge",
    label: "Knowledge",
    group: "Manage",
    description: "Curate tenant-scoped retrieval sources",
    iconKey: "book",
    roles: ["operator", "support", "administrator"],
    priority: 6,
  },
  {
    route: "/playground",
    label: "Playground",
    group: "Investigate",
    description: "Test pipelines and service endpoints",
    iconKey: "test",
    roles: ["operator", "support", "administrator"],
    priority: 7,
  },
  {
    route: "/configuration",
    label: "Runtime facts",
    group: "System",
    description: "Read-only deployed configuration and providers",
    iconKey: "info",
    roles: ["operator", "support", "administrator"],
    priority: 8,
  },
  {
    route: "/deployments",
    label: "Deployments",
    group: "System",
    description: "Coordinate and inspect controlled platform releases",
    iconKey: "deploy",
    roles: ["administrator"],
    priority: 9,
  },
  {
    route: "/settings",
    label: "Behavior settings",
    group: "System",
    description: "Edit persisted platform behavior",
    iconKey: "settings",
    roles: ["administrator"],
    priority: 10,
  },
  {
    route: "/guide",
    label: "Guide",
    group: "Help",
    description: "Short operator orientation",
    iconKey: "help",
    roles: allRoles,
    priority: 11,
  },
];

export const navigationGroups = ["Operate", "Investigate", "Manage", "System", "Help"] as const;

export function navigationForRole(role: OperatorRole) {
  return navigation
    .filter((item) => item.roles.includes(role))
    .sort((a, b) => a.priority - b.priority);
}
