import { describe, expect, it, vi } from "vitest";
import { extractWithLlm } from "@/lib/llm/extract";
import { buildQuestionsPrompt, parseQuestions } from "@/lib/llm/questions";
import type { DriftFlag } from "@/lib/engine/types";

const LINES = [
  "WESTFIELD LABORATORY",
  "Collected: 2023-08-14",
  "Glucose 94 mg/dL 70-99",
];

const GOOD = JSON.stringify({
  lab: "WESTFIELD LABORATORY",
  sampledAt: "2023-08-14",
  values: [
    {
      marker: "Glucose",
      value: 94,
      unit: "mg/dL",
      referenceRange: { low: 70, high: 99 },
      sampledAt: "2023-08-14",
      lab: "WESTFIELD LABORATORY",
    },
  ],
});

describe("extractWithLlm", () => {
  it("returns a validated report on a well-formed response", async () => {
    const invoke = vi.fn().mockResolvedValue(GOOD);
    const result = await extractWithLlm(LINES, invoke);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.report.lab).toBe("WESTFIELD LABORATORY");
    expect(result.report.values).toHaveLength(1);
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("retries exactly once when the first response fails validation", async () => {
    const invoke = vi
      .fn()
      .mockResolvedValueOnce(JSON.stringify({ lab: "X", values: [] }))
      .mockResolvedValueOnce(GOOD);
    const result = await extractWithLlm(LINES, invoke);
    expect(result.status).toBe("ok");
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it("routes to needs-review after the retry also fails", async () => {
    const invoke = vi.fn().mockResolvedValue("not json at all");
    const result = await extractWithLlm(LINES, invoke);
    expect(result.status).toBe("needs-review");
    if (result.status !== "needs-review") throw new Error("expected needs-review");
    expect(result.reason).toMatch(/valid JSON/i);
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it("routes to needs-review — never throws — when the call itself errors", async () => {
    const invoke = vi.fn().mockRejectedValue(new Error("rate limited"));
    const result = await extractWithLlm(LINES, invoke);
    expect(result.status).toBe("needs-review");
    if (result.status !== "needs-review") throw new Error("expected needs-review");
    expect(result.reason).toContain("rate limited");
  });

  it("rejects a report whose rows fail the schema rather than passing them through", async () => {
    const invoke = vi.fn().mockResolvedValue(
      JSON.stringify({
        lab: "WESTFIELD LABORATORY",
        sampledAt: "2023-08-14",
        values: [
          {
            marker: "Glucose",
            value: "ninety-four",
            unit: "mg/dL",
            referenceRange: null,
            sampledAt: "2023-08-14",
            lab: "WESTFIELD LABORATORY",
          },
        ],
      }),
    );
    const result = await extractWithLlm(LINES, invoke);
    expect(result.status).toBe("needs-review");
  });

  it("strips markdown fences some responses wrap JSON in", async () => {
    const invoke = vi.fn().mockResolvedValue("```json\n" + GOOD + "\n```");
    const result = await extractWithLlm(LINES, invoke);
    expect(result.status).toBe("ok");
  });
});

const FLAGS: DriftFlag[] = [
  {
    markerId: "creatinine",
    markerLabel: "Creatinine",
    kind: "delta",
    sampledAt: "2025-04-07",
    value: 1.42,
    unit: "mg/dL",
    detail: "up 34% vs 2024-01-19 (1.06 mg/dL)",
    deltaPct: 34,
  },
  {
    markerId: "vitamin-d",
    markerLabel: "Vitamin D (25-OH)",
    kind: "out-of-range",
    sampledAt: "2024-01-19",
    value: 22,
    unit: "ng/mL",
    detail: "below range (low 30)",
  },
];

describe("questions for your doctor", () => {
  it("sends only flagged markers to the model", () => {
    const prompt = buildQuestionsPrompt(FLAGS);
    expect(prompt).toContain("Creatinine");
    expect(prompt).toContain("Vitamin D (25-OH)");
    expect(prompt).not.toContain("Glucose");
    expect(prompt).toMatch(/not.*diagnos/i);
  });

  it("parses a question list", () => {
    const parsed = parseQuestions(
      JSON.stringify({
        questions: [
          { question: "What could explain the rise in my creatinine?", markerIds: ["creatinine"] },
          { question: "Should I supplement vitamin D?", markerIds: ["vitamin-d"] },
        ],
      }),
    );
    expect(parsed.status).toBe("ok");
    if (parsed.status !== "ok") throw new Error("expected ok");
    expect(parsed.questions).toHaveLength(2);
    expect(parsed.questions[0].markerIds).toEqual(["creatinine"]);
  });

  it("reports a parse failure instead of inventing questions", () => {
    expect(parseQuestions("sorry, I can't help with that").status).toBe("failed");
    expect(parseQuestions(JSON.stringify({ questions: [{}] })).status).toBe("failed");
  });

  it("produces no prompt when nothing is flagged", () => {
    expect(buildQuestionsPrompt([])).toBeNull();
  });
});
