import Link from "next/link";
import { Disclaimer } from "@/components/Shell";
import { DemoButton } from "@/components/DemoButton";

const POINTS = [
  {
    label: "Any lab",
    body: "Drop in PDFs from different labs across different years. Marker names, units, and date formats are reconciled into one record — mmol/L becomes mg/dL, S-Creatinine becomes Creatinine.",
  },
  {
    label: "Rule-based flags",
    body: "A value outside the range printed on its own report, or a move of more than 20% since the last sample, gets flagged. Deterministic rules, not a model's opinion.",
  },
  {
    label: "Questions, not answers",
    body: "Flagged drifts become a list of questions to take to your next appointment. Vitals never tells you what a result means.",
  },
];

export default function Landing() {
  return (
    <>
      <section className="border-b border-edge">
        <div className="mx-auto max-w-6xl px-6 py-24 md:px-10 md:py-40">
          <div className="flex items-center gap-3">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
              Local-first health records
            </p>
          </div>

          <h1 className="mt-8 max-w-4xl font-display text-5xl uppercase leading-[0.95] tracking-tight md:text-7xl">
            Every lab report,
            <br />
            one timeline.
          </h1>

          <p className="mt-8 max-w-xl text-base leading-relaxed text-muted md:text-lg">
            Your results live in a dozen PDFs from a dozen labs. Vitals reads them all into a
            single longitudinal record so you can see what is actually drifting — and walk into
            your next appointment with the right questions.
          </p>

          <div className="mt-12 flex flex-wrap items-center gap-4">
            <DemoButton />
            <Link
              href="/upload"
              className="rounded-full border border-edge px-6 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors duration-200 hover:border-paper hover:text-paper"
            >
              Upload my reports
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-edge">
        <div className="mx-auto max-w-6xl px-6 py-16 md:px-10 md:py-24">
          <div className="flex items-baseline gap-4">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <h2 className="font-display text-2xl uppercase tracking-tight md:text-3xl">
              Nothing leaves this machine
            </h2>
          </div>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted md:text-base">
            PDFs are parsed in your browser and stored in this browser&apos;s IndexedDB. There is
            no account, no server, and no upload. The only outbound request Vitals can make is to
            Anthropic&apos;s API, only for layouts the built-in parser cannot read, and only if you
            paste your own API key into Settings. A wipe control on the timeline empties everything.
          </p>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-6 py-16 md:px-10 md:py-24">
          <div className="grid gap-px border border-edge bg-edge md:grid-cols-3">
            {POINTS.map((point) => (
              <div key={point.label} className="bg-bg p-8 md:p-10">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
                  {point.label}
                </p>
                <p className="mt-5 text-sm leading-relaxed text-muted">{point.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Disclaimer />
    </>
  );
}
