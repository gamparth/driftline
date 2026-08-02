"use client";

import { useEffect, useState } from "react";
import { PageHeader, Section, Shell } from "@/components/Shell";
import { MODEL, clearApiKey, getApiKey, setApiKey, verifyApiKey } from "@/lib/llm/client";

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
    setSaved(!!getApiKey());
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
        <p className="text-sm leading-relaxed text-muted md:text-base">
          Vitals works without a key for standard tabular lab layouts. A key unlocks two optional
          features: extraction for layouts the built-in parser cannot read, and the
          questions-for-your-doctor generator.
        </p>
      </PageHeader>

      <Section>
        <div className="max-w-2xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            Anthropic API key
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <input
              type="password"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setStatus({ kind: "idle" });
              }}
              placeholder={saved ? "A key is saved — paste a new one to replace it" : "sk-ant-…"}
              className="min-w-0 flex-1 rounded-md border border-edge bg-surface px-4 py-2.5 font-mono text-sm text-paper placeholder:text-muted focus:border-accent focus:outline-none"
            />
            <button
              onClick={save}
              disabled={!value.trim() || status.kind === "verifying"}
              className="rounded-md border border-accent px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-accent transition-colors duration-200 hover:bg-accent hover:text-bg disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-accent"
            >
              {status.kind === "verifying" ? "Verifying…" : "Verify & save"}
            </button>
          </div>

          {status.kind === "error" ? (
            <p className="mt-4 font-mono text-[11px] text-accent">{status.message}</p>
          ) : null}
          {status.kind === "saved" ? (
            <p className="mt-4 font-mono text-[11px] text-accent">
              Key verified against the API and saved.
            </p>
          ) : null}

          {saved ? (
            <button
              onClick={() => {
                clearApiKey();
                setSaved(false);
                setStatus({ kind: "idle" });
              }}
              className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-muted transition-colors duration-200 hover:text-accent"
            >
              Remove saved key
            </button>
          ) : null}

          <div className="mt-16 border-t border-edge pt-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
              How the key is used
            </p>
            <ul className="mt-5 space-y-4 text-sm leading-relaxed text-muted">
              <li>
                Stored in this browser&apos;s localStorage. It is never sent anywhere except
                Anthropic&apos;s API, in the request that uses it.
              </li>
              <li>
                Calls go from your browser straight to <span className="font-mono">api.anthropic.com</span>{" "}
                using model <span className="font-mono">{MODEL}</span>. Vitals has no server, so
                there is nothing in between.
              </li>
              <li>
                Extraction sends the text of a report the parser could not read. Question
                generation sends only flagged marker names, values, and dates — never your whole
                record.
              </li>
              <li>
                Saving verifies the key with one minimal request so a bad key fails here rather
                than mid-upload.
              </li>
            </ul>
          </div>
        </div>
      </Section>
    </Shell>
  );
}
