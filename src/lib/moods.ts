import type { Mood } from "./types";

export interface MoodDef {
  key: Mood;
  label: string;
  description: string;
  /** Tailwind gradient stops for the avatar circle */
  gradient: string;
  /** Tailwind ring class for selected / accent state */
  ring: string;
  /** Tailwind text color matching the mood */
  text: string;
}

export const MOODS: MoodDef[] = [
  {
    key: "happy",
    label: "Happy",
    description: "Cheerful and upbeat",
    gradient: "from-amber-300 to-orange-500",
    ring: "ring-amber-400/40",
    text: "text-amber-400",
  },
  {
    key: "calm",
    label: "Calm",
    description: "Relaxed and at ease",
    gradient: "from-sky-300 to-blue-500",
    ring: "ring-sky-400/40",
    text: "text-sky-400",
  },
  {
    key: "focused",
    label: "Focused",
    description: "Locked in and determined",
    gradient: "from-violet-400 to-purple-600",
    ring: "ring-violet-400/40",
    text: "text-violet-400",
  },
  {
    key: "energetic",
    label: "Energetic",
    description: "Buzzing with energy",
    gradient: "from-emerald-300 to-green-500",
    ring: "ring-emerald-400/40",
    text: "text-emerald-400",
  },
  {
    key: "tired",
    label: "Tired",
    description: "Low on fuel today",
    gradient: "from-slate-400 to-slate-600",
    ring: "ring-slate-400/40",
    text: "text-slate-300",
  },
  {
    key: "stressed",
    label: "Stressed",
    description: "Feeling the pressure",
    gradient: "from-rose-300 to-red-500",
    ring: "ring-rose-400/40",
    text: "text-rose-400",
  },
  {
    key: "excited",
    label: "Excited",
    description: "Can't sit still",
    gradient: "from-pink-300 to-fuchsia-500",
    ring: "ring-pink-400/40",
    text: "text-pink-400",
  },
  {
    key: "sad",
    label: "Sad",
    description: "Feeling down",
    gradient: "from-blue-400 to-indigo-600",
    ring: "ring-blue-400/40",
    text: "text-blue-400",
  },
  {
    key: "angry",
    label: "Angry",
    description: "Fired up",
    gradient: "from-orange-400 to-red-600",
    ring: "ring-red-400/40",
    text: "text-red-400",
  },
  {
    key: "cool",
    label: "Cool",
    description: "Feeling unbothered",
    gradient: "from-cyan-300 to-teal-500",
    ring: "ring-cyan-400/40",
    text: "text-cyan-400",
  },
  {
    key: "caffeinated",
    label: "Caffeinated",
    description: "Running on coffee",
    gradient: "from-amber-600 to-stone-700",
    ring: "ring-amber-600/40",
    text: "text-amber-500",
  },
  {
    key: "neutral",
    label: "Neutral",
    description: "Just okay",
    gradient: "from-neutral-400 to-neutral-600",
    ring: "ring-neutral-400/40",
    text: "text-neutral-300",
  },
];

export function getMood(mood: Mood | undefined): MoodDef | undefined {
  return MOODS.find((m) => m.key === mood);
}
