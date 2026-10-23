import { ArrowRight, AudioLines, Sparkles } from "lucide-react";

const WAVE_HEIGHTS = [40, 65, 35, 80, 50, 70, 30, 55];

export default function DocumentPreview() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto h-[300px] w-full max-w-[440px] select-none sm:h-[330px]"
    >
      {/* Dense original document */}
      <div className="animate-drift absolute left-0 top-2 w-[62%] rounded-[16px] border border-line bg-paper/75 p-3.5 shadow-[0_24px_44px_-34px_rgba(11,27,42,0.55)] sm:p-4">
        <div className="flex items-center justify-between border-b border-line/70 pb-2">
          <span className="text-[8px] font-semibold uppercase tracking-[0.2em] text-muted sm:text-[9px]">
            Original · 24 pages
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-sand" />
        </div>
        <div className="mt-3 space-y-1.5">
          {[92, 78, 88, 64, 84, 72, 90, 58].map((width, index) => (
            <div
              key={index}
              className="h-1.5 rounded-full bg-midnight/10"
              style={{ width: `${width}%` }}
            />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="h-2.5 rounded-[2px] bg-sand/80" />
          ))}
        </div>
        <div className="mt-3 space-y-1.5">
          {[86, 70, 80, 52].map((width, index) => (
            <div
              key={index}
              className="h-1.5 rounded-full bg-midnight/10"
              style={{ width: `${width}%` }}
            />
          ))}
        </div>
      </div>

      {/* Simplified reading card */}
      <div className="absolute bottom-1 right-0 w-[60%] rounded-[18px] border border-line bg-paper p-4 shadow-[0_26px_46px_-34px_rgba(11,27,42,0.5)]">
        <span className="inline-flex items-center gap-1 rounded-full bg-mint-soft px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-mint-ink">
          <Sparkles size={9} /> Simplified
        </span>
        <p className="mt-2 font-serif text-lg leading-tight text-midnight">
          A clearer read
        </p>
        <div className="mt-2 space-y-1.5">
          <div className="h-1.5 w-[92%] rounded-full bg-midnight/12" />
          <div className="h-1.5 w-[80%] rounded-full bg-midnight/12" />
          <div className="h-1.5 w-[86%] rounded-full bg-midnight/12" />
        </div>
        <div className="mt-2.5 flex items-center gap-1.5">
          <span className="flex h-4 items-end gap-[2px]">
            {WAVE_HEIGHTS.map((height, index) => (
              <span
                key={index}
                className="w-[2px] rounded-full bg-violet/70"
                style={{ height: `${height}%` }}
              />
            ))}
          </span>
          <span className="inline-flex items-center gap-1 text-[8px] font-semibold text-muted">
            <AudioLines size={9} /> 1:48 listen
          </span>
        </div>
      </div>

      {/* Transformation connector */}
      <div className="absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-line bg-paper text-violet shadow-[0_10px_24px_-12px_rgba(11,27,42,0.4)]">
        <ArrowRight size={16} />
      </div>
    </div>
  );
}
