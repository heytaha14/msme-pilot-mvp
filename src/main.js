import aiBusinessAssistant from '../functions/ai-business-assistant/src/main.js';
import parseInvoiceAi from '../functions/parse-invoice-ai/src/main.js';

function readRequestBody(req = {}) {
  if (typeof req.bodyText === 'string') return req.bodyText;
  if (typeof req.body === 'string') return req.body;
  if (req.body && typeof req.body === 'object') {
    try {
      return JSON.stringify(req.body);
    } catch {
      return '';
    }
  }
  return '';
}

function detectFunctionTarget(context = {}) {
  const envText = [
    process.env.APPWRITE_FUNCTION_ID,
    process.env.APPWRITE_FUNCTION_NAME,
    process.env._APP_FUNCTION_ID,
    process.env._APP_FUNCTION_NAME,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (envText.includes('parse_invoice') || envText.includes('invoice')) {
    return 'parse_invoice_ai';
  }

  if (envText.includes('ai_business') || envText.includes('assistant')) {
    return 'ai_business_assistant';
  }

  const body = readRequestBody(context.req).toLowerCase();
  if (body.includes('"invoiceid"')) return 'parse_invoice_ai';
  if (body.includes('"message"')) return 'ai_business_assistant';

  return '';
}

export default async function main(context) {
  const target = detectFunctionTarget(context);

  if (target === 'parse_invoice_ai') {
    return parseInvoiceAi(context);
  }

  if (target === 'ai_business_assistant') {
    return aiBusinessAssistant(context);
  }

  return context.res.json(
    {
      success: false,
      error: {
        code: 'FUNCTION_TARGET_UNKNOWN',
        message:
          'Could not detect Appwrite function target. Use invoiceId for parse_invoice_ai or message for ai_business_assistant.',
      },
    },
    400,
  );
}
