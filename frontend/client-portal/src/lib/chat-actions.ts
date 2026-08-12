export interface ChatActionChip {
  label: string;
  href: string;
}

const RULES: Array<{ pattern: RegExp; label: string; href: string }> = [
  { pattern: /\b(next|upcoming)\s+(showing|tour|appointment)\b/i, label: "View showings", href: "/showings" },
  { pattern: /\b(showing|tour|appointment|schedule)\b/i, label: "My showings", href: "/showings" },
  { pattern: /\b(listing|listings|property|properties|home|house|condo)\b/i, label: "Browse listings", href: "/listings" },
  { pattern: /\b(apply|application|rental|lease)\b/i, label: "Applications", href: "/applications" },
  { pattern: /\b(financ|mortgage|pre-approval|closing cost|loan)\b/i, label: "Financing", href: "/financing" },
  { pattern: /\b(maintenance|repair|work order|leak|hvac)\b/i, label: "Maintenance", href: "/maintenance" },
  { pattern: /\b(document|paperwork|disclosure)\b/i, label: "Documents", href: "/documents" },
  { pattern: /\b(agent|broker|contact)\b/i, label: "Get help", href: "/help" },
];

const MAX_CHIPS = 3;

/** Derive deep-link chips from the latest user prompt and assistant reply. */
export function suggestChatActions(prompt: string, reply: string): ChatActionChip[] {
  const haystack = `${prompt}\n${reply}`.toLowerCase();
  const seen = new Set<string>();
  const chips: ChatActionChip[] = [];

  for (const rule of RULES) {
    if (!rule.pattern.test(haystack)) continue;
    if (seen.has(rule.href)) continue;
    seen.add(rule.href);
    chips.push({ label: rule.label, href: rule.href });
    if (chips.length >= MAX_CHIPS) break;
  }

  return chips;
}

export function isFairHousingBlocked(text: string): boolean {
  return /\[Content Redacted - Fair Housing Policy\]/i.test(text);
}

export function fairHousingAssistCopy(escalationType?: string | null): string {
  if (escalationType === "fair_housing") {
    return "Fair Housing Assist flagged language that may filter by protected class. Your agent can help with lawful, objective criteria such as budget, beds, and commute.";
  }
  return "Fair Housing Assist reviewed this message against brokerage policy. Protected-class preferences are not permitted in housing search.";
}
