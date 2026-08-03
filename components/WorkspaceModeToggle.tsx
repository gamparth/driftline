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
      className="flex shrink-0 items-center gap-5 border-b border-line bg-transparent md:gap-0 md:rounded-full md:border-b-0 md:bg-white md:p-1 md:shadow-[var(--shadow-card)] md:ring-1 md:ring-black/[0.05]"
      aria-label="Workspace mode"
    >
      {MODES.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => setMode(item.value)}
          aria-pressed={mode === item.value}
          className={`relative px-0 py-2 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors duration-200 after:absolute after:inset-x-0 after:-bottom-px after:h-px after:rounded-full after:content-[''] md:rounded-full md:px-3 md:py-1.5 md:after:hidden ${
            mode === item.value
              ? "text-ink after:bg-ink md:bg-[linear-gradient(135deg,#00a995,#4c57d8_54%,#ff7a59)] md:text-white md:shadow-sm"
              : "text-muted after:bg-transparent hover:text-ink md:hover:bg-brand-soft"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
