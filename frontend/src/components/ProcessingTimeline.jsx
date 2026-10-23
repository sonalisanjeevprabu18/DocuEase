import { Check } from "lucide-react";

const STEPS = [
  { key: "upload", label: "Upload" },
  { key: "extract", label: "Extract" },
  { key: "simplify", label: "Simplify" },
  { key: "ready", label: "Ready" },
];

function resolve(stage) {
  switch (stage) {
    case "extracting":
      return { completed: 1, active: 1 };
    case "generating":
      return { completed: 2, active: 2 };
    case "done":
      return { completed: 4, active: -1 };
    default:
      return { completed: 2, active: 2 };
  }
}

export default function ProcessingTimeline({ stage = "ready" }) {
  const { completed, active } = resolve(stage);

  return (
    <div className="rounded-full border border-line/80 bg-paper/60 px-3 py-2 sm:px-4">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1.5" aria-label="Processing steps">
        {STEPS.map((step, index) => {
          const done = index < completed;
          const current = index === active;
          return (
            <li
              key={step.key}
              className="flex items-center gap-1.5"
              aria-current={current ? "step" : undefined}
            >
              <span
                className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${
                  done
                    ? "bg-violet text-white"
                    : current
                      ? "animate-pulse-ring border border-violet text-violet"
                      : "border border-line text-muted"
                }`}
                aria-hidden="true"
              >
                {done ? <Check size={11} /> : index + 1}
              </span>
              <span
                className={`text-[11px] font-semibold ${
                  done ? "text-ink" : current ? "text-violet" : "text-muted"
                }`}
              >
                {step.label}
              </span>
              {index < STEPS.length - 1 && (
                <span
                  className={`mx-1 hidden h-px w-5 sm:block ${
                    done ? "bg-violet/40" : "bg-line"
                  }`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
