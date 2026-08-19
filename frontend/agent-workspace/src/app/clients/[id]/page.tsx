"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Alert,
  Avatar,
  Button,
  Card,
  EmptyState,
  Input,
  PageLoader,
  SectionHeader,
  StatusBadge,
  Tabs,
  Timeline,
  useToast,
} from "@aurixa/ui-kit";
import { getClient, getClientShowings, updateClient, type Showing, type Client } from "../../api";
import { RealEstateDisclaimer } from "@aurixa/ui-kit";
import { useStaffContext } from "@/context/StaffContext";
import { ClientBrief } from "@/components/ClientBrief";
import { DraftCopyButton } from "@/components/DraftCopyButton";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ClientDetailPage() {
  const params = useParams();
  const { tenantId, roleCategory } = useStaffContext();
  const canCoordinate = roleCategory === "agent" || roleCategory === "coordination";
  const id = parseInt(String(params?.id ?? ""), 10);
  const [client, setClient] = useState<Client | null>(null);
  const [appointments, setAppointments] = useState<Showing[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isNaN(id)) {
      setLoading(false);
      return;
    }
    Promise.all([
      getClient(id, tenantId).then(setClient),
      getClientShowings(id).then(setAppointments),
    ])
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [id, tenantId]);

  if (loading) return <PageLoader label="Loading client record" />;
  if (isNaN(id) || !client) {
    return (
      <EmptyState
        title="Client record unavailable"
        description="The record could not be found or loaded. No client information is displayed."
        action={
          <Button asChild>
            <Link href="/clients">Back to clients</Link>
          </Button>
        }
      />
    );
  }

  const ordered = [...appointments].sort((a, b) => +new Date(b.startTime) - +new Date(a.startTime));
  const upcoming = ordered.filter(
    (appointment) =>
      ["confirmed", "checked_in", "in_room"].includes(appointment.status) &&
      new Date(appointment.startTime) >= new Date(),
  );
  const past = ordered.filter((appointment) => !upcoming.includes(appointment));

  async function saveNote() {
    if (!noteInput.trim()) return;
    setSavingNote(true);
    try {
      const updated = await updateClient(id, { append_note: noteInput.trim() });
      setClient(updated);
      setNoteInput("");
      toast({ title: "Note saved", tone: "success" });
    } catch {
      toast({ title: "Could not save note", tone: "error" });
    } finally {
      setSavingNote(false);
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <Link
        href="/clients"
        className="inline-flex min-h-11 items-center text-sm font-semibold text-ui-accent"
      >
        ← Client directory
      </Link>

      <Card variant="feature" padding="lg" className="sticky top-2 z-20">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar name={client.fullName} size="lg" />
            <div className="min-w-0">
              <p className="eyebrow">Active client context · Record #{client.id}</p>
              <h1 className="truncate text-2xl font-semibold text-ui-ink sm:text-3xl">
                {client.fullName}
              </h1>
              <p className="mt-1 text-sm text-ui-muted">
                {[client.email, client.phoneNumber].filter(Boolean).join(" · ") ||
                  "No contact information on file"}
              </p>
              <p className="mt-2 text-xs text-ui-faint">
                Organization scope {client.tenantId ?? "unspecified"} · Keep this banner visible
                while coordinating showings and follow-ups.
              </p>
            </div>
          </div>
          {canCoordinate && (
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary">
                <Link href={`/chat?clientId=${client.id}`}>Open assistant</Link>
              </Button>
              <Button asChild>
                <Link href={`/schedule?clientId=${client.id}`}>Schedule showing</Link>
              </Button>
            </div>
          )}
        </div>
      </Card>

      {failed && (
        <Alert title="Some client activity may be unavailable" tone="warning">
          The showing history could not be fully loaded.
        </Alert>
      )}

      <ClientBrief client={client} upcoming={upcoming} showingCount={ordered.length} />

      <Tabs
        ariaLabel="Client record sections"
        defaultValue="overview"
        items={[
          {
            value: "overview",
            label: "Overview",
            content: (
              <section className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <SectionHeader
                    title="Client snapshot"
                    description="Verified identity and the next operational action for this client."
                  />
                  <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-ui-faint">
                        Full name
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-ui-ink">{client.fullName}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-ui-faint">
                        Record ID
                      </dt>
                      <dd className="mt-1 font-mono text-sm text-ui-ink">{client.id}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-ui-faint">
                        Email
                      </dt>
                      <dd className="mt-1 text-sm text-ui-ink">{client.email || "Not on file"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-ui-faint">
                        Phone
                      </dt>
                      <dd className="mt-1 text-sm text-ui-ink">
                        {client.phoneNumber || "Not on file"}
                      </dd>
                    </div>
                  </dl>
                </Card>
                <Card>
                  <SectionHeader title="Next showing" description="Upcoming confirmed activity." />
                  {upcoming[0] ? (
                    <div className="mt-4 space-y-3">
                      <StatusBadge status={upcoming[0].status} />
                      <p className="font-semibold text-ui-ink">
                        {upcoming[0].agentName ?? upcoming[0].providerName ?? "Showing"}
                      </p>
                      <p className="text-sm text-ui-muted">{formatDate(upcoming[0].startTime)}</p>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-ui-muted">No upcoming showings on file.</p>
                  )}
                </Card>
              </section>
            ),
          },
          {
            value: "showings",
            label: "Showings",
            content: (
              <section>
                <SectionHeader
                  title="Showing history"
                  description="Newest activity first. Status includes a text label."
                  count={ordered.length}
                />
                {ordered.length ? (
                  <Card variant="compact" padding="lg">
                    <Timeline
                      items={ordered.map((appointment) => ({
                        id: appointment.id,
                        title: appointment.agentName ?? appointment.providerName ?? "Showing",
                        time: formatDate(appointment.startTime),
                        description: <StatusBadge status={appointment.status} />,
                      }))}
                    />
                  </Card>
                ) : (
                  <EmptyState
                    compact
                    title="No showing history"
                    description="No showing records were returned for this client."
                  />
                )}
                {past.length > 0 && (
                  <p className="mt-3 text-xs text-ui-faint">
                    {past.length} past or closed showing{past.length === 1 ? "" : "s"} included
                    above.
                  </p>
                )}
              </section>
            ),
          },
          {
            value: "integrations",
            label: "Integrations",
            content: (
              <section>
                <SectionHeader
                  title="Connected systems"
                  description="Only information supplied by connected brokerage systems is shown. Empty cards are not negative findings."
                />
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    [
                      "Financing",
                      "No pre-approval or mortgage feed is connected for this client.",
                    ],
                    [
                      "Applications",
                      "Rental or purchase application status is unavailable in this workspace.",
                    ],
                    ["Listings", "Saved listings and shortlists are not connected."],
                    ["Maintenance", "Property management tickets are not connected."],
                    ["Documents", "Transaction document repositories are not connected."],
                    ["Leads", "Inbound lead source attribution is not connected."],
                  ].map(([title, description]) => (
                    <Card key={title} variant="compact" padding="md">
                      <div className="flex items-center justify-between gap-3">
                        <h2 className="font-semibold text-ui-ink">{title}</h2>
                        <StatusBadge status="offline" label="Unavailable" />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-ui-muted">{description}</p>
                    </Card>
                  ))}
                </div>
                <div className="mt-4">
                  <RealEstateDisclaimer variant="not-legal" />
                </div>
              </section>
            ),
          },
          {
            value: "activity",
            label: "Notes & activity",
            content: (
              <section className="space-y-4">
                <SectionHeader
                  title="Coordinator notes"
                  description="Quick updates visible to the team on this client record."
                />
                <Card>
                  {client.notes ? (
                    <pre className="whitespace-pre-wrap text-sm text-ui-muted">{client.notes}</pre>
                  ) : (
                    <p className="text-sm text-ui-muted">No notes yet.</p>
                  )}
                  {canCoordinate && (
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <Input
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        placeholder="Jane toured Oak St — wants Westside only now..."
                        aria-label="Add client note"
                      />
                      <Button loading={savingNote} onClick={() => void saveNote()}>
                        Add note
                      </Button>
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <DraftCopyButton
                      clientId={client.id}
                      draftType="client_update"
                      label="Draft client update SMS"
                    />
                    <DraftCopyButton
                      clientId={client.id}
                      draftType="follow_up"
                      label="Draft follow-up SMS"
                    />
                  </div>
                </Card>
                <Card variant="compact" padding="md">
                  <ul className="space-y-2 text-sm text-ui-muted">
                    <li>Showing history: {ordered.length} on record.</li>
                    {client.lastContactAt && (
                      <li>Last contact: {new Date(client.lastContactAt).toLocaleString()}</li>
                    )}
                  </ul>
                </Card>
              </section>
            ),
          },
        ]}
      />
    </div>
  );
}
