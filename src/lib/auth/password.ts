import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * A precomputed bcrypt hash with no corresponding real password. Compare
 * against this when a login's email doesn't exist, so a nonexistent account
 * takes the same ~bcrypt-compare amount of time as a real one — otherwise
 * the response-time difference lets an attacker enumerate valid emails.
 */
export const DUMMY_PASSWORD_HASH =
  "$2b$12$CwTycUXWue0Thq9StjUM0uJ8i7bfsTdi5UWDbGpq5CpPljlnrY.Ka";
