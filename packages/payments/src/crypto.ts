import crypto from "node:crypto";

/**
 * AES-256-CBC for vendor bank account numbers.
 * ENCRYPTION_KEY: 64 hex chars (32 bytes). ENCRYPTION_IV: 32 hex chars (16 bytes).
 */

/** Deterministic keys for PAYMENT_MODE=simulated only — never used in live. */
const SIM_KEY = Buffer.alloc(32, 0x51);
const SIM_IV = Buffer.alloc(16, 0x49);

function requireHexEnv(name: "ENCRYPTION_KEY" | "ENCRYPTION_IV", bytes: number): Buffer {
  const raw = process.env[name]?.trim();
  if (!raw) {
    if (process.env.PAYMENT_MODE?.trim() === "simulated") {
      return name === "ENCRYPTION_KEY" ? SIM_KEY : SIM_IV;
    }
    throw new Error(`${name} is not configured`);
  }
  const buf = Buffer.from(raw, "hex");
  if (buf.length !== bytes) {
    throw new Error(`${name} must be ${bytes * 2} hex characters (${bytes} bytes)`);
  }
  return buf;
}

export function encryptAccountNumber(accountNumber: string): Buffer {
  const key = requireHexEnv("ENCRYPTION_KEY", 32);
  const iv = requireHexEnv("ENCRYPTION_IV", 16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  return Buffer.concat([cipher.update(accountNumber, "utf8"), cipher.final()]);
}

export function decryptAccountNumber(encrypted: Buffer): string {
  const key = requireHexEnv("ENCRYPTION_KEY", 32);
  const iv = requireHexEnv("ENCRYPTION_IV", 16);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  );
}

export function lastFourDigits(accountNumber: string): string {
  const digits = accountNumber.replace(/\D/g, "");
  return digits.slice(-4).padStart(4, "0");
}
