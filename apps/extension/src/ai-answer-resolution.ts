import { z } from 'zod';

const AiCitationSchema = z
  .object({
    entityId: z.string().trim().min(1),
    kind: z.string().trim().min(1),
    site: z.string().trim().min(1),
    title: z.string().trim().min(1),
    url: z.string().trim().min(1).optional(),
  })
  .strict();

export const AiStructuredAnswerSchema = z
  .object({
    summary: z.string().trim().min(1),
    bullets: z.array(z.string().trim().min(1)),
    nextActions: z.array(z.string().trim().min(1)).default([]),
    trustGaps: z.array(z.string().trim().min(1)).default([]),
    citations: z.array(AiCitationSchema),
  })
  .strict();

const AiCitationCoverageSchema = z.enum(['structured_citations', 'uncited_fallback', 'no_answer']);

export type AiStructuredAnswer = z.infer<typeof AiStructuredAnswerSchema>;
export type ResolvedAiAnswer = {
  answerText?: string;
  structuredAnswer?: AiStructuredAnswer;
  citationCoverage: z.infer<typeof AiCitationCoverageSchema>;
};

function extractCodeFenceBody(raw: string) {
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return match?.[1]?.trim();
}

function extractFirstJsonObject(raw: string) {
  const start = raw.indexOf('{');
  if (start < 0) {
    return undefined;
  }

  let depth = 0;
  for (let index = start; index < raw.length; index += 1) {
    const char = raw[index];
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) {
      return raw.slice(start, index + 1);
    }
  }

  return undefined;
}

function parseStructuredAnswerCandidate(raw?: string) {
  if (!raw) {
    return undefined;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}

export function parseAiStructuredAnswer(raw: string): AiStructuredAnswer | undefined {
  const directValue = parseStructuredAnswerCandidate(raw);
  const fencedBody = extractCodeFenceBody(raw);
  const fencedValue = parseStructuredAnswerCandidate(fencedBody);
  const extractedValue =
    parseStructuredAnswerCandidate(extractFirstJsonObject(raw)) ??
    parseStructuredAnswerCandidate(extractFirstJsonObject(fencedBody ?? ''));

  for (const value of [directValue, fencedValue, extractedValue]) {
    const result = AiStructuredAnswerSchema.safeParse(value);
    if (result.success) {
      return result.data;
    }
  }

  return undefined;
}

export function resolveAiAnswer(input: {
  answerText?: string;
  structuredAnswer?: unknown;
  citationCoverage?: unknown;
}): ResolvedAiAnswer {
  const answerText = typeof input.answerText === 'string' && input.answerText.trim() ? input.answerText : undefined;
  const explicitStructured = AiStructuredAnswerSchema.safeParse(input.structuredAnswer);
  const structuredAnswer = explicitStructured.success
    ? explicitStructured.data
    : answerText
      ? parseAiStructuredAnswer(answerText)
      : undefined;
  const explicitCoverage = AiCitationCoverageSchema.safeParse(input.citationCoverage);

  return {
    answerText,
    structuredAnswer,
    citationCoverage: explicitCoverage.success
      ? explicitCoverage.data
      : structuredAnswer
        ? 'structured_citations'
        : answerText
          ? 'uncited_fallback'
          : 'no_answer',
  };
}
