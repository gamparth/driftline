import Link from "next/link";
import { Disclaimer, Label } from "@/components/Shell";
import { DemoButton } from "@/components/DemoButton";
import { Logo } from "@/components/Logo";
import { PRODUCT_NAME } from "@/lib/product";

const STEPS = [
  {
    n: "01",
    title: "Drop in the PDFs",
    body: "Any lab, any year, any layout. Marker names, units, and date formats are reconciled — S-Creatinine in µmol/L and Creatinine in mg/dL become one line on one chart.",
  },
  {
    n: "02",
    title: "See what actually changed",
    body: "Every value is checked against the range printed on its own report. What's outside, what moved more than 20%, and what's been drifting for years is stated up front.",
  },
  {
    n: "03",
    title: "Walk in prepared",
    body: "Flagged markers become a printable list of questions for your next appointment — with the numbers and dates attached, so nothing gets hand-waved.",
  },
];

export default function Landing() {
  return (
    <>
      <header className="bg-white/72 shadow-[0_10px_34px_rgba(25,33,43,0.06)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-10">
          <Logo />
          <Link
            href="/demo"
            className="rounded-full border border-line bg-surface px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink shadow-[var(--shadow-card)] transition-colors duration-200 hover:bg-brand-soft"
          >
            Demo
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="page-band soft-section">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:grid-cols-[1.02fr_0.98fr] md:px-10 md:py-24">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-white/80 px-3 py-1.5 shadow-[var(--shadow-card)]">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand">
                  Private lab intelligence
                </span>
              </div>

              <h1 className="mt-7 max-w-4xl font-display text-[3rem] font-semibold leading-[0.98] text-ink md:text-[4.8rem]">
                Your labs,
                <span className="block text-brand">finally alive.</span>
              </h1>

              <p className="mt-7 max-w-xl text-base leading-relaxed text-ink-soft md:text-lg">
                Results arrive as scattered PDFs with no memory of the last draw. {PRODUCT_NAME}{" "}
                turns them into one bright record: what changed, what drifted, and what deserves a
                better question at your next visit.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <DemoButton />
                <Link
                  href="/upload"
                  className="rounded-full border border-line bg-white px-6 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink shadow-[var(--shadow-card)] transition-colors duration-200 hover:bg-brand-soft"
                >
                  Add my reports
                </Link>
              </div>

              <p className="mt-5 font-mono text-[11px] text-muted">
                Local-first, duplicate-safe, and built for real PDFs.
              </p>
            </div>
            <HeroPreview />
          </div>
        </section>

        <section className="bg-white shadow-[0_16px_44px_rgba(25,33,43,0.045)]">
          <div className="mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-28">
            <div className="mb-12 max-w-2xl">
              <Label>Workflow</Label>
              <h2 className="mt-4 font-display text-3xl font-semibold leading-tight text-ink md:text-4xl">
                From scattered PDFs to one appointment-ready record.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                The path is intentionally short: add reports, review what changed, and carry the
                clean summary into the visit.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {STEPS.map((step) => (
                <div
                  key={step.n}
                  className="rounded-xl bg-transparent p-0 md:pr-8"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft font-mono text-[11px] tabular text-brand">
                    {step.n}
                  </span>
                  <h2 className="mt-5 font-display text-2xl font-semibold text-ink">
                    {step.title}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-ink-soft">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#f0f8f5] shadow-[0_16px_44px_rgba(25,33,43,0.045)]">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-2 md:px-10 md:py-28">
            <div>
              <Label>Privacy is the architecture</Label>
              <h2 className="mt-4 font-display text-2xl leading-snug text-ink md:text-3xl">
                There is no server to send your bloodwork to.
              </h2>
            </div>
            <div className="space-y-5 text-sm leading-relaxed text-muted">
              <p>
                PDFs are parsed in the browser and stored in this browser&apos;s IndexedDB.{" "}
                {PRODUCT_NAME} ships as static files — there is no backend, no account, and no
                analytics.
              </p>
              <p>
                The one possible outbound request goes to Anthropic&apos;s API, using a key you
                paste yourself, and only for two optional jobs: reading a layout the built-in parser
                can&apos;t, and drafting questions from flagged markers. Neither runs without a key.
              </p>
              <p>
                Export your record to a file whenever you want, and wipe everything with one
                control. Deleting really deletes — there is no copy anywhere else.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-24">
            <h2 className="max-w-2xl font-display text-2xl leading-snug text-ink md:text-3xl">
              {PRODUCT_NAME} reports what your labs printed. It does not practise medicine.
            </h2>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted">
              Every flag is arithmetic against a reference range your own lab printed — never an
              interpretation, a diagnosis, or a recommendation. The output is a better-prepared
              conversation with your doctor, not a substitute for one.
            </p>
            <Link
              href="/timeline"
              className="mt-10 inline-block rounded-full bg-brand px-6 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-white transition-opacity duration-200 hover:opacity-90"
            >
              Open {PRODUCT_NAME}
            </Link>
          </div>
        </section>
      </main>

      <Disclaimer />
    </>
  );
}

function HeroPreview() {
  return (
    <div className="relative">
      <div className="relative overflow-hidden rounded-xl bg-white shadow-[var(--shadow-lift)] ring-1 ring-black/[0.04]">
        <div className="flex items-center justify-between bg-[#f7fbfa] px-5 py-4 shadow-[inset_0_-1px_0_rgba(25,33,43,0.045)]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
              Latest read
            </p>
            <p className="mt-1 font-display text-xl font-semibold text-ink">Meridian 2025</p>
          </div>
          <span className="rounded-full bg-alert-soft px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-alert">
            3 outside range
          </span>
        </div>
        <div className="grid gap-4 p-5">
          {[
            ["Creatinine", "1.28", "mg/dL", "82%"],
            ["HDL", "51", "mg/dL", "56%"],
            ["Vitamin D", "22", "ng/mL", "28%"],
          ].map(([label, value, unit, width], index) => (
            <div key={label} className="rounded-lg border border-line bg-bg p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-display text-base font-semibold text-ink">{label}</p>
                <p className={index === 2 ? "font-mono text-lg text-alert" : "font-mono text-lg text-ink"}>
                  {value} <span className="text-[10px] text-muted">{unit}</span>
                </p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                <div
                  className={index === 2 ? "h-full rounded-full bg-alert" : "h-full rounded-full bg-brand"}
                  style={{ width }}
                />
              </div>
            </div>
          ))}
          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Reports" value="4" />
            <MiniStat label="Markers" value="38" />
            <MiniStat label="History" value="4y" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-accent-soft p-3 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-1 font-mono text-xl text-accent">{value}</p>
    </div>
  );
}
