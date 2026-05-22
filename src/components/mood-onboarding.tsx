"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useUsers } from "@/lib/users-context";
import type { Mood } from "@/lib/types";
import { MoodPicker } from "@/components/mood-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function MoodOnboarding() {
  const { user, updateCurrentUser } = useAuth();
  const { updateUser } = useUsers();
  const [dismissed, setDismissed] = useState(false);
  const [selected, setSelected] = useState<Mood | undefined>();
  const [saving, setSaving] = useState(false);

  const open = !!user && !user.mood && !dismissed;

  async function handleConfirm() {
    if (!user || !selected) return;
    setSaving(true);
    try {
      await updateUser(user.id, { mood: selected });
      updateCurrentUser({ mood: selected });
      toast.success("Mood saved", { description: "Your avatar now reflects your mood." });
      setDismissed(true);
    } catch {
      toast.error("Couldn't save your mood. Try again from your profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && setDismissed(true)}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>How are you feeling today?</DialogTitle>
          <DialogDescription>
            Pick a mood and your avatar will represent it. You can change it
            anytime from your profile.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <MoodPicker
            value={selected}
            onSelect={setSelected}
            name={user?.name ?? ""}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDismissed(true)}>
            Maybe later
          </Button>
          <Button onClick={handleConfirm} disabled={!selected || saving}>
            {saving ? "Saving..." : "Set mood"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
