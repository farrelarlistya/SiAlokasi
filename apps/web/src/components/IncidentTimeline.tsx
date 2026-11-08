import {
  formatDateTime,
  PUBLIC_TIMELINE,
  STATUS_LABEL,
  type IncidentStatus,
} from "@sialokasi/shared";
import { Ban, CheckCircle2, Circle, XCircle } from "lucide-react";
import { cn } from "../lib/cn";

type TimelineEntry = { status: IncidentStatus; at: string };

type Step = {
  status: IncidentStatus;
  at: string | null;
  state: "done" | "current" | "pending" | "danger" | "muted";
};

function buildSteps(timeline: TimelineEntry[], currentStatus: IncidentStatus): Step[] {
  const statuses: IncidentStatus[] = [...PUBLIC_TIMELINE];

  if (currentStatus === "SELESAI") {
    statuses.push("SELESAI");
  } else if (currentStatus === "DITOLAK" || currentStatus === "DIBATALKAN") {
    // Ganti langkah terakhir dengan status terminal agar timeline tetap 4 langkah.
    statuses[statuses.length - 1] = currentStatus;
  }

  const timeByStatus = new Map<IncidentStatus, string>();
  for (const entry of timeline) {
    timeByStatus.set(entry.status, entry.at);
  }

  return statuses.map((status) => {
    const at = timeByStatus.get(status) ?? null;

    let state: Step["state"] = "pending";
    if (status === "DITOLAK") state = "danger";
    else if (status === "DIBATALKAN") state = "muted";
    else if (status === currentStatus) state = "current";
    else if (at) state = "done";

    return { status, at, state };
  });
}

function StepIcon({ state }: { state: Step["state"] }) {
  if (state === "danger") return <XCircle aria-hidden="true" className="h-6 w-6 text-danger" />;
  if (state === "muted") return <Ban aria-hidden="true" className="h-6 w-6 text-text-muted" />;
  if (state === "done") return <CheckCircle2 aria-hidden="true" className="h-6 w-6 text-success" />;
  if (state === "current") return <Circle aria-hidden="true" className="h-6 w-6 text-info" />;
  return <Circle aria-hidden="true" className="h-6 w-6 text-text-disabled" />;
}

type IncidentTimelineProps = {
  timeline: TimelineEntry[];
  currentStatus: IncidentStatus;
};

/** Timeline empat langkah yang mudah dibaca tamu, dengan status terminal bila ada. */
export function IncidentTimeline({ timeline, currentStatus }: IncidentTimelineProps) {
  const steps = buildSteps(timeline, currentStatus);

  return (
    <ol className="relative space-y-0">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const stateLabel =
          step.state === "pending"
            ? "Belum terjadi"
            : step.state === "current"
              ? "Status saat ini"
              : step.state === "danger"
                ? "Laporan ditolak"
                : step.state === "muted"
                  ? "Laporan dibatalkan"
                  : "Sudah terjadi";

        return (
          <li key={`${step.status}-${index}`} className="relative flex gap-4 pb-6 last:pb-0">
            {!isLast ? (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute left-3 top-7 h-[calc(100%-12px)] w-0.5",
                  step.state === "done" ? "bg-success/50" : "bg-border",
                )}
              />
            ) : null}

            <span className="relative z-10 grid h-6 w-6 shrink-0 place-items-center">
              <StepIcon state={step.state} />
            </span>

            <div className="min-w-0 pt-0.5">
              <p
                className={cn(
                  "text-base font-medium",
                  step.state === "pending" ? "text-text-disabled" : "text-text",
                )}
              >
                {STATUS_LABEL[step.status]}
              </p>
              <p className="mt-1 text-base text-text-muted">
                {step.at ? formatDateTime(step.at) : stateLabel}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
