export function assertOwnsDocument(document, userId, resourceName = 'Document') {
  if (!document || document.userId !== userId) {
    throw new Error(`Permission error. ${resourceName} does not belong to the current user.`);
  }

  return document;
}

export function filterOwnedDocuments(documents = [], userId) {
  return documents.filter((document) => document?.userId === userId);
}

export function assertAuthenticatedUser(user) {
  if (!user?.$id) {
    throw new Error('Please login again before continuing.');
  }

  return user.$id;
}
