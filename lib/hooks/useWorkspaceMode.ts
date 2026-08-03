"use client";

import { useCallback, useEffect, useState } from "react";
import { PRODUCT_STORAGE_PREFIX } from "@/lib/product";

export type WorkspaceMode = "real" | "demo";

const STORAGE_KEY = `${PRODUCT_STORAGE_PREFIX}.workspace-mode`;
const EVENT_NAME = "driftline:workspace-mode";

export function readWorkspaceMode(): WorkspaceMode {
  if (typeof window === "undefined") return "real";
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "demo" ? "demo" : "real";
  } catch {
    return "real";
  }
}

export function writeWorkspaceMode(mode: WorkspaceMode): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Storage can be unavailable in private contexts; state still updates in this tab.
  }
  window.dispatchEvent(new CustomEvent<WorkspaceMode>(EVENT_NAME, { detail: mode }));
}

export function useWorkspaceMode(): [WorkspaceMode, (mode: WorkspaceMode) => void] {
  const [mode, setModeState] = useState<WorkspaceMode>("real");

  useEffect(() => {
    queueMicrotask(() => setModeState(readWorkspaceMode()));

    function handleCustom(event: Event) {
      setModeState((event as CustomEvent<WorkspaceMode>).detail);
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY) {
        setModeState(event.newValue === "demo" ? "demo" : "real");
      }
    }

    window.addEventListener(EVENT_NAME, handleCustom);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(EVENT_NAME, handleCustom);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const setMode = useCallback((next: WorkspaceMode) => {
    setModeState(next);
    writeWorkspaceMode(next);
  }, []);

  return [mode, setMode];
}
