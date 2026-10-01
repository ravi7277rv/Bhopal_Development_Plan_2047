/**
 * Thrown when the backend rejects login because the user
 * is already logged in on another device.
 * LoginPage catches this specific type to open the Force Logout dialog.
 */
export class SessionConflictError extends Error {
  readonly code = 'user_logged_in_another_device';
  readonly username: string;

  constructor(username: string, message?: string) {
    super(message || 'You are already logged in on another device.');
    this.name = 'SessionConflictError';
    this.username = username;
    Object.setPrototypeOf(this, SessionConflictError.prototype);
  }
}

export const isSessionConflict = (err: unknown): err is SessionConflictError =>
  err instanceof SessionConflictError;