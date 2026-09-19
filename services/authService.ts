/**
 * Authentication Service - Frontend wrapper for auth IPC calls
 */

export const authService = {
  hasPassword: () => window.electron!.auth.hasPassword(),
  setPassword: (password: string) => window.electron!.auth.setPassword(password),
  verifyPassword: (password: string) => window.electron!.auth.verifyPassword(password),
  getData: () => window.electron!.auth.getData(),
  // NOTE: adminDecrypt supprimé — le mot de passe n'est plus déchiffrable (hash one-way)
  adminResetPassword: (adminKey: string, newPassword: string) => window.electron!.auth.adminResetPassword(adminKey, newPassword),
  changePassword: (oldPassword: string, newPassword: string) => window.electron!.auth.changePassword(oldPassword, newPassword),
};
