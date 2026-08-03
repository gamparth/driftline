import { PRODUCT_NAME } from "@/lib/product";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      {!compact ? (
        <span className="font-display text-lg font-semibold text-ink sm:text-xl">
          {PRODUCT_NAME}
        </span>
      ) : null}
    </span>
  );
}

export function LogoMark() {
  return (
    <span className="brand-gradient grid h-8 w-8 place-items-center rounded-lg text-white shadow-[var(--shadow-card)] sm:h-9 sm:w-9">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 14.5h3.5l2-7 4 11 2.5-7h4" />
        <path d="M4 5.5h16" opacity="0.34" />
      </svg>
    </span>
  );
}
