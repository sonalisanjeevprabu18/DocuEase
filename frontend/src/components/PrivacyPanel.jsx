import { GlobeIcon, LockIcon } from "./icons.jsx";

export default function PrivacyPanel({ config }) {
  const external = config.privacy?.external_provider;
  const limits = config.limits;

  return (
    <section id="privacy" aria-labelledby="privacy-heading" className="card scroll-mt-24 p-5">
      <h2 id="privacy-heading" className="text-sm font-semibold text-slate-900">
        Privacy & free-tier limits
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{config.privacy?.text}</p>

      <ul className="mt-3 space-y-2.5 text-xs leading-5 text-slate-600">
        <li className="flex gap-2">
          <LockIcon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
          <span>
            Uploaded files are held in memory for the request only and deleted when it
            finishes. This app never stores documents or generated audio.
          </span>
        </li>
        <li className="flex gap-2">
          <GlobeIcon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
          <span>
            {external
              ? "An external AI provider receives the extracted text; its own retention policy applies. This is not end-to-end privacy."
              : "Text is sent only to the AI model running on this server, not to a third-party AI provider."}
          </span>
        </li>
        <li className="flex gap-2">
          <LockIcon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
          <span>
            Limits are enforced by the backend: {limits.max_upload_mb} MB uploads,{" "}
            {limits.max_extracted_chars.toLocaleString()} characters per generation,{" "}
            {limits.max_generations_per_session} generations per session, one at a time.
            Session quotas are per browser session — good for casual abuse control, not
            a guarantee.
          </span>
        </li>
      </ul>

      <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs">
        <div>
          <dt className="text-slate-400">AI provider</dt>
          <dd className="font-medium text-slate-700">
            {config.provider?.name || "unknown"}
            {config.provider?.model ? ` · ${config.provider.model}` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Max output</dt>
          <dd className="font-medium text-slate-700">{limits.max_output_tokens} tokens</dd>
        </div>
        <div>
          <dt className="text-slate-400">Cooldown</dt>
          <dd className="font-medium text-slate-700">
            {Math.round(limits.generation_cooldown_seconds)}s between generations
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Request limit</dt>
          <dd className="font-medium text-slate-700">
            {limits.rate_limit_per_minute} per minute
          </dd>
        </div>
      </dl>
    </section>
  );
}
