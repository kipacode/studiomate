import type { Mood } from "@/lib/types";
import { getMood } from "@/lib/moods";
import { cn, getInitials } from "@/lib/utils";

const FACE_STROKE = "#1c1917";

function MoodFace({ mood }: { mood: Mood }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className="h-[62%] w-[62%]"
      fill="none"
      stroke={FACE_STROKE}
      strokeWidth={7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {mood === "happy" && (
        <>
          <circle cx={35} cy={42} r={5} fill={FACE_STROKE} stroke="none" />
          <circle cx={65} cy={42} r={5} fill={FACE_STROKE} stroke="none" />
          <path d="M32 60 Q50 78 68 60" />
        </>
      )}
      {mood === "calm" && (
        <>
          <path d="M28 43 Q35 38 42 43" />
          <path d="M58 43 Q65 38 72 43" />
          <path d="M36 62 Q50 70 64 62" />
        </>
      )}
      {mood === "focused" && (
        <>
          <path d="M27 33 L43 37" />
          <path d="M73 33 L57 37" />
          <circle cx={35} cy={45} r={4.5} fill={FACE_STROKE} stroke="none" />
          <circle cx={65} cy={45} r={4.5} fill={FACE_STROKE} stroke="none" />
          <path d="M37 64 L63 64" />
        </>
      )}
      {mood === "energetic" && (
        <>
          <circle cx={34} cy={40} r={6.5} fill={FACE_STROKE} stroke="none" />
          <circle cx={66} cy={40} r={6.5} fill={FACE_STROKE} stroke="none" />
          <path d="M32 56 Q50 82 68 56 Z" fill={FACE_STROKE} stroke="none" />
        </>
      )}
      {mood === "tired" && (
        <>
          <path d="M28 44 Q35 49 42 44" />
          <path d="M58 44 Q65 49 72 44" />
          <path d="M40 65 L60 65" />
        </>
      )}
      {mood === "stressed" && (
        <>
          <path d="M27 32 L43 38" />
          <path d="M73 32 L57 38" />
          <circle cx={35} cy={46} r={4.5} fill={FACE_STROKE} stroke="none" />
          <circle cx={65} cy={46} r={4.5} fill={FACE_STROKE} stroke="none" />
          <path d="M34 65 Q40 60 46 65 T58 65 T66 65" strokeWidth={6} />
        </>
      )}
      {mood === "excited" && (
        <>
          <path d="M27 30 Q35 25 43 30" />
          <path d="M57 30 Q65 25 73 30" />
          <circle cx={35} cy={42} r={6.5} fill={FACE_STROKE} stroke="none" />
          <circle cx={65} cy={42} r={6.5} fill={FACE_STROKE} stroke="none" />
          <path d="M30 56 Q50 84 70 56 Z" fill={FACE_STROKE} stroke="none" />
        </>
      )}
      {mood === "sad" && (
        <>
          <path d="M28 36 L42 40" />
          <path d="M72 36 L58 40" />
          <circle cx={35} cy={46} r={4.5} fill={FACE_STROKE} stroke="none" />
          <circle cx={65} cy={46} r={4.5} fill={FACE_STROKE} stroke="none" />
          <path d="M34 67 Q50 55 66 67" />
          <path d="M35 52 Q33 60 31 64" strokeWidth={5} />
        </>
      )}
      {mood === "angry" && (
        <>
          <path d="M28 34 L43 41" />
          <path d="M72 34 L57 41" />
          <circle cx={35} cy={47} r={4.5} fill={FACE_STROKE} stroke="none" />
          <circle cx={65} cy={47} r={4.5} fill={FACE_STROKE} stroke="none" />
          <path d="M34 67 Q50 58 66 67" />
        </>
      )}
      {mood === "cool" && (
        <>
          <rect x={18} y={36} width={26} height={15} rx={5} fill={FACE_STROKE} stroke="none" />
          <rect x={56} y={36} width={26} height={15} rx={5} fill={FACE_STROKE} stroke="none" />
          <path d="M44 43 L56 43" strokeWidth={4} />
          <path d="M36 62 Q49 70 62 60" />
        </>
      )}
      {mood === "caffeinated" && (
        <>
          <circle cx={35} cy={42} r={8} fill={FACE_STROKE} stroke="none" />
          <circle cx={65} cy={42} r={8} fill={FACE_STROKE} stroke="none" />
          <circle cx={32} cy={39} r={2.5} fill="#fff" stroke="none" />
          <circle cx={62} cy={39} r={2.5} fill="#fff" stroke="none" />
          <circle cx={50} cy={66} r={6} strokeWidth={6} />
        </>
      )}
      {mood === "neutral" && (
        <>
          <circle cx={35} cy={43} r={5} fill={FACE_STROKE} stroke="none" />
          <circle cx={65} cy={43} r={5} fill={FACE_STROKE} stroke="none" />
          <path d="M37 63 L63 63" />
        </>
      )}
    </svg>
  );
}

export function MoodAvatar({
  mood,
  name,
  className,
}: {
  mood?: Mood;
  name: string;
  className?: string;
}) {
  const def = getMood(mood);

  if (!def || !mood) {
    return (
      <div
        className={cn(
          "flex aspect-square shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-neutral-700 to-neutral-800 font-semibold text-neutral-200 ring-2 ring-white/[0.06]",
          className
        )}
      >
        <span className="text-[0.4em]">{getInitials(name)}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex aspect-square shrink-0 items-center justify-center rounded-full bg-gradient-to-br ring-2",
        def.gradient,
        def.ring,
        className
      )}
      title={`Mood: ${def.label}`}
    >
      <MoodFace mood={mood} />
    </div>
  );
}
