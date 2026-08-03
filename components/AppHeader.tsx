"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { WorkspaceModeToggle } from "@/components/WorkspaceModeToggle";
import { WorkspaceNav } from "@/components/WorkspaceNav";
import { PRODUCT_NAME } from "@/lib/product";

export function AppHeader() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    function update() {
      const nextY = window.scrollY;
      const delta = nextY - lastY;

      if (nextY < 24) {
        setHidden(false);
      } else if (delta > 8) {
        setHidden(true);
      } else if (delta < -8) {
        setHidden(false);
      }

      lastY = nextY;
      ticking = false;
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      onFocusCapture={() => setHidden(false)}
      className={`sticky top-0 z-30 bg-white/90 shadow-[0_10px_34px_rgba(25,33,43,0.07)] backdrop-blur-xl transition-transform duration-300 ease-out no-print md:translate-y-0 ${
        hidden ? "-translate-y-[calc(100%-0.45rem)]" : "translate-y-0"
      }`}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-2.5 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between md:px-10 md:py-4">
        <div className="flex w-full items-center justify-between gap-3 md:w-auto">
          <Link href="/" aria-label={`${PRODUCT_NAME} home`}>
            <Logo />
          </Link>
          <WorkspaceModeToggle />
        </div>
        <div className="scrollbar-none -mx-1 overflow-x-auto overscroll-x-contain px-1 pb-1 md:mx-0 md:overflow-visible md:p-0">
          <WorkspaceNav />
        </div>
      </div>
    </header>
  );
}
