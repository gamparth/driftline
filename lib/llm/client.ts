import Anthropic from "@anthropic-ai/sdk";
import {
  LABLINE_STORAGE_PREFIX,
  MARKLINE_STORAGE_PREFIX,
  PRODUCT_STORAGE_PREFIX,
} from "@/lib/product";

/**
 * Bring-your-own-key Anthropic client. The key lives in localStorage and the
 * call goes browser → api.anthropic.com directly: no server of ours ever sees
 * a report or a key. That is the whole privacy story, so there is deliberately
 * no proxy option.
 */

export const MODEL = "claude-opus-5";
const KEY_STORAGE = `${PRODUCT_STORAGE_PREFIX}.anthropic-key`;
const MARKLINE_KEY_STORAGE = `${MARKLINE_STORAGE_PREFIX}.anthropic-key`;
const LABLINE_KEY_STORAGE = `${LABLINE_STORAGE_PREFIX}.anthropic-key`;
const LEGACY_KEY_STORAGE = "vitals.anthropic-key";

export function getApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return (
    window.localStorage.getItem(KEY_STORAGE) ??
    window.localStorage.getItem(MARKLINE_KEY_STORAGE) ??
    window.localStorage.getItem(LABLINE_KEY_STORAGE) ??
    window.localStorage.getItem(LEGACY_KEY_STORAGE)
  );
}

export function setApiKey(key: string): void {
  window.localStorage.setItem(KEY_STORAGE, key.trim());
  window.localStorage.removeItem(MARKLINE_KEY_STORAGE);
  window.localStorage.removeItem(LABLINE_KEY_STORAGE);
  window.localStorage.removeItem(LEGACY_KEY_STORAGE);
}

export function clearApiKey(): void {
  window.localStorage.removeItem(KEY_STORAGE);
  window.localStorage.removeItem(MARKLINE_KEY_STORAGE);
  window.localStorage.removeItem(LABLINE_KEY_STORAGE);
  window.localStorage.removeItem(LEGACY_KEY_STORAGE);
}

export function hasApiKey(): boolean {
  return !!getApiKey();
}

export function createClient(apiKey: string): Anthropic {
  return new Anthropic({
    apiKey,
    // Calls run in the browser by design — see the note above.
    dangerouslyAllowBrowser: true,
  });
}

/** Cheapest possible round-trip, used to validate a key before we store it. */
export async function verifyApiKey(
  apiKey: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await createClient(apiKey).messages.create({
      model: MODEL,
      max_tokens: 16,
      messages: [{ role: "user", content: "Reply with OK." }],
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: "That key was rejected by the API." };
    }
    if (error instanceof Anthropic.PermissionDeniedError) {
      return { ok: false, error: "That key lacks permission for the Messages API." };
    }
    if (error instanceof Anthropic.RateLimitError) {
      return { ok: false, error: "Rate limited — the key looks valid, try again shortly." };
    }
    if (error instanceof Anthropic.APIConnectionError) {
      return { ok: false, error: "Could not reach the API. Check your connection." };
    }
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error." };
  }
}
