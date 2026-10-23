import {
  ArrowRight,
  AudioLines,
  BookOpen,
  Layers,
  LockKeyhole,
  Scale,
  ShieldCheck,
  Wand2,
} from "lucide-react";
import DocumentPreview from "./DocumentPreview.jsx";
import ErrorNotice from "./ErrorNotice.jsx";
import Footer from "./Footer.jsx";
import Logo from "./Logo.jsx";
import PrivacySection from "./PrivacySection.jsx";
import UploadPanel from "./UploadPanel.jsx";

const HERO_FEATURES = [
  { icon: Layers, label: "8 reading formats" },
  { icon: AudioLines, label: "Listen or download audio" },
  { icon: LockKeyhole, label: "Nothing stored" },
];

const STRIP = [
  {
    icon: BookOpen,
    title: "Eight ways to read",
    body: "From a quick summary to section-by-section study notes, each lens keeps the source intact.",
  },
  {
    icon: AudioLines,
    title: "Listen while you work",
    body: "Browser speech with real controls, plus a genuine MP3 download when it can be generated.",
  },
  {
    icon: ShieldCheck,
    title: "Your file never sits around",
    body: "Processed in memory and deleted the moment the request ends. No documents, no audio files.",
  },
];

const STEPS = [
  {
    title: "Upload",
    body: "A PDF, DOCX or TXT up to 5 MB. Headings, lists and tables come through intact — scanned PDFs are flagged before you waste a generation.",
  },
  {
    title: "Choose a lens",
    body: "Quick Summary, Explain Like I'm New, Study Notes, Ask and Answer and more. The model works only from your document.",
  },
  {
    title: "Read, copy, listen",
    body: "A properly typeset explanation you can copy, download as TXT or Markdown, or play aloud in the browser.",
  },
];

const FEATURES = [
  {
    icon: Scale,
    title: "Faithful, not creative",
    body: "The prompt forbids invented facts and silent omissions. Output stays anchored to your document.",
  },
  {
    icon: Layers,
    title: "Structure preserved",
    body: "Headings, bullet lists and tables survive extraction, so the explanation understands the shape of the document.",
  },
  {
    icon: BookOpen,
    title: "Made for close reading",
    body: "Section navigation, word counts and a typeset reading view keep you anchored to the source while you work.",
  },
  {
    icon: Wand2,
    title: "Free-tier honest",
    body: "Three free explanations per session, one at a time, with cooldowns and caps shown up front and enforced by the server.",
  },
];

export default function LandingPage({
  config,
  onFile,
  onError,
  busy,
  onDemo,
  serverWarning,
  error,
  onDismissError,
}) {
  return (
    <div id="top" className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-ivory/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <a href="#top" aria-label="DocuEase AI home" className="shrink-0">
            <Logo />
          </a>
          <nav aria-label="Main" className="hidden items-center gap-7 text-sm font-medium text-ink md:flex">
            <a href="#how" className="transition hover:text-violet">
              How it works
            </a>
            <a href="#features" className="transition hover:text-violet">
              Features
            </a>
            <a href="#privacy" className="transition hover:text-violet">
              Privacy
            </a>
          </nav>
          <a
            href="#upload"
            aria-label="Simplify a document"
            className="btn-primary shrink-0 whitespace-nowrap px-3.5 py-2.5 text-[12.5px] sm:px-4 sm:text-[13px]"
          >
            <span className="min-[360px]:hidden">Simplify</span>
            <span className="hidden min-[360px]:inline">Simplify a document</span>
            <ArrowRight size={14} aria-hidden="true" className="hidden sm:block" />
          </a>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-6 pt-10 sm:px-6 sm:pt-16">
          {serverWarning && (
            <div
              role="status"
              className="mb-8 rounded-2xl border border-amber-soft bg-amber-soft/60 px-4 py-3 text-sm text-amber-ink"
            >
              Can’t reach the DocuEase API. Start the backend, or set{" "}
              <code className="rounded bg-paper px-1.5 py-0.5 text-xs">
                VITE_API_BASE_URL
              </code>{" "}
              to the deployed backend URL, then reload.
            </div>
          )}

          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
            <div className="animate-rise">
              <p className="label-caps flex items-center gap-2">
                <span className="h-px w-7 bg-violet" aria-hidden="true" />
                The intelligent reading studio
              </p>
              <h1 className="mt-4 font-serif text-[2.85rem] font-semibold leading-[1.02] tracking-[-0.025em] text-midnight sm:text-6xl lg:text-[3.95rem]">
                Big documents.
                <span className="mt-1 block italic text-violet">Small explanations.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-ink/80 sm:text-lg">
                DocuEase reads the dense version and writes the human version —
                summaries, study notes, key concepts and audio — without changing
                what the document actually says.
              </p>

              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm">
                {HERO_FEATURES.map(({ icon: Icon, label }) => (
                  <span key={label} className="inline-flex items-center gap-2 text-ink">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-mint/70 text-mint-ink">
                      <Icon size={14} aria-hidden="true" />
                    </span>
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="animate-rise-delayed">
              <DocumentPreview />
            </div>
          </div>

          <div className="mx-auto mt-10 max-w-3xl animate-rise-delayed">
            {error && (
              <div className="mb-3">
                <ErrorNotice error={error} onDismiss={onDismissError} />
              </div>
            )}
            <UploadPanel
              onFile={onFile}
              onError={onError}
              busy={busy}
              maxMb={config.limits.max_upload_mb}
              onSample={onDemo}
            />
          </div>

          <div className="mt-8 grid overflow-hidden rounded-[18px] border border-line bg-paper/60 sm:grid-cols-3">
            {STRIP.map(({ icon: Icon, title, body }, index) => (
              <div
                key={title}
                className={`flex items-start gap-3 p-4 sm:p-5 ${
                  index < STRIP.length - 1
                    ? "border-b border-line/60 sm:border-b-0 sm:border-r"
                    : ""
                }`}
              >
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet-soft text-violet">
                  <Icon size={15} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-midnight">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-4 pt-20 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
            <div>
              <p className="label-caps">How it works</p>
              <h2 className="mt-2 font-serif text-3xl tracking-tight text-midnight sm:text-4xl">
                A quieter way to read.
              </h2>
            </div>
            <p className="max-w-xs text-sm leading-6 text-muted">
              Three steps. No account, no dashboard, no data hoarding.
            </p>
          </div>
          <div className="grid gap-8 py-8 sm:grid-cols-3 sm:gap-10">
            {STEPS.map((step, index) => (
              <div key={step.title} className="border-t border-line/70 pt-4 sm:border-t-0 sm:pt-0">
                <span className="font-serif text-2xl italic text-violet">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 font-serif text-xl text-midnight">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink/75">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-4 pt-14 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
            <div>
              <p className="label-caps">Built to be faithful</p>
              <h2 className="mt-2 font-serif text-3xl leading-tight tracking-tight text-midnight sm:text-4xl">
                The document stays the source of truth.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-6 text-ink/80">
                Every explanation is generated from the extracted text with explicit
                instructions against invention, omission and outside knowledge. What
                you read should be a clearer version of the same document — not a
                different one.
              </p>
            </div>
            <div className="grid gap-px overflow-hidden rounded-[18px] border border-line bg-line sm:grid-cols-2">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <div key={title} className="bg-paper p-5">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-mint-soft text-mint-ink">
                    <Icon size={15} aria-hidden="true" />
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-midnight">{title}</h3>
                  <p className="mt-1.5 text-xs leading-5 text-muted">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <PrivacySection config={config} />
      </main>

      <Footer />
    </div>
  );
}
