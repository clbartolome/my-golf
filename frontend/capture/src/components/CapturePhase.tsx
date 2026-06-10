import type { ReactNode } from "react";

export type CapturePhaseTone = "prepare" | "result";

const TONE: Record<
  CapturePhaseTone,
  { ring: string; bg: string; bar: string; title: string; badge: string; stepActive: string; stepDone: string }
> = {
  prepare: {
    ring: "border-sky-400/30",
    bg: "bg-sky-400/6",
    bar: "bg-sky-400",
    title: "text-sky-200",
    badge: "bg-sky-400/20 text-sky-100",
    stepActive: "border-sky-400/50 bg-sky-400/15 text-sky-100",
    stepDone: "border-sky-400/25 bg-sky-400/8 text-sky-200/70",
  },
  result: {
    ring: "border-sand/35",
    bg: "bg-sand/6",
    bar: "bg-sand",
    title: "text-sand",
    badge: "bg-sand/20 text-sand",
    stepActive: "border-sand/50 bg-sand/15 text-sand",
    stepDone: "border-sand/25 bg-sand/8 text-sand/70",
  },
};

interface ShotPhaseStepsProps {
  active: CapturePhaseTone;
}

export function ShotPhaseSteps({ active }: ShotPhaseStepsProps) {
  const steps: { tone: CapturePhaseTone; step: number; label: string; short: string }[] = [
    { tone: "prepare", step: 1, label: "Antes de golpear", short: "Antes" },
    { tone: "result", step: 2, label: "En la bola", short: "En bola" },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {steps.map(({ tone, step, label, short }) => {
        const t = TONE[tone];
        const isActive = active === tone;
        const isDone = active === "result" && tone === "prepare";
        return (
          <div
            key={tone}
            className={`rounded-xl border px-3 py-2.5 transition-colors ${
              isActive ? t.stepActive : isDone ? t.stepDone : "border-white/8 bg-white/3 text-white/35"
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
              {step} · {short}
            </p>
            <p className={`mt-0.5 text-xs font-semibold ${isActive || isDone ? "" : "text-white/40"}`}>
              {label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

interface CapturePhaseProps {
  step: number;
  title: string;
  description: string;
  tone: CapturePhaseTone;
  children: ReactNode;
}

export function CapturePhase({ step, title, description, tone, children }: CapturePhaseProps) {
  const t = TONE[tone];
  return (
    <section className={`overflow-hidden rounded-3xl border ${t.ring} ${t.bg}`}>
      <div className={`h-1 ${t.bar}`} />
      <div className="space-y-4 p-4">
        <header>
          <span className={`inline-flex rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${t.badge}`}>
            Paso {step}
          </span>
          <h3 className={`mt-2 text-lg font-bold ${t.title}`}>{title}</h3>
          <p className="mt-1 text-sm text-white/50">{description}</p>
        </header>
        {children}
      </div>
    </section>
  );
}

interface PrepareRecapProps {
  club: string;
  distanceBefore: string;
  onEdit: () => void;
}

export function PrepareRecap({ club, distanceBefore, onEdit }: PrepareRecapProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-sky-400/20 bg-sky-400/8 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-sky-200/70">Antes de golpear</p>
        <p className="truncate text-sm font-semibold text-white">
          {club} · {distanceBefore} m al hoyo
        </p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 rounded-lg bg-sky-400/15 px-2.5 py-1.5 text-xs font-semibold text-sky-100"
      >
        Editar
      </button>
    </div>
  );
}

export function phaseFooterClass(tone: CapturePhaseTone): string {
  const base = "w-full min-h-16 rounded-2xl text-lg font-bold disabled:opacity-40";
  if (tone === "prepare") {
    return `${base} bg-sky-400 text-fairway-950 active:bg-sky-300`;
  }
  return `${base} bg-sand text-fairway-950 active:bg-sand/90`;
}
