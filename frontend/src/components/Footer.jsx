import Logo from "./Logo.jsx";

export default function Footer() {
  return (
    <footer className="border-t border-line bg-paper/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <Logo compact />
          <p className="text-xs text-muted">
            DocuEase AI · an open-source reading studio
          </p>
        </div>
        <p className="max-w-md text-[11px] leading-5 text-muted">
          AI explanations can be imperfect — verify important facts against the
          original document. Built with FastAPI and React, designed for free-tier
          hosting.
        </p>
      </div>
    </footer>
  );
}
