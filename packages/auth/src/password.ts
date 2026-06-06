/**
 * Password hashing with Argon2id (OWASP-recommended).
 *
 * Never store or log plaintext passwords. `hash` returns an encoded string that
 * already embeds the salt and parameters, so `verify` needs only hash + plain.
 */
import argon2 from "argon2";

/** Argon2id params — tune for ~50-100ms on target hardware. */
const OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19_456, // ~19 MiB
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, OPTIONS);
}

export async function verifyPassword(
  hash: string,
  plain: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false; // malformed hash, etc. — fail closed
  }
}

/** True if the stored hash should be re-hashed (params changed). */
export function needsRehash(hash: string): boolean {
  return argon2.needsRehash(hash, OPTIONS);
}
