import { z } from 'zod';
import { safeJsonParse } from './safeJson.js';

export const assistantResponseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    answer: { type: 'string' },
    summary: { type: 'string' },
    suggestedActions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          reason: { type: 'string' },
          priority: { type: 'string', enum: ['High', 'Medium', 'Low'] },
          routeTarget: {
            type: 'string',
            enum: [
              '/inventory',
              '/customers',
              '/suppliers',
              '/sales',
              '/reports',
              '/business-health',
              '/invoices',
              '/dashboard',
            ],
          },
        },
        required: ['title', 'reason', 'priority', 'routeTarget'],
      },
    },
    relatedMetrics: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          label: { type: 'string' },
          value: { type: 'string' },
        },
        required: ['label', 'value'],
      },
    },
    warnings: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['answer', 'summary', 'suggestedActions', 'relatedMetrics', 'warnings'],
};

const responseSchema = z.object({
  answer: z.string().min(1),
  summary: z.string().optional().default(''),
  suggestedActions: z.array(z.object({
    title: z.string(),
    reason: z.string(),
    priority: z.enum(['High', 'Medium', 'Low']).catch('Medium'),
    routeTarget: z.string().default('/dashboard'),
  })).optional().default([]),
  relatedMetrics: z.array(z.object({
    label: z.string(),
    value: z.string(),
  })).optional().default([]),
  warnings: z.array(z.string()).optional().default([]),
});

export function getResponseText(response) {
  if (response?.output_text) return response.output_text;

  const chunks = [];
  for (const output of response?.output || []) {
    for (const content of output?.content || []) {
      if (content?.type === 'output_text' && content?.text) chunks.push(content.text);
    }
  }

  return chunks.join('\n').trim();
}

export function validateAssistantResponse(rawText) {
  const parsed = safeJsonParse(rawText, null);

  if (!parsed) {
    return {
      answer: rawText || 'AI assistant returned an empty response.',
      summary: '',
      suggestedActions: [],
      relatedMetrics: [],
      warnings: [],
    };
  }

  try {
    return responseSchema.parse(parsed);
  } catch {
    return {
      answer: parsed.answer || rawText || 'AI assistant returned a response that could not be fully parsed.',
      summary: parsed.summary || '',
      suggestedActions: Array.isArray(parsed.suggestedActions) ? parsed.suggestedActions.slice(0, 5) : [],
      relatedMetrics: Array.isArray(parsed.relatedMetrics) ? parsed.relatedMetrics.slice(0, 6) : [],
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings.slice(0, 5) : [],
    };
  }
}
