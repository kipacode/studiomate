"use client";

import type { Mood } from "@/lib/types";
import { MOODS } from "@/lib/moods";
import { cn } from "@/lib/utils";
import { MoodAvatar } from "@/components/ui/mood-avatar";

export function MoodPicker({
  value,
  onSelect,
  name,
}: {
  value?: Mood;
  onSelect: (mood: Mood) => void;
  name: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {MOODS.map((mood) => {
        const selected = value === mood.key;
        return (
          <button
            key={mood.key}
            type="button"
            onClick={() => onSelect(mood.key)}
            aria-pressed={selected}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border p-3 transition-all",
              selected
                ? "border-transparent bg-white/[0.06] ring-2 ring-white/20"
                : "border-white/[0.06] bg-neutral-900/40 hover:bg-white/[0.04]"
            )}
          >
            <MoodAvatar
              mood={mood.key}
              name={name}
              className={cn(
                "size-12 text-2xl transition-transform",
                selected && "scale-105"
              )}
            />
            <span
              className={cn(
                "text-xs font-medium",
                selected ? mood.text : "text-neutral-400"
              )}
            >
              {mood.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
