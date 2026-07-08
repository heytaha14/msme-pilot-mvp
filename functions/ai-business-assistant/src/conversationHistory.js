import {
  COLLECTION_IDS,
  DATABASE_ID,
  ID,
  Permission,
  Role,
} from './appwriteAdmin.js';
import { safeStringify } from './safeJson.js';

export function createConversationId() {
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function createHistoryDocument(databases, userId, conversationId, role, message) {
  const now = new Date().toISOString();
  return databases.createDocument(
    DATABASE_ID,
    COLLECTION_IDS.AI_HISTORY,
    ID.unique(),
    {
      userId,
      conversationId,
      role,
      message,
      contextType: 'business_chat',
      saved: false,
      createdAt: now,
      updatedAt: now,
    },
    [
      Permission.read(Role.user(userId)),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId)),
    ],
  );
}

export async function saveConversationExchange(databases, userId, conversationId, userMessage, assistantPayload) {
  const userDoc = await createHistoryDocument(databases, userId, conversationId, 'user', userMessage);
  const assistantDoc = await createHistoryDocument(
    databases,
    userId,
    conversationId,
    'assistant',
    safeStringify(assistantPayload),
  );

  return {
    userMessageId: userDoc.$id,
    assistantMessageId: assistantDoc.$id,
  };
}
