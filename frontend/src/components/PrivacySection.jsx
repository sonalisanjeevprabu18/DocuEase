import { Lock, ShieldCheck } from "lucide-react";

export default function PrivacySection({ config }) {
  const external = config.privacy?.external_provider;
  const limits = config.limits;

  const stats = [
    { label: "Upload limit", value: `${limits.max_upload_mb} MB` },
    { label: "Per explanation", value: `${limits.max_extracted_chars.toLocaleString()} chars` },
    { label: "Free explanations", value: `${limits.max_generations_per_session} / session` },
    { label: "Output cap", value: `${limits.max_output_tokens} tokens` },
  ];

  return (
    <section id="privacy" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-20 pt-16 sm:px-6">
      <div className="grid gap-10 border-t border-line pt-12 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <p className="label-caps flex items-center gap-2">
            <Lock size={12} className="text-violet" aria-hidden="true" /> Privacy & limits
          </p>
          <h2 className="mt-3 font-serif text-3xl leading-tight text-midnight sm:text-4xl">
            Nothing is kept. Every limit is real.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-ink/80">
            {config.privacy?.text}
          </p>
          <ul className="mt-5 space-y-3 text-sm leading-6 text-ink/80">
            <li className="flex gap-2.5">
              <ShieldCheck size={16} className="mt-1 shrink-0 text-violet" aria-hidden="true" />
              <span>
                Files are parsed in memory for the length of the request and deleted
                immediately afterwards. Nothing is written to a database.
              </span>
            </li>
            <li className="flex gap-2.5">
              <ShieldCheck size={16} className="mt-1 shrink-0 text-violet" aria-hidden="true" />
              <span>
                {external
                  ? "An external AI provider receives the extracted text and its own retention policy applies — this is not end-to-end privacy."
                  : "Text goes only to the AI model on this server, not to a third-party AI provider."}
              </span>
            </li>
            <li className="flex gap-2.5">
              <ShieldCheck size={16} className="mt-1 shrink-0 text-violet" aria-hidden="true" />
              <span>
                Limits are enforced by the backend, including {limits.rate_limit_per_minute}{" "}
                requests per minute per network. Session quotas deter casual abuse but are
                not abuse-proof.
              </span>
            </li>
          </ul>
        </div>

        <div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[18px] border border-line bg-line">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-paper px-5 py-6">
                <p className="label-caps">{stat.label}</p>
                <p className="mt-2 font-serif text-2xl text-midnight">{stat.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-muted">
            <span className="chip">English explanations</span>
            <span className="chip">MP3 on request</span>
            <span className="chip">No account</span>
            <span className="chip">
              {config.provider?.name || "AI"}
              {config.provider?.model ? ` · ${config.provider.model}` : ""}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
