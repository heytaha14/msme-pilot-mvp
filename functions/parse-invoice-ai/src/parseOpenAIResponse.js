import { safeJsonParse } from './safeJson.js';
import { validateAiInvoiceOutput } from './invoiceSchema.js';

export function getResponseText(response) {
  if (response?.output_text) {
    return response.output_text;
  }

  const chunks = [];
  for (const output of response?.output || []) {
    for (const content of output?.content || []) {
      if (content?.type === 'output_text' && content?.text) {
        chunks.push(content.text);
      }
    }
  }

  return chunks.join('\n').trim();
}

export function parseOpenAIResponse(response) {
  const text = getResponseText(response);
  const parsed = safeJsonParse(text, null);

  if (!parsed) {
    throw Object.assign(new Error('AI response was not valid JSON.'), {
      statusCode: 502,
      code: 'AI_INVALID_JSON',
    });
  }

  try {
    return validateAiInvoiceOutput(parsed);
  } catch (error) {
    throw Object.assign(new Error('AI response could not be validated.'), {
      statusCode: 502,
      code: 'AI_VALIDATION_FAILED',
      validationIssues: error?.issues || [],
    });
  }
}
