"use client";

import { useWorkspaceMode, type WorkspaceMode } from "@/lib/hooks/useWorkspaceMode";

const MODES: Array<{ value: WorkspaceMode; label: string }> = [
  { value: "real", label: "Real" },
  { value: "demo", label: "Demo" },
];

export function WorkspaceModeToggle() {
  const [mode, setMode] = useWorkspaceMode();

  return (
    <div
      className="flex shrink-0 rounded-full bg-white p-1 shadow-[var(--shadow-card)] ring-1 ring-black/[0.05]"
      aria-label="Workspace mode"
    >
      {MODES.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => setMode(item.value)}
          aria-pressed={mode === item.value}
          className={`rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors duration-200 ${
            mode === item.value
              ? "brand-gradient text-white shadow-sm"
              : "text-muted hover:bg-brand-soft hover:text-ink"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
