export default function UsagePill({ usage, cooldown = 0 }) {
  const limit = Math.max(usage?.limit ?? 3, 1);
  const used = Math.min(usage?.used ?? 0, limit);
  const remaining = Math.max(limit - used, 0);
  const cooldownActive = cooldown > 0;

  return (
    <div
      className="flex items-center gap-2.5 rounded-full border border-line bg-paper/80 px-3 py-1.5"
      aria-label={`${remaining} of ${limit} free explanations remaining`}
      title="Free explanations left in this browser session"
    >
      <span className="flex items-center gap-1" aria-hidden="true">
        {Array.from({ length: limit }).map((_, index) => (
          <span
            key={index}
            className={`h-1.5 w-1.5 rounded-full ${
              index < remaining ? "bg-violet" : "bg-line"
            }`}
          />
        ))}
      </span>
      <span className="whitespace-nowrap text-[11px] font-semibold text-ink">
        {cooldownActive ? `${cooldown}s` : `${remaining} left`}
      </span>
    </div>
  );
}
