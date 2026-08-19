"use client";

import { useState } from "react";
import { Button, Input, useToast } from "@aurixa/ui-kit";
import { updateShowing } from "../app/api";
import { DraftCopyButton } from "./DraftCopyButton";

export function PostShowingNoteModal({
  showingId,
  clientId,
  clientName,
  open,
  onClose,
  onSaved,
}: {
  showingId: number;
  clientId: number;
  clientName: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function save(completed: boolean) {
    setSaving(true);
    try {
      await updateShowing(showingId, {
        status: completed ? "completed" : undefined,
        post_showing_notes: note.trim() || undefined,
      });
      toast({
        title: completed ? "Showing completed" : "Note saved",
        description: `Feedback recorded for ${clientName}.`,
        tone: "success",
      });
      onSaved();
      onClose();
      setNote("");
    } catch (reason) {
      toast({
        title: "Could not save",
        description: reason instanceof Error ? reason.message : "Try again.",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-showing-title"
    >
      <div className="w-full max-w-md rounded-ui-lg bg-ui-surface p-5 shadow-xl">
        <h2 id="post-showing-title" className="text-lg font-semibold text-ui-ink">
          How did the tour go?
        </h2>
        <p className="mt-1 text-sm text-ui-muted">
          One-line feedback for {clientName} — saved to the showing record.
        </p>
        <Input
          className="mt-4"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Loved the kitchen, wants second visit to Westside only..."
          aria-label="Post-showing note"
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button loading={saving} onClick={() => void save(true)}>
            Mark complete
          </Button>
          <Button variant="secondary" loading={saving} onClick={() => void save(false)}>
            Save note only
          </Button>
          <DraftCopyButton
            clientId={clientId}
            showingId={showingId}
            draftType="follow_up"
            label="Draft follow-up"
            context={note.trim() || undefined}
          />
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
