import { z } from "zod";
import type { DriftFlag } from "@/lib/engine/types";
import { MODEL, createClient } from "./client";

/**
 * "Questions for your doctor" generator. Only flagged drifts are sent — never
 * the full record — and the model is asked for questions, never for an
 * interpretation. vitals does not diagnose; this produces the list you take
 * into the appointment.
 */

const QuestionSchema = z.object({
  question: z.string().min(1),
  markerIds: z.array(z.string().min(1)).min(1),
});

const QuestionsSchema = z.object({
  questions: z.array(QuestionSchema).min(1),
});

export type DoctorQuestion = z.infer<typeof QuestionSchema>;

export type QuestionsResult =
  | { status: "ok"; questions: DoctorQuestion[] }
  | { status: "failed"; reason: string };

export const QUESTIONS_JSON_SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string", description: "A question to ask the doctor" },
          markerIds: {
            type: "array",
            items: { type: "string" },
            description: "IDs of the flagged markers this question is about",
          },
        },
        required: ["question", "markerIds"],
        additionalProperties: false,
      },
    },
  },
  required: ["questions"],
  additionalProperties: false,
} as const;

export const QUESTIONS_SYSTEM = `You help someone prepare for a doctor's appointment.

You are given lab markers that a rule-based checker flagged — either outside the printed reference range, or moved more than 20% since the previous sample.

Write questions the person can ask their doctor about those flags. Do not diagnose, do not name possible conditions, do not suggest treatment, supplements, or lifestyle changes, and do not reassure. Each question must be about a marker in the list, specific enough that a doctor can answer it directly, and phrased in plain language. Prefer one question per flag; combine two flags only when they clearly belong in the same question.`;

export function buildQuestionsPrompt(flags: DriftFlag[]): string | null {
  if (flags.length === 0) return null;
  const lines = flags.map(
    (f) =>
      `- ${f.markerLabel} (id: ${f.markerId}) — ${f.value} ${f.unit} on ${f.sampledAt}: ${f.detail}`,
  );
  return `These markers were flagged. Write questions to ask a doctor about them. This is not a request for diagnosis or medical advice.\n\n${lines.join("\n")}`;
}

function stripFence(text: string): string {
  const fenced = text.trim().match(/^```(?:json)?\s*\n([\s\S]*?)\n?```$/);
  return (fenced ? fenced[1] : text).trim();
}

export function parseQuestions(raw: string): QuestionsResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFence(raw));
  } catch {
    return { status: "failed", reason: "Model response was not valid JSON." };
  }
  const result = QuestionsSchema.safeParse(parsed);
  if (!result.success) {
    return { status: "failed", reason: "Model response did not match the expected shape." };
  }
  return { status: "ok", questions: result.data.questions };
}

export async function generateQuestions(
  flags: DriftFlag[],
  apiKey: string,
): Promise<QuestionsResult> {
  const prompt = buildQuestionsPrompt(flags);
  if (!prompt) return { status: "ok", questions: [] };

  try {
    const response = await createClient(apiKey).messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: QUESTIONS_SYSTEM,
      output_config: { format: { type: "json_schema", schema: QUESTIONS_JSON_SCHEMA } },
      messages: [{ role: "user", content: prompt }],
    });
    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");
    return parseQuestions(text);
  } catch (error) {
    return {
      status: "failed",
      reason: error instanceof Error ? error.message : "Request failed.",
    };
  }
}
