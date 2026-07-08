import OpenAI from 'openai';
import { createAdminClient, verifyJwtUser } from './appwriteAdmin.js';
import { buildBusinessContext } from './businessContext.js';
import { createConversationId, saveConversationExchange } from './conversationHistory.js';
import { buildAssistantInput } from './promptBuilder.js';
import {
  assistantResponseJsonSchema,
  getResponseText,
  validateAssistantResponse,
} from './responseSchema.js';
import { getRequestJson } from './safeJson.js';
import {
  getAuthenticatedUserId,
  getAuthenticatedUserJwt,
  validateRequestBody,
} from './validateRequest.js';

function json(res, payload, status = 200) {
  return res.json(payload, status);
}

function safeErrorResponse(res, error) {
  const status = error?.statusCode || 500;
  const code = error?.code || 'AI_ASSISTANT_FAILED';
  const message = status >= 500
    ? 'AI assistant is temporarily unavailable. Please try again.'
    : error.message;

  return json(res, {
    success: false,
    error: {
      code,
      message,
    },
  }, status);
}

function requireOpenRouterKey() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error('OpenRouter API key is missing in the Appwrite Function environment.'), {
      statusCode: 500,
      code: 'OPENROUTER_KEY_MISSING',
    });
  }

  return apiKey;
}

function createOpenRouterClient() {
  return new OpenAI({
    apiKey: requireOpenRouterKey(),
    baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost',
      'X-OpenRouter-Title': process.env.OPENROUTER_APP_NAME || 'MSME Pilot',
    },
  });
}

async function createAiResponse(openrouter, input, model) {
  return openrouter.chat.completions.create({
    model,
    messages: input.map((message, index) =>
      index === 0
        ? {
            ...message,
            content: [
              message.content,
              'Return only JSON. No markdown, no explanation, no code fences.',
              `Required JSON schema: ${JSON.stringify(assistantResponseJsonSchema)}`,
            ].join('\n'),
          }
        : message,
    ),
    temperature: 0.2,
    max_tokens: 1200,
    response_format: { type: 'json_object' },
  });
}

function getCompletionText(response) {
  return response?.choices?.[0]?.message?.content || '';
}

async function askOpenRouter(message, context) {
  const model = process.env.OPENROUTER_MODEL || 'openrouter/free';
  const openrouter = createOpenRouterClient();
  const input = buildAssistantInput({ message, context });

  try {
    const response = await createAiResponse(openrouter, input, model);
    const text = getCompletionText(response) || getResponseText(response);
    return {
      payload: validateAssistantResponse(text),
      model: response?.model || model,
    };
  } catch (error) {
    const messageText = String(error?.message || '').toLowerCase();

    if (messageText.includes('model') || messageText.includes('not found') || messageText.includes('does not exist')) {
      throw Object.assign(
        new Error('Configured OpenRouter model is unavailable. Set OPENROUTER_MODEL to an enabled model.'),
        { statusCode: 502, code: 'OPENROUTER_MODEL_UNAVAILABLE' },
      );
    }

    if (error?.status === 401 || messageText.includes('api key')) {
      throw Object.assign(
        new Error('OpenRouter authentication failed. Check the function API key.'),
        { statusCode: 502, code: 'OPENROUTER_AUTH_FAILED' },
      );
    }

    if (error?.status === 429 || messageText.includes('rate limit')) {
      throw Object.assign(
        new Error('OpenRouter free model rate limit reached. Try again later.'),
        { statusCode: 429, code: 'OPENROUTER_RATE_LIMITED' },
      );
    }

    throw Object.assign(
      new Error('AI assistant is temporarily unavailable. Please try again.'),
      { statusCode: 502, code: 'OPENROUTER_ASSISTANT_UNAVAILABLE' },
    );
  }
}

export default async ({ req, res, log, error }) => {
  const startedAt = Date.now();

  try {
    const body = validateRequestBody(getRequestJson(req));
    const userId = getAuthenticatedUserId(req);
    const userJwt = getAuthenticatedUserJwt(req);
    const conversationId = body.conversationId || createConversationId();

    await verifyJwtUser(userId, userJwt);

    log?.(`AI assistant start user=${userId.slice(0, 6)}... conversation=${conversationId}`);

    const { databases } = createAdminClient();
    const context = body.includeContext
      ? await buildBusinessContext(databases, userId, conversationId)
      : { warnings: ['Business context was disabled for this request.'] };
    const { payload, model } = await askOpenRouter(body.message, context);
    const warnings = [...(payload.warnings || []), ...(context.warnings || [])];
    let savedHistory = false;
    let history = {};

    if (body.saveHistory) {
      try {
        history = await saveConversationExchange(
          databases,
          userId,
          conversationId,
          body.message,
          {
            answer: payload.answer,
            summary: payload.summary,
            suggestedActions: payload.suggestedActions,
            relatedMetrics: payload.relatedMetrics,
            warnings,
            model,
          },
        );
        savedHistory = true;
      } catch {
        warnings.push('AI answered, but history could not be saved.');
      }
    }

    log?.(
      `AI assistant complete user=${userId.slice(0, 6)}... conversation=${conversationId} savedHistory=${savedHistory} durationMs=${Date.now() - startedAt}`,
    );

    return json(res, {
      success: true,
      conversationId,
      answer: payload.answer,
      summary: payload.summary || '',
      suggestedActions: payload.suggestedActions || [],
      relatedMetrics: payload.relatedMetrics || [],
      warnings,
      model,
      savedHistory,
      userMessageId: history.userMessageId || '',
      assistantMessageId: history.assistantMessageId || '',
    });
  } catch (caught) {
    error?.(`AI assistant failed code=${caught?.code || 'UNKNOWN'} status=${caught?.statusCode || 500}`);
    return safeErrorResponse(res, caught);
  }
};
