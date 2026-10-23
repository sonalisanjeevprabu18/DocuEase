import {
  BookOpen,
  Check,
  ClipboardList,
  KeyRound,
  Layers,
  Lightbulb,
  ListChecks,
  MessageSquare,
  Zap,
} from "lucide-react";

const ICONS = {
  short_summary: Zap,
  beginner: Lightbulb,
  detailed_summary: BookOpen,
  study_notes: ClipboardList,
  concepts: KeyRound,
  qa: MessageSquare,
  bullet_points: ListChecks,
  section_wise: Layers,
};

export default function FormatTiles({ formats, value, onChange, disabled }) {
  return (
    <fieldset
      disabled={disabled}
      className="paper-card min-w-0 p-4 sm:p-5"
      aria-describedby="format-hint"
    >
      <legend className="px-1 font-serif text-xl text-midnight">Choose your lens</legend>
      <p id="format-hint" className="mt-1 px-1 text-xs leading-5 text-muted">
        Same document, different reader. The model is instructed to invent nothing.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {formats.map((option) => {
          const Icon = ICONS[option.id] || BookOpen;
          const selected = value === option.id;
          return (
            <label
              key={option.id}
              className={`group flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-violet ${
                selected
                  ? "border-violet/70 bg-violet-soft/40"
                  : "border-line bg-paper hover:border-violet/40 hover:bg-violet-soft/20"
              }`}
            >
              <input
                type="radio"
                name="format"
                value={option.id}
                checked={selected}
                onChange={() => onChange(option.id)}
                className="sr-only"
              />
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl transition ${
                  selected
                    ? "bg-violet text-white"
                    : "bg-sand/70 text-ink group-hover:bg-sand"
                }`}
                aria-hidden="true"
              >
                <Icon size={15} />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-[13px] font-semibold text-midnight">
                  {option.label}
                  {selected && (
                    <Check size={13} className="text-violet" aria-hidden="true" />
                  )}
                </span>
                <span className="mt-0.5 block text-[11px] leading-5 text-muted">
                  {option.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
