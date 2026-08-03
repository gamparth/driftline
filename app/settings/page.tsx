"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader, Section, Shell } from "@/components/Shell";
import { MODEL, clearApiKey, getApiKey, setApiKey, verifyApiKey } from "@/lib/llm/client";
import { PRODUCT_NAME } from "@/lib/product";

type Status =
  | { kind: "idle" }
  | { kind: "verifying" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

export default function SettingsPage() {
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    queueMicrotask(() => setSaved(!!getApiKey()));
  }, []);

  async function save() {
    const key = value.trim();
    if (!key) return;
    setStatus({ kind: "verifying" });
    const result = await verifyApiKey(key);
    if (!result.ok) {
      setStatus({ kind: "error", message: result.error });
      return;
    }
    setApiKey(key);
    setValue("");
    setSaved(true);
    setStatus({ kind: "saved" });
  }

  return (
    <Shell>
      <PageHeader eyebrow="Configuration" title="Settings">
        <p className="text-sm leading-relaxed text-muted">
          {PRODUCT_NAME} reads standard lab layouts and computes every flag without a key. A key
          adds two optional things: reading layouts the built-in parser can&apos;t, and drafting
          questions from flagged markers.
        </p>
      </PageHeader>

      <Section>
        <div className="max-w-2xl">
          <div className="rounded-xl border border-line bg-surface p-6 md:p-8">
            <h2 className="font-display text-lg text-ink">Anthropic API key</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {saved
                ? "A key is saved in this browser. Paste a new one to replace it."
                : "Optional. Paste a key to enable the AI extractor and question drafting."}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <input
                type="password"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setStatus({ kind: "idle" });
                }}
                placeholder={saved ? "Replace saved key…" : "sk-ant-…"}
                aria-label="Anthropic API key"
                className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-4 py-2.5 font-mono text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none"
              />
              <button
                onClick={save}
                disabled={!value.trim() || status.kind === "verifying"}
                className="rounded-lg bg-brand px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-white transition-opacity duration-200 hover:opacity-90 disabled:opacity-40"
              >
                {status.kind === "verifying" ? "Verifying…" : "Verify & save"}
              </button>
            </div>

            {status.kind === "error" ? (
              <p className="mt-4 text-sm text-alert">{status.message}</p>
            ) : null}
            {status.kind === "saved" ? (
              <p className="mt-4 text-sm text-ok">Key verified against the API and saved.</p>
            ) : null}

            {saved ? (
              <button
                onClick={() => {
                  clearApiKey();
                  setSaved(false);
                  setStatus({ kind: "idle" });
                }}
                className="mt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors duration-200 hover:text-alert"
              >
                Remove saved key
              </button>
            ) : null}
          </div>

          <div className="mt-10 rounded-xl border border-line bg-surface p-6 md:p-8">
            <h2 className="font-display text-lg text-ink">What the key is used for</h2>
            <ul className="mt-5 space-y-4 text-sm leading-relaxed text-muted">
              <li>
                <strong className="font-medium text-ink">Stored locally.</strong> It lives in this
                browser&apos;s localStorage and is sent nowhere except Anthropic&apos;s API, in the
                request that uses it.
              </li>
              <li>
                <strong className="font-medium text-ink">Direct from your browser.</strong> Calls
                go straight to <span className="font-mono text-ink">api.anthropic.com</span> using{" "}
                <span className="font-mono text-ink">{MODEL}</span>. {PRODUCT_NAME} has no server,
                so there is nothing in between to log anything.
              </li>
              <li>
                <strong className="font-medium text-ink">Minimal payloads.</strong> Extraction
                sends the text of a report the parser could not read. Question drafting sends only
                flagged marker names, values, and dates — never your whole record.
              </li>
              <li>
                <strong className="font-medium text-ink">Verified on save.</strong> One minimal
                request confirms the key works, so a bad key fails here rather than mid-upload.
              </li>
            </ul>
          </div>

          <p className="mt-10 text-sm text-muted">
            Export, import, or delete your record on the{" "}
            <Link href="/reports" className="text-brand underline underline-offset-4">
              data page
            </Link>
            .
          </p>
        </div>
      </Section>
    </Shell>
  );
}
