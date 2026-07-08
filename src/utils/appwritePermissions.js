import { Permission, Role } from '../lib/appwrite.js';

export function userDocumentPermissions(userId) {
  if (!userId) {
    throw new Error('Cannot create secure document permissions without a user ID.');
  }

  return [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];
}

export function userFilePermissions(userId) {
  if (!userId) {
    throw new Error('Cannot create secure file permissions without a user ID.');
  }

  return [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];
}

export function hasPublicPermission(permissions = []) {
  return permissions.some((permission) => {
    const value = String(permission).toLowerCase();
    return value.includes('any') || value.includes('guest') || value.includes('anonymous');
  });
}
