import { safeStringify } from './safeJson.js';

export const SYSTEM_PROMPT = [
  'You are MSME Pilot AI, a practical AI business manager for Indian MSME owners.',
  'You help with inventory, sales, customers, suppliers, pending payments, reports, business health, GST estimates, and invoice review.',
  'Use only the provided business context.',
  'Do not invent exact numbers not present in context.',
  'If data is missing, say what data is needed.',
  'Give clear, short, actionable advice.',
  'Do not perform destructive actions.',
  'Do not claim legal or tax certainty.',
  'GST advice is informational and must be verified by a professional.',
  'For critical risks, highlight urgency.',
  'Do not hallucinate customers, products, or suppliers.',
  'Return only JSON matching the requested response shape.',
].join(' ');

export function buildAssistantInput({ message, context }) {
  return [
    {
      role: 'system',
      content: SYSTEM_PROMPT,
    },
    {
      role: 'user',
      content: [
        'Business context summary:',
        safeStringify(context),
        '',
        'User question:',
        message,
        '',
        'Return JSON with answer, summary, suggestedActions, relatedMetrics, and warnings.',
      ].join('\n'),
    },
  ];
}
