export default function UsageMeter({ usage, cooldown = 0, onResetSession }) {
  const limit = Math.max(usage?.limit ?? 3, 1);
  const used = Math.min(usage?.used ?? 0, limit);
  const remaining = Math.max(limit - used, 0);
  const cooldownActive = cooldown > 0;

  return (
    <section aria-label="Session usage" className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Free AI generations
        </p>
        <span className="text-xs font-medium text-slate-600">
          {used} / {limit} used
        </span>
      </div>
      <div className="mt-2 flex items-center gap-1.5" aria-hidden="true">
        {Array.from({ length: limit }).map((_, index) => (
          <span
            key={index}
            className={`h-2 flex-1 rounded-full ${
              index < used ? "bg-indigo-600" : "bg-slate-200"
            }`}
          />
        ))}
      </div>
      <p aria-live="polite" className="mt-2 text-xs leading-5 text-slate-600">
        {remaining > 0
          ? `${remaining} generation${remaining === 1 ? "" : "s"} left in this session.`
          : "No AI generations left this session. Demo mode is still available."}
        {cooldownActive && (
          <span className="block font-medium text-amber-700">
            Cooldown: next generation in {cooldown}s.
          </span>
        )}
      </p>
      <button
        type="button"
        onClick={onResetSession}
        className="mt-2 text-xs font-medium text-indigo-700 underline underline-offset-2 hover:text-indigo-900"
      >
        Start a new session
      </button>
      <p className="mt-1 text-[11px] leading-4 text-slate-400">
        Quotas are per browser session, enforced by the server.
      </p>
    </section>
  );
}
