import Link from "next/link";
import { Disclaimer, Label } from "@/components/Shell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DemoButton } from "@/components/DemoButton";

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
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 md:px-10">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-brand" />
            <span className="font-display text-lg text-ink">Vitals</span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/timeline"
              className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted transition-colors duration-200 hover:text-ink"
            >
              Open
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="border-b border-line bg-surface">
          <div className="mx-auto max-w-6xl px-6 py-24 md:px-10 md:py-32">
            <div className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                Runs entirely in your browser
              </span>
            </div>

            <h1 className="mt-8 max-w-4xl font-display text-[2.75rem] leading-[1.05] text-ink md:text-[4.25rem]">
              Your labs, finally read
              <br />
              as one story.
            </h1>

            <p className="mt-8 max-w-xl text-base leading-relaxed text-ink-soft md:text-lg">
              Results arrive as a dozen PDFs from a dozen labs, each a snapshot with no memory of
              the last. Vitals reads them into one record and tells you what changed — instead of
              making you compare numbers across years of paperwork.
            </p>

            <div className="mt-12 flex flex-wrap items-center gap-4">
              <DemoButton />
              <Link
                href="/upload"
                className="rounded-full border border-line px-6 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ink transition-colors duration-200 hover:border-line-strong"
              >
                Add my reports
              </Link>
            </div>

            <p className="mt-6 font-mono text-[11px] text-muted">
              No account. No upload. Nothing leaves this device.
            </p>
          </div>
        </section>

        <section className="border-b border-line">
          <div className="mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-28">
            <div className="grid gap-12 md:grid-cols-3 md:gap-8">
              {STEPS.map((step) => (
                <div key={step.n}>
                  <span className="font-mono text-[11px] tabular text-brand">{step.n}</span>
                  <h2 className="mt-4 font-display text-xl text-ink">{step.title}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-line bg-surface">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-2 md:px-10 md:py-28">
            <div>
              <Label>Privacy is the architecture</Label>
              <h2 className="mt-4 font-display text-2xl leading-snug text-ink md:text-3xl">
                There is no server to send your bloodwork to.
              </h2>
            </div>
            <div className="space-y-5 text-sm leading-relaxed text-muted">
              <p>
                PDFs are parsed in the browser and stored in this browser&apos;s IndexedDB. Vitals
                ships as static files — there is no backend, no account, and no analytics.
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

        <section>
          <div className="mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-24">
            <h2 className="max-w-2xl font-display text-2xl leading-snug text-ink md:text-3xl">
              Vitals reports what your labs printed. It does not practise medicine.
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
              Open Vitals
            </Link>
          </div>
        </section>
      </main>

      <Disclaimer />
    </>
  );
}
