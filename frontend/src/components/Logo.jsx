export default function Logo({ compact = false, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        viewBox="0 0 40 40"
        className="h-9 w-9 shrink-0"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="6"
          y="3.5"
          width="24"
          height="31"
          rx="5"
          fill="#FFFDF8"
          stroke="#0B1B2A"
          strokeWidth="1.7"
        />
        <path
          d="M24 3.5 30 9.5M30 9.5H25a1 1 0 0 1-1-1V3.5"
          stroke="#0B1B2A"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path
          d="M12.5 20.5v4.5M17.2 16v13M21.9 18.5v8"
          stroke="#5B3DF5"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d="M31.5 25.5l1.1 3 3 1.1-3 1.1-1.1 3-1.1-3-3-1.1 3-1.1z"
          fill="#BFF2DA"
          stroke="#0B1B2A"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
      {!compact && (
        <span className="font-serif text-[1.35rem] font-semibold tracking-tight text-midnight">
          DocuEase
          <span className="ml-1 align-super font-sans text-[0.56rem] font-bold uppercase tracking-[0.22em] text-violet">
            AI
          </span>
        </span>
      )}
    </span>
  );
}
