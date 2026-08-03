"use client";

import { useCallback, useSyncExternalStore } from "react";
import { PRODUCT_STORAGE_PREFIX } from "@/lib/product";

export type WorkspaceMode = "real" | "demo";

const STORAGE_KEY = `${PRODUCT_STORAGE_PREFIX}.workspace-mode`;
const EVENT_NAME = "labloom:workspace-mode";

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
  const mode = useSyncExternalStore(subscribeWorkspaceMode, readWorkspaceMode, defaultWorkspaceMode);

  const setMode = useCallback((next: WorkspaceMode) => {
    writeWorkspaceMode(next);
  }, []);

  return [mode, setMode];
}

function defaultWorkspaceMode(): WorkspaceMode {
  return "real";
}

function subscribeWorkspaceMode(onStoreChange: () => void): () => void {
  function handleStorage(event: StorageEvent) {
    if (event.key === STORAGE_KEY) onStoreChange();
  }

  window.addEventListener(EVENT_NAME, onStoreChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(EVENT_NAME, onStoreChange);
    window.removeEventListener("storage", handleStorage);
  };
}
