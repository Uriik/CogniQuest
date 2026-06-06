/**
 * Password hashing with bcryptjs (pure JS implementation).
 *
 * Never store or log plaintext passwords. `hash` returns an encoded string that
 * already embeds the salt and parameters, so `verify` needs only hash + plain.
 */
import bcrypt from "bcryptjs";

export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export async function verifyPassword(
  hash: string,
  plain: string,
): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false; // malformed hash, etc. — fail closed
  }
}

/** True if the stored hash should be re-hashed (params changed). */
export function needsRehash(hash: string): boolean {
}
