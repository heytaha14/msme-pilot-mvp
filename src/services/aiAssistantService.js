import { DATABASE_ID, COLLECTION_IDS } from '../config/appwriteSchema.js';
import { databases, ExecutionMethod, functions, Query } from '../lib/appwrite.js';
import { getAiAssistantErrorMessage } from '../utils/aiErrors.js';
import { assertOwnsDocument } from '../utils/ownership.js';

export function getAiAssistantFunctionId() {
  return import.meta.env.VITE_APPWRITE_AI_ASSISTANT_FUNCTION_ID || '';
}

export function parseAiAssistantExecutionResponse(execution) {
  if (!execution) {
    throw new Error('AI Assistant function did not return an execution result.');
  }

  let payload = null;
  try {
    payload = execution.responseBody ? JSON.parse(execution.responseBody) : null;
  } catch {
    throw new Error('AI Assistant function returned an unreadable response.');
  }

  if (execution.status === 'failed' || execution.responseStatusCode >= 400 || payload?.success === false) {
    const error = payload?.error || {};
    const details = execution.errors || execution.logs || '';
    throw new Error(error.message || details || 'AI Assistant function execution failed before reaching OpenRouter.');
  }

  const data = payload?.data || payload?.result || payload?.assistant || payload?.response || payload;
  const answer = typeof data === 'string'
    ? data
    : data?.answer || data?.message || data?.content || data?.reply || '';

  if (!String(answer || '').trim()) {
    throw new Error(
      'AI Assistant function returned success but no answer. Open the latest Appwrite execution response body/logs and redeploy the current function code.',
    );
  }

  return {
    ...payload,
    ...data,
    answer: String(answer).trim(),
    suggestedActions: data?.suggestedActions || payload?.suggestedActions || [],
    relatedMetrics: data?.relatedMetrics || payload?.relatedMetrics || [],
    warnings: data?.warnings || payload?.warnings || [],
    conversationId: data?.conversationId || payload?.conversationId || '',
    assistantMessageId: data?.assistantMessageId || payload?.assistantMessageId || '',
  };
}

export async function sendBusinessAiMessage(message, options = {}) {
  const functionId = getAiAssistantFunctionId();
  const trimmedMessage = String(message || '').trim();

  if (!functionId) {
    throw new Error('AI Assistant function is not configured. Add VITE_APPWRITE_AI_ASSISTANT_FUNCTION_ID.');
  }

  if (!trimmedMessage) {
    throw new Error('Enter a question for MSME Pilot AI.');
  }

  if (trimmedMessage.length > 2000) {
    throw new Error('Message is too long. Keep AI questions under 2000 characters.');
  }

  try {
    const execution = await functions.createExecution({
      functionId,
      body: JSON.stringify({
        message: trimmedMessage,
        conversationId: options.conversationId || '',
        mode: 'business_chat',
        includeContext: options.includeContext !== false,
        saveHistory: options.saveHistory !== false,
      }),
      async: false,
      xpath: '/',
      method: ExecutionMethod.POST,
      headers: {
        'content-type': 'application/json',
      },
    });

    return parseAiAssistantExecutionResponse(execution);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('AI Assistant function execution failed:', error);
    }
    throw new Error(getAiAssistantErrorMessage(error));
  }
}

function parseHistoryMessage(document) {
  if (document.role !== 'assistant') return document.message;

  try {
    const parsed = JSON.parse(document.message);
    return parsed.answer || document.message;
  } catch {
    return document.message;
  }
}

export async function listAiConversationHistory(userId, conversationId) {
  if (!userId || !conversationId) return [];

  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTION_IDS.AI_HISTORY,
    [
      Query.equal('userId', userId),
      Query.equal('conversationId', conversationId),
      Query.orderAsc('createdAt'),
      Query.limit(50),
    ],
  );

  return response.documents.map((document) => ({
    id: document.$id,
    role: document.role,
    content: parseHistoryMessage(document),
    saved: Boolean(document.saved),
    conversationId: document.conversationId,
    createdAt: document.createdAt || document.$createdAt,
  }));
}

export async function listAiConversations(userId) {
  if (!userId) return [];

  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTION_IDS.AI_HISTORY,
    [
      Query.equal('userId', userId),
      Query.orderDesc('createdAt'),
      Query.limit(100),
    ],
  );

  const grouped = new Map();
  for (const document of response.documents) {
    if (!grouped.has(document.conversationId)) {
      grouped.set(document.conversationId, {
        conversationId: document.conversationId,
        title: parseHistoryMessage(document).slice(0, 80) || 'Business chat',
        role: document.role,
        createdAt: document.createdAt || document.$createdAt,
      });
    }
  }

  return Array.from(grouped.values()).slice(0, 8);
}

export async function saveAiInsight(userId, messageId) {
  if (!userId || !messageId) {
    throw new Error('Insight will be saved after history sync.');
  }

  const document = await databases.getDocument(DATABASE_ID, COLLECTION_IDS.AI_HISTORY, messageId);
  assertOwnsDocument(document, userId, 'AI insight');

  return databases.updateDocument(
    DATABASE_ID,
    COLLECTION_IDS.AI_HISTORY,
    messageId,
    {
      saved: true,
      updatedAt: new Date().toISOString(),
    },
  );
}

export async function deleteAiConversation(userId, conversationId) {
  const history = await listAiConversationHistory(userId, conversationId);
  await Promise.all(
    history.map((message) =>
      databases.deleteDocument(DATABASE_ID, COLLECTION_IDS.AI_HISTORY, message.id),
    ),
  );

  return { success: true };
}
