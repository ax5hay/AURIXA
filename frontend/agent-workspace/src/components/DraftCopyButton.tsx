"use client";

import { useState } from "react";
import { Button, useToast } from "@aurixa/ui-kit";
import { generateDraftStream } from "../app/api";

type DraftType = "follow_up" | "reminder" | "client_update";

export function DraftCopyButton({
  clientId,
  showingId,
  draftType,
  label,
  context,
  variant = "secondary",
  size = "sm",
}: {
  clientId: number;
  showingId?: number;
  draftType: DraftType;
  label: string;
  context?: string;
  variant?: "secondary" | "quiet" | "primary";
  size?: "sm" | "md";
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState("");

  async function run() {
    setLoading(true);
    setPreview("");
    try {
      const draft = await generateDraftStream(
        {
          draft_type: draftType,
          client_id: clientId,
          showing_id: showingId,
          channel: "sms",
          context,
        },
        (delta) => setPreview((current) => current + delta),
      );
      await navigator.clipboard.writeText(draft);
      toast({
        title: "Draft copied",
        description: "Message text is on your clipboard.",
        tone: "success",
      });
    } catch (reason) {
      toast({
        title: "Draft failed",
        description: reason instanceof Error ? reason.message : "Try again.",
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button variant={variant} size={size} loading={loading} onClick={() => void run()}>
        {label}
      </Button>
      {preview && loading && (
        <p className="max-w-md truncate text-xs text-ui-faint">{preview}</p>
      )}
    </div>
  );
}
